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
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    )
      v = v.slice(1, -1);
    process.env[m[1].trim()] = v;
  }
}
loadEnv(join(root, ".env"));

const require = createRequire(join(root, "package.json"));
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { SignJWT } = require("jose");

const prisma = new PrismaClient();
const user = await prisma.user.findUnique({
  where: { email: "adrianmaliwat26@gmail.com" },
  select: { id: true, passwordHash: true, sessionVersion: true, role: true },
});
await prisma.$disconnect();
if (!user || user.role !== "EMPLOYEE") throw new Error("expected employee");
const ok = await bcrypt.compare("QaTest@RD2026", user.passwordHash);
if (!ok) throw new Error("password mismatch");

const token = await new SignJWT({ ver: user.sessionVersion })
  .setProtectedHeader({ alg: "HS256" })
  .setSubject(user.id)
  .setIssuedAt()
  .setExpirationTime("1d")
  .sign(new TextEncoder().encode(process.env.SESSION_SECRET));

for (const path of ["/employees", "/tasks", "/reports", "/settings"]) {
  const res = await fetch(`http://localhost:3000${path}`, {
    redirect: "manual",
    headers: {
      cookie: `rd_session=${token}`,
      accept: "text/html",
    },
  });
  const loc = res.headers.get("location");
  let body = "";
  try {
    body = await res.text();
  } catch {
    body = "";
  }
  const markers = {
    deniedMsg: /only available to administrators/i.test(body),
    joyceEmail: /joycecambel@gmail.com/i.test(body),
    allTasksHeading: />All Tasks</i.test(body) || /"All Tasks"/i.test(body),
    newTaskCta: /New task/i.test(body),
    employeeTable: /employeeId|Employee ID/i.test(body),
    rdKeysMany: (body.match(/RD-\d{3}/g) || []).length,
  };
  console.log(JSON.stringify({ path, status: res.status, loc, ...markers }, null, 0));
}
