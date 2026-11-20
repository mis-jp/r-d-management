import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "..", ".env") });

const prisma = new PrismaClient();
const cases = [
  ["johnpaulpolendey22@gmail.com", "KELINpa$$2026"],
  ["admin@rnd.local", "Password123!"],
];

for (const [email, password] of cases) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true, isActive: true, passwordHash: true },
  });
  if (!user) {
    console.log(email, "NOT_FOUND");
    continue;
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  console.log(email, { role: user.role, active: user.isActive, passwordOk: ok });
}

await prisma.$disconnect();
