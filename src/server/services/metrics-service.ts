import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { withDbRetry } from "@/lib/db-retry";
import type { DateRange } from "@/lib/date-range";
import {
  averageCompletionDays,
  averageProgress,
  completionRate,
  createdVsCompleted,
  employeeWorkload,
  isActive,
  isOverdue,
  overdueTrend,
  priorityDistribution,
  statusDistribution,
  type MetricTask,
} from "@/lib/metrics";
import { dueSoonWhere, openTaskWhere, overdueWhere, taskListSelect } from "@/server/repositories/task-repository";

const metricSelect = {
  status: true,
  priority: true,
  progress: true,
  createdAt: true,
  completedAt: true,
  dueDate: true,
  claimedAt: true,
  assigneeId: true,
  estimatedMinutes: true,
} satisfies Prisma.TaskSelect;

/** Archived tasks are excluded from every metric. */
function loadMetricTasks(where: Prisma.TaskWhereInput = {}): Promise<MetricTask[]> {
  return withDbRetry(() =>
    db.task.findMany({ where: { ...where, isArchived: false }, select: metricSelect }),
  );
}

function loadEmployees() {
  return withDbRetry(() =>
    db.user.findMany({
      where: { role: "EMPLOYEE", isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, avatarColor: true, jobTitle: true },
    }),
  );
}

const recentActivitySelect = {
  id: true,
  action: true,
  oldValue: true,
  newValue: true,
  createdAt: true,
  actor: { select: { id: true, name: true, avatarColor: true } },
  subjectUser: { select: { id: true, name: true } },
  task: { select: { taskKey: true, title: true } },
} satisfies Prisma.ActivityLogSelect;

export async function getAdminDashboard(range: DateRange) {
  const now = new Date();
  // Sequential batches + retries: remote MySQL often drops under a large Promise.all burst.
  const [tasks, employees] = await Promise.all([loadMetricTasks(), loadEmployees()]);
  const [open, overdue] = await Promise.all([
    withDbRetry(() => db.task.count({ where: openTaskWhere() })),
    withDbRetry(() => db.task.count({ where: overdueWhere(now) })),
  ]);
  const [recentTasks, recentActivity, awaitingReview] = await Promise.all([
    withDbRetry(() =>
      db.task.findMany({
        where: { isArchived: false },
        orderBy: { updatedAt: "desc" },
        take: 6,
        select: taskListSelect,
      }),
    ),
    withDbRetry(() =>
      db.activityLog.findMany({
        where: { taskId: { not: null } },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: recentActivitySelect,
      }),
    ),
    withDbRetry(() =>
      db.task.findMany({
        where: { isArchived: false, status: "IN_REVIEW" },
        orderBy: { updatedAt: "asc" },
        take: 5,
        select: taskListSelect,
      }),
    ),
  ]);

  const rate = completionRate(tasks, range);
  return {
    counts: {
      active: tasks.filter(isActive).length,
      open,
      inProgress: tasks.filter((t) => t.status === "IN_PROGRESS").length,
      inReview: tasks.filter((t) => t.status === "IN_REVIEW").length,
      completed: tasks.filter((t) => t.status === "COMPLETED").length,
      completedInRange: rate.completed,
      overdue,
    },
    completion: rate,
    averageProgress: averageProgress(tasks),
    status: statusDistribution(tasks),
    trend: createdVsCompleted(tasks, range),
    workload: employeeWorkload(employees, tasks, range, now),
    recentTasks,
    recentActivity,
    awaitingReview,
  };
}

export async function getEmployeeDashboard(userId: string, range: DateRange) {
  const now = new Date();
  const tasks = await loadMetricTasks({ assigneeId: userId });
  const [dueSoon, overdueTasks] = await Promise.all([
    withDbRetry(() =>
      db.task.findMany({
        where: { ...dueSoonWhere(7, now), assigneeId: userId },
        orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
        take: 6,
        select: taskListSelect,
      }),
    ),
    withDbRetry(() =>
      db.task.findMany({
        where: { ...overdueWhere(now), assigneeId: userId },
        orderBy: { dueDate: "asc" },
        take: 6,
        select: taskListSelect,
      }),
    ),
  ]);
  const [recentActivity, openCount] = await Promise.all([
    withDbRetry(() =>
      db.activityLog.findMany({
        where: { task: { assigneeId: userId, isArchived: false } },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: recentActivitySelect,
      }),
    ),
    withDbRetry(() => db.task.count({ where: openTaskWhere() })),
  ]);

  const rate = completionRate(tasks, range);
  const active = tasks.filter(isActive);
  return {
    counts: {
      active: active.length,
      overdue: tasks.filter((t) => isOverdue(t, now)).length,
      dueSoon: dueSoon.length,
      completedInRange: rate.completed,
      openAvailable: openCount,
    },
    completion: rate,
    averageProgress: averageProgress(tasks),
    status: statusDistribution(tasks),
    overview: [
      { label: "Completed", value: rate.completed },
      { label: "Active", value: active.length },
      { label: "Overdue", value: tasks.filter((t) => isOverdue(t, now)).length },
    ],
    trend: createdVsCompleted(tasks, range).map(({ label, completed }) => ({ label, completed })),
    dueSoon,
    overdueTasks,
    recentActivity,
  };
}

export async function getTeamWorkload(range: DateRange) {
  const [tasks, employees] = await Promise.all([loadMetricTasks(), loadEmployees()]);
  const openTasks = await withDbRetry(() => db.task.count({ where: openTaskWhere() }));
  const rows = employeeWorkload(employees, tasks, range);
  const totalActive = rows.reduce((s, r) => s + r.active, 0);
  return {
    rows,
    openTasks,
    averageActive: rows.length ? Math.round((totalActive / rows.length) * 10) / 10 : 0,
  };
}

export async function getReports(range: DateRange) {
  const [tasks, employees] = await Promise.all([loadMetricTasks(), loadEmployees()]);
  const workload = employeeWorkload(employees, tasks, range);
  return {
    totals: completionRate(tasks, range),
    averageCompletionDays: averageCompletionDays(tasks, range),
    averageProgress: averageProgress(tasks),
    createdVsCompleted: createdVsCompleted(tasks, range),
    status: statusDistribution(tasks),
    priority: priorityDistribution(tasks),
    overdueTrend: overdueTrend(tasks, range),
    currentOverdue: tasks.filter((t) => isOverdue(t)).length,
    byEmployee: workload,
    hasData: tasks.length > 0,
  };
}

export async function getEmployeeStats(userId: string, range: DateRange) {
  const tasks = await loadMetricTasks({ assigneeId: userId });
  return {
    completion: completionRate(tasks, range),
    averageProgress: averageProgress(tasks),
    status: statusDistribution(tasks),
    active: tasks.filter(isActive).length,
    overdue: tasks.filter((t) => isOverdue(t)).length,
    completedAllTime: tasks.filter((t) => t.status === "COMPLETED").length,
  };
}
