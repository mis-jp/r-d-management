import { createRequire } from "module";
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const line of readFileSync(join(root, ".env"), "utf8").split(/\r?\n/)) {
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

let url = process.env.DATABASE_URL;
url += (url.includes("?") ? "&" : "?") + "connection_limit=1&pool_timeout=60";
const { PrismaClient } = createRequire(join(root, "package.json"))(
  "@prisma/client",
);
const prisma = new PrismaClient({ datasources: { db: { url } } });
const users = await prisma.user.findMany({
  select: {
    name: true,
    email: true,
    role: true,
    isActive: true,
    jobTitle: true,
  },
  orderBy: [{ isActive: "desc" }, { name: "asc" }],
});
console.log(JSON.stringify(users, null, 2));
await prisma.$disconnect();
