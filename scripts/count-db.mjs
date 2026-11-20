import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "..", ".env") });

const p = new PrismaClient();
const counts = {
  users: await p.user.count(),
  tasks: await p.task.count(),
  tags: await p.tag.count(),
  comments: await p.comment.count(),
  activity: await p.activityLog.count(),
  notifications: await p.notification.count(),
  attachments: await p.attachment.count(),
};
console.log(JSON.stringify(counts, null, 2));
await p.$disconnect();
