/**
 * READ-ONLY: inspect how Kelin Connect stores passwords.
 */
import { createRequire } from "module";
import { readFileSync } from "fs";

const kgsRoot = "C:/Kelin HRIS/hris3/acu/KGS-PURCHASE";
for (const line of readFileSync(`${kgsRoot}/.env`, "utf8").split(/\r?\n/)) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (!m) continue;
  let v = m[2].trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  )
    v = v.slice(1, -1);
  if (!(m[1].trim() in process.env)) process.env[m[1].trim()] = v;
}

const mysql = createRequire(`${kgsRoot}/package.json`)("mysql2/promise");
const conn = await mysql.createConnection({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  connectTimeout: 20000,
});

const emails = [
  "adrianmaliwat26@gmail.com",
  "joycecambel@gmail.com",
  "moraleuniceysabelle@gmail.com",
  "tolentinodexter@gmail.com",
  "johnpaulpolendey22@gmail.com",
];

const [rows] = await conn.query(
  `SELECT email, full_name, employee_id, role, deleted_at,
          LENGTH(password_hash) AS pw_len,
          LEFT(password_hash, 10) AS pw_prefix
   FROM db_kelinconnect.users
   WHERE email IN (?)`,
  [emails],
);
console.log("matched users:", rows.length);
console.log(
  JSON.stringify(
    rows.map((r) => ({
      email: r.email,
      full_name: r.full_name,
      employee_id: r.employee_id,
      role: r.role,
      deleted: !!r.deleted_at,
      pw_len: r.pw_len,
      pw_prefix: r.pw_prefix,
    })),
    null,
    2,
  ),
);

// Also check if Flutter might use a different accounts table
const [like] = await conn.query(`
  SELECT TABLE_NAME, COLUMN_NAME
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'db_kelinconnect'
    AND COLUMN_NAME REGEXP 'password'
  ORDER BY TABLE_NAME
`);
console.log("password columns:", like);

await conn.end();
