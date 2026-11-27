/**
 * Remove demo @rnd.local accounts from OUR app DBs only:
 * - Neon Prisma User (+ related rows that block Restrict FKs)
 * - db_rd_management.rd_users (if any)
 * Does not touch Kelin Connect or any other project databases.
 */
import { createRequire } from "module";
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const kgsRoot = "C:/Kelin HRIS/hris3/acu/KGS-PURCHASE";

function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const k = m[1].trim();
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    process.env[k] = v;
  }
}

loadEnv(join(root, ".env"));
loadEnv(`${kgsRoot}/.env`);

const requireRoot = createRequire(join(root, "package.json"));
const requireKgs = createRequire(`${kgsRoot}/package.json`);
const { PrismaClient } = requireRoot("@prisma/client");
const mysql = requireKgs("mysql2/promise");

async function withRetry(fn, attempts = 5) {
  let last;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      console.log(`retry ${i + 1}/${attempts}: ${String(e.message).split("\n")[0]}`);
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
    }
  }
  throw last;
}

async function cleanNeon() {
  let url = process.env.DATABASE_URL;
  if (!url) {
    console.log("[Neon] skip — no DATABASE_URL");
    return;
  }
  url += (url.includes("?") ? "&" : "?") + "connection_limit=1&pool_timeout=60";
  const prisma = new PrismaClient({ datasources: { db: { url } } });

  try {
    const dummies = await withRetry(() =>
      prisma.user.findMany({
        where: { email: { endsWith: "@rnd.local" } },
        select: { id: true, name: true, email: true },
      }),
    );
    console.log(`[Neon] found ${dummies.length} dummy users`);
    if (!dummies.length) return;

    const ids = dummies.map((u) => u.id);
    const keeper = await withRetry(() =>
      prisma.user.findFirst({
        where: {
          isActive: true,
          role: "ADMIN",
          NOT: { email: { endsWith: "@rnd.local" } },
        },
        select: { id: true, email: true },
        orderBy: { createdAt: "asc" },
      }),
    );
    if (!keeper) {
      throw new Error("No real admin found to reassign createdBy / authorship.");
    }
    console.log(`[Neon] reassigning ownership to ${keeper.email}`);

    await withRetry(() =>
      prisma.$transaction(async (tx) => {
        // Tasks created by dummies → real admin (Restrict on createdBy)
        const created = await tx.task.updateMany({
          where: { createdById: { in: ids } },
          data: { createdById: keeper.id },
        });
        console.log(`  tasks.createdBy reassigned: ${created.count}`);

        // Unassign tasks claimed by dummies
        const unassigned = await tx.task.updateMany({
          where: { assigneeId: { in: ids } },
          data: { assigneeId: null, claimedAt: null },
        });
        console.log(`  tasks.assignee cleared: ${unassigned.count}`);

        // Comments authored by dummies → keeper
        const comments = await tx.comment.updateMany({
          where: { authorId: { in: ids } },
          data: { authorId: keeper.id },
        });
        console.log(`  comments.author reassigned: ${comments.count}`);

        // Attachments uploaded by dummies → keeper
        const attachments = await tx.attachment.updateMany({
          where: { uploadedById: { in: ids } },
          data: { uploadedById: keeper.id },
        });
        console.log(`  attachments.uploadedBy reassigned: ${attachments.count}`);

        // Activity where dummy is actor → delete (or reassign). Delete is cleaner for seed noise.
        const acts = await tx.activityLog.deleteMany({
          where: { actorId: { in: ids } },
        });
        console.log(`  activityLog (as actor) deleted: ${acts.count}`);

        // Notifications to dummies cascade on user delete; clear subjectUser refs
        await tx.activityLog.updateMany({
          where: { subjectUserId: { in: ids } },
          data: { subjectUserId: null },
        });

        const deleted = await tx.user.deleteMany({
          where: { id: { in: ids } },
        });
        console.log(`  users deleted: ${deleted.count}`);
        for (const u of dummies) console.log(`    - ${u.name} <${u.email}>`);
      }),
    );
  } finally {
    await prisma.$disconnect();
  }
}

async function cleanMysql() {
  if (!process.env.MYSQL_HOST || !process.env.MYSQL_USER) {
    console.log("[MySQL] skip — no MYSQL_* env");
    return;
  }
  const db = process.env.MYSQL_RD_DATABASE || "db_rd_management";
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    connectTimeout: 20000,
  });
  try {
    const [rows] = await conn.query(
      `SELECT id, name, email FROM \`${db}\`.rd_users WHERE email LIKE '%@rnd.local'`,
    );
    console.log(`[MySQL ${db}] found ${rows.length} dummy users`);
    if (!rows.length) return;

    const ids = rows.map((r) => r.id);
    const placeholders = ids.map(() => "?").join(",");

    // Prefer deleting related rows in our own rd_* tables only.
    await conn.execute(
      `DELETE FROM \`${db}\`.rd_sessions WHERE user_id IN (${placeholders})`,
      ids,
    );
    await conn.execute(
      `DELETE FROM \`${db}\`.rd_notifications WHERE recipient_id IN (${placeholders})`,
      ids,
    );
    await conn.execute(
      `UPDATE \`${db}\`.rd_tasks SET assignee_id = NULL WHERE assignee_id IN (${placeholders})`,
      ids,
    );
    await conn.execute(
      `UPDATE \`${db}\`.rd_activity_logs SET subject_user_id = NULL WHERE subject_user_id IN (${placeholders})`,
      ids,
    );
    await conn.execute(
      `DELETE FROM \`${db}\`.rd_activity_logs WHERE actor_id IN (${placeholders})`,
      ids,
    );
    // Comments / attachments may Restrict — reassign to first real admin if needed
    const [admins] = await conn.query(
      `SELECT id FROM \`${db}\`.rd_users
       WHERE role = 'ADMIN' AND email NOT LIKE '%@rnd.local'
       ORDER BY created_at ASC LIMIT 1`,
    );
    const keeperId = admins[0]?.id;
    if (keeperId) {
      await conn.execute(
        `UPDATE \`${db}\`.rd_tasks SET created_by_id = ? WHERE created_by_id IN (${placeholders})`,
        [keeperId, ...ids],
      );
      await conn.execute(
        `UPDATE \`${db}\`.rd_comments SET author_id = ? WHERE author_id IN (${placeholders})`,
        [keeperId, ...ids],
      );
      await conn.execute(
        `UPDATE \`${db}\`.rd_attachments SET uploaded_by_id = ? WHERE uploaded_by_id IN (${placeholders})`,
        [keeperId, ...ids],
      );
    }

    await conn.execute(
      `DELETE FROM \`${db}\`.rd_users WHERE id IN (${placeholders})`,
      ids,
    );
    for (const u of rows) console.log(`  deleted ${u.name} <${u.email}>`);
  } catch (e) {
    console.log(`[MySQL] ${e.message.split("\n")[0]}`);
  } finally {
    await conn.end();
  }
}

await cleanNeon();
await cleanMysql();
console.log("DONE");
