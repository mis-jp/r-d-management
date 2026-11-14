import type { TaskStatus } from "@prisma/client";

export type WorkState = {
  status: TaskStatus;
  progress: number;
  completedAt: Date | null;
};

export type WorkChange = {
  status?: TaskStatus;
  progress?: number;
};

const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n)));

/**
 * Keeps status, progress and completion timestamp consistent:
 * - NOT_STARTED is always 0% (setting progress > 0 on a not-started task moves it to IN_PROGRESS).
 * - COMPLETED is always 100% with a completion timestamp.
 * - Any non-completed status clears the completion timestamp.
 * - ON_HOLD / IN_REVIEW / CANCELLED keep the current progress unless a new value is given.
 * - Reopening a completed task without a new progress value drops it to 90%.
 */
export function resolveWorkState(current: WorkState, change: WorkChange, now = new Date()): WorkState {
  let status = change.status ?? current.status;
  let progress = change.progress !== undefined ? clamp(change.progress) : current.progress;

  if (change.status === undefined && change.progress !== undefined) {
    if (status === "NOT_STARTED" && progress > 0) status = "IN_PROGRESS";
  }

  switch (status) {
    case "NOT_STARTED":
      progress = 0;
      break;
    case "COMPLETED":
      progress = 100;
      break;
    default:
      if (current.status === "COMPLETED" && change.progress === undefined) progress = 90;
  }

  const completedAt =
    status === "COMPLETED" ? (current.status === "COMPLETED" && current.completedAt ? current.completedAt : now) : null;

  return { status, progress, completedAt };
}
