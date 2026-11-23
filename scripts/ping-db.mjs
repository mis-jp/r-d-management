import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
try {
  const n = await db.user.count();
  console.log("OK users=", n);
} catch (e) {
  console.error("FAIL", e.code || "", String(e.message).split("\n").slice(0, 4).join(" | "));
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
