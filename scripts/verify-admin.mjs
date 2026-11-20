import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "..", ".env") });

const email = "johnpaulpolendey22@gmail.com";
const password = "KELINpa$$2026";
const prisma = new PrismaClient();
const user = await prisma.user.findUnique({ where: { email } });
if (!user) {
  console.log("MISSING");
  process.exit(1);
}
const ok = await bcrypt.compare(password, user.passwordHash);
console.log(JSON.stringify({ email: user.email, role: user.role, active: user.isActive, passwordOk: ok }));
await prisma.$disconnect();
