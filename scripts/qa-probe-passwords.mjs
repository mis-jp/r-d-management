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

const prisma = new PrismaClient();
const tries = [
  ["johnpaulpolendey22@gmail.com", "KELINpa$$2026"],
  ["johnpaulpolendey22@gmail.com", "Welcome@RD2026"],
  ["johnpaulpolendey22@gmail.com", "Password123!"],
  ["adrianmaliwat26@gmail.com", "KELINpa$$2026"],
  ["adrianmaliwat26@gmail.com", "Welcome@RD2026"],
  ["moraleuniceysabelle@gmail.com", "KELINpa$$2026"],
  ["joycecambel@gmail.com", "KELINpa$$2026"],
];

for (const [email, pw] of tries) {
  try {
    const u = await prisma.user.findUnique({
      where: { email },
      select: { passwordHash: true, employeeId: true, role: true, isActive: true },
    });
    if (!u) {
      console.log(email, pw, "NOT_FOUND");
      continue;
    }
    const ok = await bcrypt.compare(pw, u.passwordHash);
    console.log(JSON.stringify({ email, pw, ok, employeeId: u.employeeId, role: u.role, active: u.isActive }));
  } catch (e) {
    console.log(email, "ERR", e.message.split("\n")[0]);
  }
}
await prisma.$disconnect();
