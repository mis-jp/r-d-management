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
});
const [rows] = await conn.query(`
  SELECT loginid, lastname, email, department, jobtitle
  FROM db_kelinconnect.employees
  WHERE email LIKE '%polendey%' OR lastname LIKE '%Polendey%'
`);
console.log(JSON.stringify(rows, null, 2));
await conn.end();
