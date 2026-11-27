/**
 * Upsert verified R&D employees into Neon (Prisma User).
 * Does not contact or mutate any MySQL source database.
 */
import { createRequire } from "module";
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const kgsRoot = "C:/Kelin HRIS/hris3/acu/KGS-PURCHASE";

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
loadEnv(`${kgsRoot}/.env`);

const requireRoot = createRequire(join(root, "package.json"));
const requireKgs = createRequire(`${kgsRoot}/package.json`);
const { PrismaClient } = requireRoot("@prisma/client");
const bcrypt = requireKgs("bcryptjs");

const DEFAULT_PASSWORD =
  process.env.RD_EMPLOYEE_DEFAULT_PASSWORD || "Welcome@RD2026";
const COLORS = ["#0891b2", "#059669", "#d97706", "#dc2626", "#7c3aed"];

/** Verified from db_kelinconnect.employees (Research and Development). */
const PEOPLE = [
  {
    name: "Adrian Pacis",
    email: "adrianmaliwat26@gmail.com",
    jobTitle: "Research & Development Associate",
  },
  {
    name: "Dexter Tolentino",
    email: "tolentinodexter@gmail.com",
    jobTitle: "R&D",
  },
  {
    name: "Justine Polo",
    email: "budoypolo21@gmail.com",
    jobTitle: "Research & Development Associate",
  },
  {
    name: "Mark Christian De Guzman",
    email: "markchristiandeguzman399@gmail.com",
    jobTitle: "Technical-in-House",
  },
  {
    name: "Marvin Nietes",
    email: "marvinnietes@gmail.com",
    jobTitle: "Technical Specialist",
  },
];

let url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}
url += (url.includes("?") ? "&" : "?") + "connection_limit=1&pool_timeout=60";

async function withRetry(fn, attempts = 5) {
  let last;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      const wait = 2000 * (i + 1);
      console.log(`retry ${i + 1}/${attempts} after ${wait}ms: ${e.message.split("\n")[0]}`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw last;
}

const prisma = new PrismaClient({ datasources: { db: { url } } });

try {
  console.log(`Syncing ${PEOPLE.length} employees to Neon…`);

  for (let i = 0; i < PEOPLE.length; i++) {
    const emp = PEOPLE[i];
    await withRetry(async () => {
      const existing = await prisma.user.findUnique({
        where: { email: emp.email },
      });
      if (existing) {
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            name: emp.name,
            jobTitle: emp.jobTitle,
            department: "Research and Development",
            isActive: true,
            role: "EMPLOYEE",
          },
        });
        console.log("update", emp.email);
      } else {
        await prisma.user.create({
          data: {
            name: emp.name,
            email: emp.email,
            passwordHash: bcrypt.hashSync(DEFAULT_PASSWORD, 10),
            role: "EMPLOYEE",
            isActive: true,
            jobTitle: emp.jobTitle,
            department: "Research and Development",
            avatarColor: COLORS[i % COLORS.length],
          },
        });
        console.log("create", emp.email);
      }
    });
  }

  const demo = await withRetry(() =>
    prisma.user.updateMany({
      where: { email: { endsWith: "@rnd.local" }, isActive: true },
      data: { isActive: false },
    }),
  );
  console.log("deactivatedDemo", demo.count);

  // Keep / restore the real admin account used for this app.
  const adminEmail = (
    process.env.RD_ADMIN_EMAIL || "johnpaulpolendey22@gmail.com"
  )
    .trim()
    .toLowerCase();
  const adminName = process.env.RD_ADMIN_NAME || "John Paul Polendey";
  await withRetry(async () => {
    const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (admin) {
      await prisma.user.update({
        where: { id: admin.id },
        data: {
          name: adminName,
          role: "ADMIN",
          isActive: true,
          department: "Research and Development",
          jobTitle: admin.jobTitle || "Administrator",
        },
      });
      console.log("ensure admin", adminEmail);
    } else {
      const password =
        process.env.RD_ADMIN_PASSWORD || DEFAULT_PASSWORD;
      await prisma.user.create({
        data: {
          name: adminName,
          email: adminEmail,
          passwordHash: bcrypt.hashSync(password, 10),
          role: "ADMIN",
          isActive: true,
          jobTitle: "Administrator",
          department: "Research and Development",
          avatarColor: "#4f46e5",
        },
      });
      console.log("create admin", adminEmail);
    }
  });

  const users = await withRetry(() =>
    prisma.user.findMany({
      select: {
        name: true,
        email: true,
        role: true,
        isActive: true,
        jobTitle: true,
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    }),
  );
  console.log(JSON.stringify(users, null, 2));
} finally {
  await prisma.$disconnect();
}
