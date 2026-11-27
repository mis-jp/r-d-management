/**
 * Copy Kelin Connect password hashes into OUR app DBs only
 * (Neon Prisma User + db_rd_management.rd_users).
 *
 * Source db_kelinconnect.users is SELECT-only.
 * After this, users can sign in here with the same password as the Flutter app.
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

const conn = await mysql.createConnection({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  connectTimeout: 20000,
});

let hashes;
try {
  const [rows] = await conn.query(`
    SELECT email, password_hash
    FROM db_kelinconnect.users
    WHERE deleted_at IS NULL
      AND password_hash IS NOT NULL
      AND password_hash LIKE '$2%'
  `);
  hashes = new Map(
    rows.map((r) => [
      String(r.email).trim().toLowerCase(),
      String(r.password_hash),
    ]),
  );
  console.log(`Loaded ${hashes.size} Kelin Connect password hashes (read-only).`);
} finally {
  await conn.end();
}

async function syncNeon() {
  let url = process.env.DATABASE_URL;
  if (!url) {
    console.log("[Neon] skip");
    return;
  }
  url += (url.includes("?") ? "&" : "?") + "connection_limit=1&pool_timeout=60";
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    const users = await withRetry(() =>
      prisma.user.findMany({ select: { id: true, email: true } }),
    );
    let updated = 0;
    let missing = 0;
    for (const u of users) {
      const hash = hashes.get(u.email.toLowerCase());
      if (!hash) {
        missing += 1;
        console.log(`  miss  ${u.email}`);
        continue;
      }
      await withRetry(() =>
        prisma.user.update({
          where: { id: u.id },
          data: { passwordHash: hash, sessionVersion: { increment: 1 } },
        }),
      );
      updated += 1;
      console.log(`  sync  ${u.email}`);
    }
    console.log(`[Neon] updated=${updated} no_kc_account=${missing}`);
  } finally {
    await prisma.$disconnect();
  }
}

async function syncMysqlRd() {
  if (!process.env.MYSQL_HOST) {
    console.log("[MySQL rd] skip");
    return;
  }
  const db = process.env.MYSQL_RD_DATABASE || "db_rd_management";
  const c = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    connectTimeout: 20000,
  });
  try {
    const [users] = await c.query(
      `SELECT id, email FROM \`${db}\`.rd_users`,
    );
    let updated = 0;
    for (const u of users) {
      const hash = hashes.get(String(u.email).toLowerCase());
      if (!hash) continue;
      await c.execute(
        `UPDATE \`${db}\`.rd_users
         SET password_hash = ?, session_version = session_version + 1
         WHERE id = ?`,
        [hash, u.id],
      );
      updated += 1;
      console.log(`  sync  ${u.email}`);
    }
    console.log(`[MySQL ${db}] updated=${updated}`);
  } catch (e) {
    console.log(`[MySQL rd] ${e.message.split("\n")[0]}`);
  } finally {
    await c.end();
  }
}

await syncNeon();
await syncMysqlRd();
console.log("DONE — users can sign in with their Kelin Connect / Flutter password.");
