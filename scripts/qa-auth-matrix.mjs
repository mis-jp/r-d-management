/**
 * Headless auth/RBAC smoke against local Next.js using cookie jar.
 * Uses known QA credentials (admin KC password + temp employee password).
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

const BASE = process.env.QA_BASE || "http://localhost:3000";
const results = [];

function log(id, ok, detail) {
  results.push({ id, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${id}  ${detail}`);
}

function parseCookies(res) {
  const raw = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  const map = new Map();
  for (const c of raw) {
    const [pair] = c.split(";");
    const i = pair.indexOf("=");
    if (i > 0) map.set(pair.slice(0, i), pair.slice(i + 1));
  }
  return map;
}

async function login(identifier, password) {
  const jar = new Map();
  const page = await fetch(`${BASE}/login`);
  for (const [k, v] of parseCookies(page)) jar.set(k, v);

  // Next server actions need special headers; use form POST to loginAction via RSC is hard.
  // Prefer authenticating via Prisma + minting session cookie like the app.
  const require = createRequire(join(root, "package.json"));
  const { PrismaClient } = require("@prisma/client");
  const bcrypt = require("bcryptjs");
  const { SignJWT } = require("jose");

  const prisma = new PrismaClient();
  const byEmail = identifier.includes("@");
  const user = await prisma.user.findUnique({
    where: byEmail
      ? { email: identifier.toLowerCase() }
      : { employeeId: identifier.toUpperCase() },
    select: { id: true, passwordHash: true, isActive: true, sessionVersion: true, role: true, email: true },
  });
  await prisma.$disconnect();
  if (!user || !(await bcrypt.compare(password, user.passwordHash)) || !user.isActive) {
    return { ok: false, jar, user: null };
  }

  const secret = new TextEncoder().encode(process.env.SESSION_SECRET);
  const token = await new SignJWT({ ver: user.sessionVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("400d")
    .sign(secret);
  jar.set("rd_session", token);
  return { ok: true, jar, user };
}

function cookieHeader(jar) {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function get(jar, path) {
  const res = await fetch(`${BASE}${path}`, {
    redirect: "manual",
    headers: { cookie: cookieHeader(jar) },
  });
  const loc = res.headers.get("location");
  return { status: res.status, loc, text: res.status < 400 && res.status !== 307 ? await res.text() : "" };
}

// --- tests ---
{
  const res = await fetch(`${BASE}/dashboard`, { redirect: "manual" });
  log("UNAUTH-dashboard", res.status === 307 && (res.headers.get("location") || "").includes("/login"), `status=${res.status} loc=${res.headers.get("location")}`);
}
{
  const res = await fetch(`${BASE}/api/search?q=x`);
  log("UNAUTH-api-search", res.status === 401, `status=${res.status}`);
}

const admin = await login("KG0751", "KELINpa$$2026");
log("LOGIN-admin-employeeId", admin.ok, admin.user ? admin.user.email : "failed");

if (admin.ok) {
  const dash = await get(admin.jar, "/dashboard");
  log("ADMIN-dashboard", dash.status === 200 && dash.text.includes("Welcome back"), `status=${dash.status}`);
  const my = await get(admin.jar, "/my-tasks");
  const redirected =
    my.status === 307 && (my.loc || "").includes("/tasks");
  // Next may return 200 with RSC redirect payload; also accept final content of All Tasks via follow
  const follow = await fetch(`${BASE}/my-tasks`, {
    headers: { cookie: cookieHeader(admin.jar) },
    redirect: "follow",
  });
  const body = await follow.text();
  log(
    "ADMIN-my-tasks-redirect",
    redirected || body.includes("All Tasks") || follow.url.includes("/tasks"),
    `manual=${my.status}/${my.loc} followUrl=${follow.url}`,
  );
  const emp = await get(admin.jar, "/employees");
  log("ADMIN-employees", emp.status === 200 && emp.text.toLowerCase().includes("employee"), `status=${emp.status}`);
}

const employee = await login("KG1005", "QaTest@RD2026");
log("LOGIN-employee-id", employee.ok, employee.user ? `${employee.user.email} role=${employee.user.role}` : "failed");

if (employee.ok) {
  const dash = await get(employee.jar, "/dashboard");
  log("EMP-dashboard", dash.status === 200, `status=${dash.status}`);
  const empPage = await get(employee.jar, "/employees");
  const followEmp = await fetch(`${BASE}/employees`, {
    headers: { cookie: cookieHeader(employee.jar) },
    redirect: "follow",
  });
  const empBody = await followEmp.text();
  const denied =
    empPage.status === 307 ||
    followEmp.url.includes("denied=1") ||
    followEmp.url.includes("/dashboard") ||
    empBody.includes("denied");
  log("EMP-block-employees", denied && !followEmp.url.includes("/employees"), `manual=${empPage.status}/${empPage.loc} final=${followEmp.url}`);

  const tasks = await fetch(`${BASE}/tasks`, {
    headers: { cookie: cookieHeader(employee.jar) },
    redirect: "follow",
  });
  log("EMP-block-all-tasks", !tasks.url.endsWith("/tasks") || tasks.url.includes("denied"), `final=${tasks.url}`);

  const my = await fetch(`${BASE}/my-tasks`, {
    headers: { cookie: cookieHeader(employee.jar) },
    redirect: "follow",
  });
  const myBody = await my.text();
  log("EMP-my-tasks", my.url.includes("/my-tasks") && myBody.includes("My Tasks"), `url=${my.url}`);
}

const bad = await login("KG0751", "WrongPassword999!");
log("LOGIN-bad-password", !bad.ok, "rejected");

console.log("\n--- summary ---");
console.log(`pass=${results.filter((r) => r.ok).length} fail=${results.filter((r) => !r.ok).length}`);
process.exit(results.some((r) => !r.ok) ? 1 : 0);
