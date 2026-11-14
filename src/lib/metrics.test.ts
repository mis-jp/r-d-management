import { describe, expect, it } from "vitest";
import type { DateRange } from "./date-range";
import {
  averageCompletionDays,
  averageProgress,
  completionRate,
  createdVsCompleted,
  employeeWorkload,
  isOverdue,
  overdueTrend,
  type MetricTask,
} from "./metrics";

const d = (s: string) => new Date(`${s}T12:00:00Z`);
const task = (t: Partial<MetricTask>): MetricTask => ({
  status: "IN_PROGRESS",
  priority: "NORMAL",
  progress: 50,
  createdAt: d("2026-11-01"),
  completedAt: null,
  dueDate: null,
  claimedAt: null,
  assigneeId: "e1",
  estimatedMinutes: null,
  ...t,
});

const november: DateRange = { key: "month", label: "This month", start: new Date("2026-11-01T00:00:00Z"), end: new Date("2026-11-30T23:59:59Z") };
const allTime: DateRange = { key: "all", label: "All time", start: null, end: new Date("2026-11-30T23:59:59Z") };

describe("completionRate", () => {
  it("returns null (not NaN) when there are no tasks", () => {
    expect(completionRate([], november)).toEqual({ completed: 0, total: 0, rate: null });
  });

  it("divides completed-in-period by tasks in the period", () => {
    const tasks = [
      task({ status: "COMPLETED", progress: 100, completedAt: d("2026-11-05") }),
      task({}),
      task({}),
      task({ status: "COMPLETED", progress: 100, completedAt: d("2026-11-10") }),
    ];
    expect(completionRate(tasks, november)).toEqual({ completed: 2, total: 4, rate: 50 });
  });

  it("excludes cancelled tasks and tasks completed before the period", () => {
    const tasks = [
      task({ status: "CANCELLED" }),
      task({ status: "COMPLETED", createdAt: d("2026-09-01"), completedAt: d("2026-10-15") }),
      task({ status: "COMPLETED", completedAt: d("2026-11-03") }),
    ];
    expect(completionRate(tasks, november)).toEqual({ completed: 1, total: 1, rate: 100 });
  });

  it("all-time counts every non-cancelled task", () => {
    const tasks = [task({ status: "COMPLETED", completedAt: d("2026-01-03") }), task({})];
    expect(completionRate(tasks, allTime).rate).toBe(50);
  });

  it("ignores tasks created after the period ends", () => {
    expect(completionRate([task({ createdAt: d("2026-12-05") })], november).total).toBe(0);
  });
});

describe("averageProgress", () => {
  it("averages active tasks only and is separate from completion rate", () => {
    const tasks = [task({ progress: 20 }), task({ progress: 60 }), task({ status: "COMPLETED", progress: 100 })];
    expect(averageProgress(tasks)).toBe(40);
  });
  it("returns null with no active tasks", () => {
    expect(averageProgress([task({ status: "COMPLETED", progress: 100 })])).toBeNull();
  });
});

describe("overdue", () => {
  const today = new Date("2026-11-14T08:00:00Z");
  it("is active with a due date before today", () => {
    expect(isOverdue(task({ dueDate: d("2026-11-10") }), today)).toBe(true);
    expect(isOverdue(task({ dueDate: d("2026-11-20") }), today)).toBe(false);
    expect(isOverdue(task({ dueDate: d("2026-11-10"), status: "COMPLETED" }), today)).toBe(false);
    expect(isOverdue(task({ dueDate: null }), today)).toBe(false);
  });

  it("trend counts tasks still open past their due date at each bucket end", () => {
    const range: DateRange = { key: "7d", label: "7d", start: new Date(2026, 10, 1), end: new Date(2026, 10, 7, 23, 59) };
    const trend = overdueTrend([task({ createdAt: new Date(2026, 9, 1), dueDate: new Date(2026, 10, 3, 12) })], range);
    expect(trend.map((b) => b.overdue)).toEqual([0, 0, 0, 1, 1, 1, 1]);
  });
});

describe("time series", () => {
  it("buckets created and completed counts", () => {
    const range: DateRange = { key: "7d", label: "7d", start: new Date(2026, 10, 1), end: new Date(2026, 10, 7, 23, 59) };
    const tasks = [
      task({ createdAt: new Date(2026, 10, 1, 9) }),
      task({ createdAt: new Date(2026, 10, 1, 9), status: "COMPLETED", completedAt: new Date(2026, 10, 3, 15) }),
    ];
    const series = createdVsCompleted(tasks, range);
    expect(series).toHaveLength(7);
    expect(series[0]).toMatchObject({ created: 2, completed: 0 });
    expect(series[2]).toMatchObject({ created: 0, completed: 1 });
  });

  it("average completion days", () => {
    const tasks = [task({ status: "COMPLETED", createdAt: d("2026-11-01"), completedAt: d("2026-11-05") })];
    expect(averageCompletionDays(tasks, november)).toBe(4);
    expect(averageCompletionDays([], november)).toBeNull();
  });
});

describe("employeeWorkload", () => {
  it("summarizes active, overdue and estimated effort per employee", () => {
    const now = new Date("2026-11-14T08:00:00Z");
    const rows = employeeWorkload(
      [{ id: "e1", name: "A", avatarColor: null, jobTitle: null }, { id: "e2", name: "B", avatarColor: null, jobTitle: null }],
      [
        task({ estimatedMinutes: 120, dueDate: d("2026-11-01") }),
        task({ status: "NOT_STARTED", progress: 0 }),
        task({ assigneeId: "e2", status: "COMPLETED", completedAt: d("2026-11-02") }),
      ],
      november,
      now,
    );
    expect(rows[0]).toMatchObject({ active: 2, overdue: 1, estimatedActiveMinutes: 120, activeWithoutEstimate: 1, completionRate: 0 });
    expect(rows[1]).toMatchObject({ active: 0, completedInRange: 1, completionRate: 100 });
  });
});
