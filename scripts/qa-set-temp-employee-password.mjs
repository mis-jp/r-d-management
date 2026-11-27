/**
 * Temporary QA helper: set a known password on one EMPLOYEE account in OUR Neon DB only.
 * Restore with: node scripts/sync-passwords-from-kelinconnect.mjs
 */
import { createRequire } from "module";
import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
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

const require = createRequire(join(root, "package.json"));
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const EMAIL = process.env.QA_EMAIL || "adrianmaliwat26@gmail.com";
const PASSWORD = process.env.QA_PASSWORD || "QaTest@RD2026";

const prisma = new PrismaClient();
const hash = await bcrypt.hash(PASSWORD, 12);
const u = await prisma.user.update({
  where: { email: EMAIL },
  data: { passwordHash: hash, sessionVersion: { increment: 1 } },
  select: { email: true, employeeId: true, role: true },
});
console.log("TEMP password set for", u);
console.log("password:", PASSWORD);
await prisma.$disconnect();
