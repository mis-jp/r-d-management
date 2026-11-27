/**
 * READ-ONLY discovery of R&D employees on the shared MySQL host.
 * Never writes, drops, or alters any database/table.
 */
import { createRequire } from "module";
import { config } from "dotenv";
import { existsSync } from "fs";
import { pathToFileURL } from "url";

const kgsRoot = "C:/Kelin HRIS/hris3/acu/KGS-PURCHASE";
const kgsEnv = `${kgsRoot}/.env`;
if (existsSync(kgsEnv)) config({ path: kgsEnv });

const require = createRequire(`${kgsRoot}/package.json`);
const mysql = require("mysql2/promise");

const host = process.env.MYSQL_HOST || "190.92.233.232";
const port = Number(process.env.MYSQL_PORT || 3306);
const user = process.env.MYSQL_USER;
const password = process.env.MYSQL_PASSWORD;

if (!user || password === undefined) {
  console.error("Missing MYSQL_USER / MYSQL_PASSWORD from KGS .env");
  process.exit(1);
}

const conn = await mysql.createConnection({
  host,
  port,
  user,
  password,
  connectTimeout: 20000,
});

const [dbs] = await conn.query("SHOW DATABASES");
const dbNames = dbs
  .map((r) => Object.values(r)[0])
  .filter((n) => !["information_schema", "mysql", "performance_schema", "sys"].includes(n));
console.log("DATABASES", dbNames);

for (const db of dbNames) {
  const [tables] = await conn.query(
    `SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME`,
    [db],
  );
  const interesting = tables
    .map((t) => t.name)
    .filter((n) => /user|employee|staff|person|member|account|dept|department/i.test(n));
  if (interesting.length) console.log(`\n[${db}] candidates:`, interesting.join(", "));
}

const [cols] = await conn.query(`
  SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA NOT IN ('information_schema','mysql','performance_schema','sys')
    AND COLUMN_NAME REGEXP 'department|dept|job_title|position|email|full_name|firstname|lastname|first_name|last_name'
  ORDER BY TABLE_SCHEMA, TABLE_NAME, ORDINAL_POSITION
`);

const byTable = new Map();
for (const c of cols) {
  const key = `${c.TABLE_SCHEMA}.${c.TABLE_NAME}`;
  if (!byTable.has(key)) byTable.set(key, []);
  byTable.get(key).push(c.COLUMN_NAME);
}

console.log("\nPeople-ish tables (name + email columns):");
for (const [key, columns] of byTable) {
  const hasEmail = columns.some((c) => /email/i.test(c));
  const hasName = columns.some((c) => /name|first|last/i.test(c));
  if (hasEmail && hasName) console.log(`  ${key}: ${columns.join(", ")}`);
}

// Sample R&D rows from promising tables (SELECT only, limit 20).
async function sample(sql, label) {
  try {
    const [rows] = await conn.query(sql);
    console.log(`\nSAMPLE ${label} (${rows.length})`);
    console.log(JSON.stringify(rows.slice(0, 15), null, 2));
  } catch (e) {
    console.log(`\nSAMPLE ${label} SKIP:`, e.message.split("\n")[0]);
  }
}

await sample(
  `SELECT id, name, email, role, is_active, job_title, department FROM db_rd_management.rd_users ORDER BY name LIMIT 30`,
  "db_rd_management.rd_users",
);

// Common HRIS patterns — try a few without assuming schema ownership.
for (const [db, table] of [
  ["db_kelin_connect", "employees"],
  ["db_kelin_connect", "users"],
  ["kelin_connect", "employees"],
  ["hris", "employees"],
  ["db_hris", "employees"],
]) {
  if (!dbNames.includes(db)) continue;
  await sample(`SHOW COLUMNS FROM \`${db}\`.\`${table}\``, `${db}.${table} columns`);
}

await conn.end();
console.log("\nDONE (read-only)");
