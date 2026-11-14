import type { Role, TaskStatus } from "@prisma/client";
import { CLOSED_STATUSES } from "./constants";

type Actor = { id: string; role: Role };
type TaskAccessFields = {
  assigneeId: string | null;
  status: TaskStatus;
  isArchived: boolean;
};

export const isAdmin = (user: Actor) => user.role === "ADMIN";

/** OPEN is an assignment state: unassigned, active, and not archived. */
export function isOpenTask(task: TaskAccessFields): boolean {
  return task.assigneeId === null && !task.isArchived && !CLOSED_STATUSES.includes(task.status);
}

/** Admins see everything; employees see their own tasks and claimable OPEN tasks. */
export function canViewTask(user: Actor, task: TaskAccessFields): boolean {
  if (isAdmin(user)) return true;
  if (task.isArchived) return false;
  return task.assigneeId === user.id || isOpenTask(task);
}

/** Status/progress/time updates: admins, or the current assignee of an active task. */
export function canUpdateWork(user: Actor, task: TaskAccessFields): boolean {
  if (isAdmin(user)) return true;
  return task.assigneeId === user.id && !task.isArchived;
}

export function canComment(user: Actor, task: TaskAccessFields): boolean {
  return canUpdateWork(user, task);
}

export function canClaim(user: Actor, task: TaskAccessFields): boolean {
  return user.role === "EMPLOYEE" && isOpenTask(task);
}
