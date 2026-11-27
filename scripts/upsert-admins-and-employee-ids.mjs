/**
 * 1) Add Eunice Ysabelle Moral + Joyce Cambel as ADMIN
 * 2) Backfill employeeId for known Kelin Connect IDs
 * Writes to Neon (Prisma) and db_rd_management.rd_users only.
 * Source DBs are not modified.
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
    process.env[k] = v;
  }
}

loadEnv(join(root, ".env"));
loadEnv(`${kgsRoot}/.env`);

const requireRoot = createRequire(join(root, "package.json"));
const requireKgs = createRequire(`${kgsRoot}/package.json`);
const { PrismaClient } = requireRoot("@prisma/client");
const bcrypt = requireKgs("bcryptjs");
const mysql = requireKgs("mysql2/promise");

const DEFAULT_PASSWORD =
  process.env.RD_EMPLOYEE_DEFAULT_PASSWORD || "Welcome@RD2026";
const ADMIN_PASSWORD =
  process.env.RD_ADMIN_PASSWORD || DEFAULT_PASSWORD;

/** Known mappings from Kelin Connect loginid. */
const PEOPLE = [
  {
    name: "Eunice Ysabelle Moral",
    email: "moraleuniceysabelle@gmail.com",
    employeeId: "KG0551",
    jobTitle: "Admin Assistant",
    department: "Admin",
    role: "ADMIN",
  },
  {
    name: "Joyce Cambel",
    email: "joycecambel@gmail.com",
    employeeId: "KG0089",
    jobTitle: "Chief Operating Officer",
    department: "Operations",
    role: "ADMIN",
  },
  {
    name: "Adrian Pacis",
    email: "adrianmaliwat26@gmail.com",
    employeeId: "KG1005",
    jobTitle: "Research & Development Associate",
    department: "Research and Development",
    role: "EMPLOYEE",
  },
  {
    name: "Dexter Tolentino",
    email: "tolentinodexter@gmail.com",
    employeeId: "KG0245",
    jobTitle: "R&D",
    department: "Research and Development",
    role: "EMPLOYEE",
  },
  {
    name: "Justine Polo",
    email: "budoypolo21@gmail.com",
    employeeId: "KG0318",
    jobTitle: "Research & Development Associate",
    department: "Research and Development",
    role: "EMPLOYEE",
  },
  {
    name: "Mark Christian De Guzman",
    email: "markchristiandeguzman399@gmail.com",
    employeeId: "KG0696",
    jobTitle: "Technical-in-House",
    department: "Research and Development",
    role: "EMPLOYEE",
  },
  {
    name: "Marvin Nietes",
    email: "marvinnietes@gmail.com",
    employeeId: "KG0156",
    jobTitle: "Technical Specialist",
    department: "Research and Development",
    role: "EMPLOYEE",
  },
];

async function withRetry(fn, attempts = 5) {
  let last;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      const wait = 2000 * (i + 1);
      console.log(`retry ${i + 1}/${attempts}: ${String(e.message).split("\n")[0]}`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw last;
}

async function ensureEmployeeIdColumn(conn, db) {
  const [cols] = await conn.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'rd_users' AND COLUMN_NAME = 'employee_id'`,
    [db],
  );
  if (!cols.length) {
    await conn.query(
      `ALTER TABLE \`${db}\`.rd_users ADD COLUMN employee_id VARCHAR(40) NULL AFTER email`,
    );
    try {
      await conn.query(
        `ALTER TABLE \`${db}\`.rd_users ADD UNIQUE KEY rd_users_employee_id_uq (employee_id)`,
      );
    } catch {
      /* index may already exist */
    }
    console.log(`[MySQL] added employee_id column to ${db}.rd_users`);
  }
}

async function syncMysql() {
  const db = process.env.MYSQL_RD_DATABASE || "db_rd_management";
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    connectTimeout: 20000,
  });
  try {
    await ensureEmployeeIdColumn(conn, db);
    console.log(`\n[MySQL] Upserting into ${db}.rd_users …`);
    for (const p of PEOPLE) {
      const [rows] = await conn.query(
        `SELECT id, role FROM \`${db}\`.rd_users WHERE email = ? LIMIT 1`,
        [p.email],
      );
      if (rows[0]) {
        await conn.execute(
          `UPDATE \`${db}\`.rd_users
           SET name = ?, employee_id = ?, role = ?, job_title = ?, department = ?, is_active = 1
           WHERE id = ?`,
          [p.name, p.employeeId, p.role, p.jobTitle, p.department, rows[0].id],
        );
        console.log(`  update ${p.role} ${p.employeeId} ${p.email}`);
      } else {
        const id = randomUUID();
        const password = p.role === "ADMIN" ? ADMIN_PASSWORD : DEFAULT_PASSWORD;
        await conn.execute(
          `INSERT INTO \`${db}\`.rd_users
            (id, name, email, employee_id, password_hash, role, is_active, job_title, department, avatar_color)
           VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
          [
            id,
            p.name,
            p.email,
            p.employeeId,
            bcrypt.hashSync(password, 10),
            p.role,
            p.jobTitle,
            p.department,
            p.role === "ADMIN" ? "#4f46e5" : "#0891b2",
          ],
        );
        console.log(`  create ${p.role} ${p.employeeId} ${p.email}`);
      }
    }

    // Best-effort: attach Polendey employee id if present in Kelin Connect.
    try {
      const [jp] = await conn.query(
        `SELECT loginid FROM db_kelinconnect.employees
         WHERE email LIKE '%polendey%' OR lastname LIKE '%Polendey%' LIMIT 1`,
      );
      if (jp[0]?.loginid) {
        await conn.execute(
          `UPDATE \`${db}\`.rd_users SET employee_id = ? WHERE email = ?`,
          [String(jp[0].loginid).toUpperCase(), "johnpaulpolendey22@gmail.com"],
        );
        console.log(
          `  admin employeeId ${String(jp[0].loginid).toUpperCase()} for johnpaulpolendey22@gmail.com`,
        );
      }
    } catch (e) {
      console.log("  skip johnpaul employeeId lookup:", e.message.split("\n")[0]);
    }
  } finally {
    await conn.end();
  }
}

async function syncNeon() {
  let url = process.env.DATABASE_URL;
  if (!url) {
    console.log("\n[Neon] skip — no DATABASE_URL");
    return;
  }
  url += (url.includes("?") ? "&" : "?") + "connection_limit=1&pool_timeout=60";
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    console.log("\n[Neon] Upserting users …");
    for (const p of PEOPLE) {
      await withRetry(async () => {
        const existing = await prisma.user.findUnique({ where: { email: p.email } });
        if (existing) {
          await prisma.user.update({
            where: { id: existing.id },
            data: {
              name: p.name,
              employeeId: p.employeeId,
              role: p.role,
              jobTitle: p.jobTitle,
              department: p.department,
              isActive: true,
            },
          });
          console.log(`  update ${p.role} ${p.employeeId} ${p.email}`);
        } else {
          const password = p.role === "ADMIN" ? ADMIN_PASSWORD : DEFAULT_PASSWORD;
          await prisma.user.create({
            data: {
              name: p.name,
              email: p.email,
              employeeId: p.employeeId,
              passwordHash: bcrypt.hashSync(password, 10),
              role: p.role,
              isActive: true,
              jobTitle: p.jobTitle,
              department: p.department,
              avatarColor: p.role === "ADMIN" ? "#4f46e5" : "#0891b2",
            },
          });
          console.log(`  create ${p.role} ${p.employeeId} ${p.email}`);
        }
      });
    }

    // Try to set John Paul employee ID from MySQL if available.
    try {
      const conn = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        port: Number(process.env.MYSQL_PORT || 3306),
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        connectTimeout: 15000,
      });
      try {
        const [jp] = await conn.query(
          `SELECT loginid FROM db_kelinconnect.employees
           WHERE email LIKE '%polendey%' OR lastname LIKE '%Polendey%' LIMIT 1`,
        );
        if (jp[0]?.loginid) {
          await withRetry(() =>
            prisma.user.updateMany({
              where: { email: "johnpaulpolendey22@gmail.com" },
              data: { employeeId: String(jp[0].loginid).toUpperCase() },
            }),
          );
          console.log(`  admin employeeId ${String(jp[0].loginid).toUpperCase()}`);
        }
      } finally {
        await conn.end();
      }
    } catch (e) {
      console.log("  skip johnpaul employeeId:", e.message.split("\n")[0]);
    }

    const users = await withRetry(() =>
      prisma.user.findMany({
        where: { isActive: true },
        select: { name: true, email: true, employeeId: true, role: true },
        orderBy: { name: "asc" },
      }),
    );
    console.log(JSON.stringify(users, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

await syncMysql();
await syncNeon();
console.log("\nDONE");
