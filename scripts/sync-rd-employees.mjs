/**
 * Sync real R&D employees from Kelin Connect into:
 *  1) db_rd_management.rd_users  (MySQL — our API DB only)
 *  2) Neon Prisma User table     (this Next.js app)
 *
 * Source `db_kelinconnect.employees` is SELECT-only.
 * Never DROP / DELETE / ALTER any foreign database or table.
 */
import { createRequire } from "module";
import { randomUUID } from "crypto";
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
    if (!(k in process.env)) process.env[k] = v;
  }
}

loadEnv(join(root, ".env"));
loadEnv(`${kgsRoot}/.env`);

const require = createRequire(`${kgsRoot}/package.json`);
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

const RD_DEPARTMENT = "Research and Development";
const DEFAULT_PASSWORD =
  process.env.RD_EMPLOYEE_DEFAULT_PASSWORD || "Welcome@RD2026";
const AVATAR_COLORS = [
  "#0891b2",
  "#059669",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#4f46e5",
  "#0d9488",
  "#ca8a04",
];

function pickAvatarColor(seed) {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function hashPassword(plain) {
  return bcrypt.hashSync(String(plain), 10);
}

async function fetchSource(conn) {
  const [rows] = await conn.query(
    `SELECT loginid, lastname, email, department, jobtitle, employment_status
     FROM db_kelinconnect.employees
     WHERE department = ?
     ORDER BY lastname ASC`,
    [RD_DEPARTMENT],
  );
  return rows
    .map((r) => {
      const email = String(r.email || "")
        .trim()
        .toLowerCase();
      const name = String(r.lastname || "").trim();
      const status = r.employment_status
        ? String(r.employment_status).trim().toLowerCase()
        : "active";
      return {
        loginid: String(r.loginid || "").trim(),
        name,
        email,
        jobTitle: r.jobtitle ? String(r.jobtitle).trim() : null,
        department: String(r.department || RD_DEPARTMENT).trim(),
        isActive: status === "active" || status === "",
      };
    })
    .filter((e) => e.email && e.name && e.email.includes("@"));
}

async function syncMysql(conn, source) {
  const db = process.env.MYSQL_RD_DATABASE || "db_rd_management";
  console.log(`\n[MySQL] Upserting into ${db}.rd_users …`);

  const [admins] = await conn.query(
    `SELECT id FROM \`${db}\`.rd_users WHERE role = 'ADMIN' ORDER BY created_at ASC LIMIT 1`,
  );
  const actorId = admins[0]?.id || null;

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const emp of source) {
    const [existing] = await conn.query(
      `SELECT id, name, job_title, department, is_active FROM \`${db}\`.rd_users WHERE email = ? LIMIT 1`,
      [emp.email],
    );

    if (existing[0]) {
      const row = existing[0];
      const nextActive = emp.isActive ? 1 : 0;
      const changed =
        String(row.name) !== emp.name ||
        String(row.job_title || "") !== String(emp.jobTitle || "") ||
        String(row.department || "") !== emp.department ||
        Number(row.is_active) !== nextActive;
      if (!changed) {
        skipped += 1;
        console.log(`  skip   ${emp.email}`);
        continue;
      }
      await conn.execute(
        `UPDATE \`${db}\`.rd_users
         SET name = ?, job_title = ?, department = ?, is_active = ?
         WHERE id = ?`,
        [emp.name, emp.jobTitle, emp.department, nextActive, row.id],
      );
      updated += 1;
      console.log(`  update ${emp.email}`);
      continue;
    }

    const id = randomUUID();
    await conn.execute(
      `INSERT INTO \`${db}\`.rd_users
        (id, name, email, password_hash, role, is_active, job_title, department, avatar_color)
       VALUES (?, ?, ?, ?, 'EMPLOYEE', ?, ?, ?, ?)`,
      [
        id,
        emp.name,
        emp.email,
        hashPassword(DEFAULT_PASSWORD),
        emp.isActive ? 1 : 0,
        emp.jobTitle,
        emp.department,
        pickAvatarColor(emp.email),
      ],
    );
    if (actorId) {
      await conn.execute(
        `INSERT INTO \`${db}\`.rd_activity_logs
          (id, task_id, actor_id, subject_user_id, action, old_value, new_value)
         VALUES (?, NULL, ?, ?, 'USER_CREATED', NULL, ?)`,
        [
          randomUUID(),
          actorId,
          id,
          JSON.stringify({
            source: "kelinconnect.employees",
            loginid: emp.loginid,
            email: emp.email,
          }),
        ],
      );
    }
    created += 1;
    console.log(`  create ${emp.email}`);
  }

  const [demo] = await conn.query(
    `SELECT id, email FROM \`${db}\`.rd_users
     WHERE email LIKE '%@rnd.local' AND is_active = 1`,
  );
  let deactivatedDemo = 0;
  for (const row of demo) {
    await conn.execute(
      `UPDATE \`${db}\`.rd_users SET is_active = 0 WHERE id = ?`,
      [row.id],
    );
    deactivatedDemo += 1;
    console.log(`  deactivate demo ${row.email}`);
  }

  console.log(
    `[MySQL] created=${created} updated=${updated} skipped=${skipped} deactivatedDemo=${deactivatedDemo}`,
  );
}

async function syncNeon(source) {
  if (!process.env.DATABASE_URL) {
    console.log("\n[Neon] DATABASE_URL missing — skip app DB sync");
    return;
  }
  console.log("\n[Neon] Upserting into Prisma User …");
  const { PrismaClient } = createRequire(join(root, "package.json"))(
    "@prisma/client",
  );
  let url = process.env.DATABASE_URL;
  url += (url.includes("?") ? "&" : "?") + "connection_limit=1&pool_timeout=60";
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  let created = 0;
  let updated = 0;
  let skipped = 0;

  try {
    for (const emp of source) {
      const existing = await prisma.user.findUnique({
        where: { email: emp.email },
      });
      if (existing) {
        const same =
          existing.name === emp.name &&
          (existing.jobTitle || null) === emp.jobTitle &&
          (existing.department || null) === emp.department &&
          existing.isActive === emp.isActive &&
          existing.role === "EMPLOYEE";
        if (same) {
          skipped += 1;
          console.log(`  skip   ${emp.email}`);
          continue;
        }
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            name: emp.name,
            jobTitle: emp.jobTitle,
            department: emp.department,
            isActive: emp.isActive,
            role: "EMPLOYEE",
          },
        });
        updated += 1;
        console.log(`  update ${emp.email}`);
        continue;
      }

      await prisma.user.create({
        data: {
          name: emp.name,
          email: emp.email,
          passwordHash: hashPassword(DEFAULT_PASSWORD),
          role: "EMPLOYEE",
          isActive: emp.isActive,
          jobTitle: emp.jobTitle,
          department: emp.department,
          avatarColor: pickAvatarColor(emp.email),
        },
      });
      created += 1;
      console.log(`  create ${emp.email}`);
    }

    const demo = await prisma.user.updateMany({
      where: { email: { endsWith: "@rnd.local" }, isActive: true },
      data: { isActive: false },
    });
    console.log(
      `[Neon] created=${created} updated=${updated} skipped=${skipped} deactivatedDemo=${demo.count}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

const conn = await mysql.createConnection({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  connectTimeout: 20000,
  multipleStatements: false,
});

try {
  console.log("READ-ONLY source: db_kelinconnect.employees");
  const source = await fetchSource(conn);
  console.log(`Found ${source.length} R&D employees:`);
  for (const e of source) {
    console.log(`  - ${e.name} <${e.email}> (${e.jobTitle || "—"}) [${e.loginid}]`);
  }
  if (!source.length) {
    console.error("No employees found — aborting without writes.");
    process.exit(1);
  }

  await syncMysql(conn, source);
  await syncNeon(source);
  console.log("\nDONE. Source databases were not modified.");
  console.log(`Default password for NEW accounts only: ${DEFAULT_PASSWORD}`);
} finally {
  await conn.end();
}
