/**
 * Upserts the production-style admin account into the local/remote Prisma DB.
 */
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "..", ".env") });

const email = (process.env.RD_ADMIN_EMAIL || "johnpaulpolendey22@gmail.com").trim().toLowerCase();
const password = process.env.RD_ADMIN_PASSWORD || "KELINpa$$2026";
const name = process.env.RD_ADMIN_NAME || "John Paul Polendey";

const prisma = new PrismaClient();
const passwordHash = await bcrypt.hash(String(password), 12);

const user = await prisma.user.upsert({
  where: { email },
  create: {
    name,
    email,
    passwordHash,
    role: "ADMIN",
    isActive: true,
    jobTitle: "Administrator",
    department: "Research & Development",
    avatarColor: "#4f46e5",
  },
  update: {
    name,
    passwordHash,
    role: "ADMIN",
    isActive: true,
  },
  select: { id: true, email: true, role: true },
});

console.log("Admin ready:", user.email, user.role, user.id);
await prisma.$disconnect();
