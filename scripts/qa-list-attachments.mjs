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
const prisma = new PrismaClient();
const rows = await prisma.attachment.findMany({
  take: 5,
  select: {
    id: true,
    fileName: true,
    mimeType: true,
    task: { select: { taskKey: true, assigneeId: true, status: true, isArchived: true } },
  },
});
console.log(JSON.stringify(rows, null, 2));
await prisma.$disconnect();
