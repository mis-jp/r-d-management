import { describe, expect, it } from "vitest";
import { resolveWorkState, type WorkState } from "./task-rules";

const now = new Date("2026-11-14T08:00:00Z");
const state = (s: Partial<WorkState>): WorkState => ({ status: "IN_PROGRESS", progress: 40, completedAt: null, ...s });

describe("resolveWorkState", () => {
  it("completing sets 100% and a completion timestamp", () => {
    expect(resolveWorkState(state({}), { status: "COMPLETED" }, now)).toEqual({
      status: "COMPLETED",
      progress: 100,
      completedAt: now,
    });
  });

  it("ignores a lower progress value when completing", () => {
    expect(resolveWorkState(state({}), { status: "COMPLETED", progress: 30 }, now).progress).toBe(100);
  });

  it("keeps the original completion time when an already-completed task is saved again", () => {
    const earlier = new Date("2026-11-01T00:00:00Z");
    const result = resolveWorkState(state({ status: "COMPLETED", progress: 100, completedAt: earlier }), {}, now);
    expect(result.completedAt).toBe(earlier);
  });

  it("not started is always 0%", () => {
    expect(resolveWorkState(state({ progress: 70 }), { status: "NOT_STARTED" }, now)).toMatchObject({ progress: 0 });
  });

  it("raising progress on a not-started task moves it to in progress", () => {
    expect(resolveWorkState(state({ status: "NOT_STARTED", progress: 0 }), { progress: 25 }, now)).toMatchObject({
      status: "IN_PROGRESS",
      progress: 25,
    });
  });

  it("on hold preserves current progress", () => {
    expect(resolveWorkState(state({ progress: 55 }), { status: "ON_HOLD" }, now)).toMatchObject({ status: "ON_HOLD", progress: 55 });
  });

  it("in review preserves the submitted progress", () => {
    expect(resolveWorkState(state({ progress: 55 }), { status: "IN_REVIEW", progress: 100 }, now)).toMatchObject({
      status: "IN_REVIEW",
      progress: 100,
      completedAt: null,
    });
  });

  it("reopening clears the completion timestamp and drops progress below 100", () => {
    const result = resolveWorkState(
      state({ status: "COMPLETED", progress: 100, completedAt: new Date("2026-11-01T00:00:00Z") }),
      { status: "IN_PROGRESS" },
      now,
    );
    expect(result).toEqual({ status: "IN_PROGRESS", progress: 90, completedAt: null });
  });

  it("clamps out-of-range progress", () => {
    expect(resolveWorkState(state({}), { progress: 150 }, now).progress).toBe(100);
    expect(resolveWorkState(state({}), { progress: -5 }, now).progress).toBe(0);
  });
});
