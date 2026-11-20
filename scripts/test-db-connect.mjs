import { config } from "dotenv";
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "..", ".env") });

const url = process.env.DATABASE_URL || "";
const m = url.match(/^mysql:\/\/([^:]+):([^@]+)@([^:\/]+):(\d+)\/([^?]+)/);
if (!m) {
  console.error("Bad DATABASE_URL");
  process.exit(1);
}
const user = decodeURIComponent(m[1]);
const password = decodeURIComponent(m[2]);
const host = m[3];
const port = Number(m[4]);
const database = m[5];

console.log("Trying mysql2...", { host, port, user, database, passLen: password.length });

const require = createRequire(
  pathToFileURLCompat("C:/Kelin HRIS/hris3/acu/KGS-PURCHASE/package.json"),
);

function pathToFileURLCompat(p) {
  return "file:///" + p.replace(/\\/g, "/");
}

const mysql = require("mysql2/promise");

try {
  const conn = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
    connectTimeout: 20000,
  });
  const [rows] = await conn.query("SELECT 1 AS ok, DATABASE() AS db");
  console.log("mysql2 OK", rows[0]);
  await conn.end();
} catch (err) {
  console.error("mysql2 FAIL", err.code || err.message);
}

console.log("Trying Prisma...");
try {
  const prisma = new PrismaClient();
  const rows = await prisma.$queryRawUnsafe("SELECT 1 AS ok");
  console.log("prisma OK", rows);
  await prisma.$disconnect();
} catch (err) {
  console.error("prisma FAIL", err.message.split("\n")[0]);
}
