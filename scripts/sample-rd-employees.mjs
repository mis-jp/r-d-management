/**
 * READ-ONLY: dump Research and Development employees from Kelin Connect.
 */
import { createRequire } from "module";
import { existsSync, readFileSync } from "fs";

const kgsRoot = "C:/Kelin HRIS/hris3/acu/KGS-PURCHASE";
const envPath = `${kgsRoot}/.env`;
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const k = m[1].trim();
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    if (!(k in process.env)) process.env[k] = v;
  }
}

const require = createRequire(`${kgsRoot}/package.json`);
const mysql = require("mysql2/promise");

const conn = await mysql.createConnection({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  connectTimeout: 20000,
});

const [rows] = await conn.query(`
  SELECT *
  FROM db_kelinconnect.employees
  WHERE department = 'Research and Development'
  ORDER BY lastname
`);
console.log(JSON.stringify(rows, null, 2));

const emails = rows.map((r) => r.email).filter(Boolean);
if (emails.length) {
  const [users] = await conn.query(
    `SELECT id, email, full_name, role, is_active FROM db_kelinconnect.users WHERE email IN (?)`,
    [emails],
  );
  console.log("\nLINKED USERS", JSON.stringify(users, null, 2));
}

await conn.end();
