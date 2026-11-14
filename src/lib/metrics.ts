import { startOfDay, subDays } from "date-fns";
import type { Priority, TaskStatus } from "@prisma/client";
import { CLOSED_STATUSES, PRIORITIES, TASK_STATUSES } from "./constants";
import { buildBuckets, type DateRange } from "./date-range";
import { percent } from "./utils";

export type MetricTask = {
  status: TaskStatus;
  priority: Priority;
  progress: number;
  createdAt: Date;
  completedAt: Date | null;
  dueDate: Date | null;
  claimedAt: Date | null;
  assigneeId: string | null;
  estimatedMinutes: number | null;
};

const isClosed = (t: MetricTask) => CLOSED_STATUSES.includes(t.status);
const inRange = (d: Date | null, range: DateRange) => !!d && (!range.start || d >= range.start) && d <= range.end;

/** Active = not completed and not cancelled. */
export const isActive = (t: MetricTask) => !isClosed(t);

/** Overdue = active and its due date is before today. */
export function isOverdue(t: MetricTask, now = new Date()): boolean {
  return !!t.dueDate && isActive(t) && t.dueDate < startOfDay(now);
}

/** Tasks that were "on the books" at some point in the range: created by its end, not cancelled,
 * and not already completed before it started. */
export function tasksInPeriod(tasks: MetricTask[], range: DateRange): MetricTask[] {
  return tasks.filter(
    (t) =>
      t.status !== "CANCELLED" &&
      t.createdAt <= range.end &&
      !(t.status === "COMPLETED" && t.completedAt && range.start && t.completedAt < range.start),
  );
}

export function completedInPeriod(tasks: MetricTask[], range: DateRange): MetricTask[] {
  return tasks.filter((t) => t.status === "COMPLETED" && inRange(t.completedAt, range));
}

/**
 * Completion rate = tasks completed within the range ÷ tasks in the period (see `tasksInPeriod`) × 100.
 * Returns `rate: null` when there are no tasks, so the UI can show "No tasks in this period".
 */
export function completionRate(tasks: MetricTask[], range: DateRange) {
  const period = tasksInPeriod(tasks, range);
  const completed = completedInPeriod(period, range).length;
  return { completed, total: period.length, rate: percent(completed, period.length) };
}

/** Average progress across active tasks — a different measure from completion rate. */
export function averageProgress(tasks: MetricTask[]): number | null {
  const active = tasks.filter(isActive);
  if (!active.length) return null;
  return Math.round(active.reduce((sum, t) => sum + t.progress, 0) / active.length);
}

export function statusDistribution(tasks: MetricTask[]) {
  return TASK_STATUSES.map((status) => ({ status, count: tasks.filter((t) => t.status === status).length }));
}

export function priorityDistribution(tasks: MetricTask[]) {
  return PRIORITIES.map((priority) => ({
    priority,
    count: tasks.filter((t) => t.priority === priority && isActive(t)).length,
  }));
}

function effectiveStart(tasks: MetricTask[], range: DateRange): Date {
  if (range.start) return range.start;
  const earliest = tasks.reduce<Date | null>((min, t) => (!min || t.createdAt < min ? t.createdAt : min), null);
  return startOfDay(earliest ?? subDays(range.end, 29));
}

export function createdVsCompleted(tasks: MetricTask[], range: DateRange) {
  return buildBuckets(effectiveStart(tasks, range), range.end).map((b) => ({
    label: b.label,
    created: tasks.filter((t) => t.createdAt >= b.start && t.createdAt <= b.end).length,
    completed: tasks.filter((t) => t.status === "COMPLETED" && t.completedAt && t.completedAt >= b.start && t.completedAt <= b.end)
      .length,
  }));
}

/** Number of tasks that were overdue at the end of each bucket (cancelled tasks excluded). */
export function overdueTrend(tasks: MetricTask[], range: DateRange) {
  return buildBuckets(effectiveStart(tasks, range), range.end).map((b) => ({
    label: b.label,
    overdue: tasks.filter(
      (t) =>
        t.status !== "CANCELLED" &&
        !!t.dueDate &&
        t.createdAt <= b.end &&
        t.dueDate < startOfDay(b.end) &&
        (!t.completedAt || t.completedAt > b.end),
    ).length,
  }));
}

/** Average days from creation to completion for tasks completed in the range. */
export function averageCompletionDays(tasks: MetricTask[], range: DateRange): number | null {
  const done = completedInPeriod(tasks, range);
  if (!done.length) return null;
  const totalMs = done.reduce((sum, t) => sum + (t.completedAt!.getTime() - t.createdAt.getTime()), 0);
  return Math.round((totalMs / done.length / 86_400_000) * 10) / 10;
}

export type EmployeeRef = { id: string; name: string; avatarColor: string | null; jobTitle: string | null };

export function employeeWorkload(employees: EmployeeRef[], tasks: MetricTask[], range: DateRange, now = new Date()) {
  return employees.map((e) => {
    const mine = tasks.filter((t) => t.assigneeId === e.id);
    const active = mine.filter(isActive);
    const rate = completionRate(mine, range);
    return {
      ...e,
      active: active.length,
      notStarted: active.filter((t) => t.status === "NOT_STARTED").length,
      inProgress: active.filter((t) => t.status === "IN_PROGRESS").length,
      inReview: active.filter((t) => t.status === "IN_REVIEW").length,
      onHold: active.filter((t) => t.status === "ON_HOLD").length,
      overdue: mine.filter((t) => isOverdue(t, now)).length,
      completedInRange: rate.completed,
      claimedInRange: mine.filter((t) => inRange(t.claimedAt, range)).length,
      completionRate: rate.rate,
      periodTotal: rate.total,
      averageProgress: averageProgress(mine),
      estimatedActiveMinutes: active.reduce((sum, t) => sum + (t.estimatedMinutes ?? 0), 0),
      activeWithoutEstimate: active.filter((t) => t.estimatedMinutes === null).length,
    };
  });
}

export type WorkloadRow = ReturnType<typeof employeeWorkload>[number];
