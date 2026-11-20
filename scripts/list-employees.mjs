import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "..", ".env") });

const p = new PrismaClient();
const users = await p.user.findMany({
  where: { role: "EMPLOYEE", isActive: true },
  select: { name: true, email: true, jobTitle: true },
  orderBy: { name: "asc" },
});
console.log(JSON.stringify(users, null, 2));
await p.$disconnect();
