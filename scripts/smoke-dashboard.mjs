import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
try {
  const now = new Date();
  const [tasks, employees, open, overdue, recentTasks, recentActivity, awaitingReview] =
    await Promise.all([
      db.task.findMany({
        where: { isArchived: false },
        select: {
          status: true,
          priority: true,
          progress: true,
          createdAt: true,
          completedAt: true,
          dueDate: true,
          claimedAt: true,
          assigneeId: true,
          estimatedMinutes: true,
        },
      }),
      db.user.findMany({
        where: { role: "EMPLOYEE", isActive: true },
        select: { id: true, name: true },
      }),
      db.task.count({
        where: { isArchived: false, status: { in: ["NOT_STARTED", "IN_PROGRESS", "IN_REVIEW", "ON_HOLD"] } },
      }),
      db.task.count({
        where: {
          isArchived: false,
          status: { notIn: ["COMPLETED", "CANCELLED"] },
          dueDate: { lt: now },
        },
      }),
      db.task.findMany({ where: { isArchived: false }, orderBy: { updatedAt: "desc" }, take: 6 }),
      db.activityLog.findMany({
        where: { taskId: { not: null } },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      db.task.findMany({
        where: { isArchived: false, status: "IN_REVIEW" },
        take: 5,
      }),
    ]);

  console.log("dashboard-smoke OK", {
    tasks: tasks.length,
    employees: employees.length,
    open,
    overdue,
    recentTasks: recentTasks.length,
    recentActivity: recentActivity.length,
    awaitingReview: awaitingReview.length,
  });
} catch (e) {
  console.error("dashboard-smoke FAIL", e.message);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
