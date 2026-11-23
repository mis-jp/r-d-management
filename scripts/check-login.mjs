import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
try {
  const u = await db.user.findUnique({ where: { email: "maria.santos@rnd.local" } });
  const ok = u ? await bcrypt.compare("Password123!", u.passwordHash) : false;
  console.log({ found: !!u, passwordOk: ok, active: u?.isActive });
} finally {
  await db.$disconnect();
}
