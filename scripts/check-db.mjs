import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
try {
  const [tasks, users, admin] = await Promise.all([
    db.task.count(),
    db.user.count(),
    db.user.findFirst({ where: { role: "ADMIN" }, select: { email: true, name: true } }),
  ]);
  console.log({ tasks, users, admin });
} catch (e) {
  console.error("FAIL", e.message);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
