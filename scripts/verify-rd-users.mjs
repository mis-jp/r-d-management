import { createRequire } from "module";
import { existsSync, readFileSync } from "fs";

const kgsRoot = "C:/Kelin HRIS/hris3/acu/KGS-PURCHASE";
for (const line of readFileSync(`${kgsRoot}/.env`, "utf8").split(/\r?\n/)) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (!m) continue;
  const k = m[1].trim();
  let v = m[2].trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  )
    v = v.slice(1, -1);
  if (!(k in process.env)) process.env[k] = v;
}

const mysql = createRequire(`${kgsRoot}/package.json`)("mysql2/promise");
const conn = await mysql.createConnection({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
});

const [rows] = await conn.query(`
  SELECT name, email, role, is_active, job_title, department
  FROM db_rd_management.rd_users
  ORDER BY is_active DESC, name ASC
`);
console.log(JSON.stringify(rows, null, 2));
await conn.end();
