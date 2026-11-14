import type { Priority, Role, TaskStatus } from "@prisma/client";

export const TASK_STATUSES: TaskStatus[] = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "IN_REVIEW",
  "COMPLETED",
  "ON_HOLD",
  "CANCELLED",
];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  COMPLETED: "Completed",
  ON_HOLD: "On Hold",
  CANCELLED: "Cancelled",
};

/** Statuses an employee may set on their own task. CANCELLED is admin-only. */
export const EMPLOYEE_STATUSES: TaskStatus[] = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "IN_REVIEW",
  "COMPLETED",
  "ON_HOLD",
];

export const CLOSED_STATUSES: TaskStatus[] = ["COMPLETED", "CANCELLED"];
export const ACTIVE_STATUSES: TaskStatus[] = ["NOT_STARTED", "IN_PROGRESS", "IN_REVIEW", "ON_HOLD"];

export const PRIORITIES: Priority[] = ["LOW", "NORMAL", "HIGH", "URGENT"];

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  URGENT: "Urgent",
};

export const PRIORITY_RANK: Record<Priority, number> = { LOW: 0, NORMAL: 1, HIGH: 2, URGENT: 3 };

export const ROLE_LABELS: Record<Role, string> = { ADMIN: "Admin", EMPLOYEE: "Employee" };

/** Chart colors for statuses (paired with text labels — never color alone). */
export const STATUS_COLORS: Record<TaskStatus, string> = {
  NOT_STARTED: "#94a3b8",
  IN_PROGRESS: "#3b82f6",
  IN_REVIEW: "#a855f7",
  COMPLETED: "#10b981",
  ON_HOLD: "#f59e0b",
  CANCELLED: "#64748b",
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  LOW: "#94a3b8",
  NORMAL: "#3b82f6",
  HIGH: "#f97316",
  URGENT: "#ef4444",
};

export const AVATAR_COLORS = [
  "#4f46e5",
  "#0891b2",
  "#059669",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#db2777",
  "#475569",
];

export const TAG_COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#64748b"];

export const PAGE_SIZE = 20;

export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const ATTACHMENT_ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "text/plain": ".txt",
  "text/csv": ".csv",
  "application/zip": ".zip",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.ms-powerpoint": ".ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
};
