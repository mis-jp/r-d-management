import net from "node:net";
import { PrismaClient } from "@prisma/client";

const host = "190.92.233.232";
const port = 3306;
const url =
  process.env.REMOTE_DATABASE_URL ||
  "mysql://alecdb:%23Kelin2026@190.92.233.232:3306/rd_tasks?connect_timeout=20&connection_limit=3";

function tcpCheck(ms = 8000) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const timer = setTimeout(() => {
      socket.destroy();
      resolve({ ok: false, error: "timeout" });
    }, ms);
    socket.on("connect", () => {
      clearTimeout(timer);
      socket.end();
      resolve({ ok: true });
    });
    socket.on("error", (err) => {
      clearTimeout(timer);
      resolve({ ok: false, error: err.message });
    });
  });
}

console.log("TCP", await tcpCheck());
process.env.DATABASE_URL = url;
const db = new PrismaClient();
try {
  const users = await db.user.findMany({
    select: { email: true, role: true, isActive: true },
    take: 10,
  });
  console.log("USERS", users);
} catch (e) {
  console.log("PRISMA_FAIL", e.code || "", String(e.message).split("\n")[0]);
} finally {
  await db.$disconnect();
}
