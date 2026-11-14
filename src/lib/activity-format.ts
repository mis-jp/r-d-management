import type { ActivityAction, Prisma, Priority, TaskStatus } from "@prisma/client";
import { PRIORITY_LABELS, STATUS_LABELS } from "./constants";
import { formatDate, formatMinutes } from "./utils";

type Json = Prisma.JsonValue;

function field(value: Json | null | undefined, key: string): Json | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) return (value as Prisma.JsonObject)[key];
  return undefined;
}

function str(value: Json | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function personName(value: Json | undefined): string {
  return str(field(value ?? null, "name")) ?? "nobody";
}

export type ActivityEntry = {
  action: ActivityAction;
  oldValue: Json | null;
  newValue: Json | null;
  subjectUser?: { name: string } | null;
};

/** Human-readable description of an activity entry (without the actor's name). */
export function describeActivity(entry: ActivityEntry): string {
  const { action, oldValue, newValue } = entry;
  switch (action) {
    case "TASK_CREATED": {
      const assignee = field(newValue, "assignee");
      return assignee ? `created the task and assigned it to ${personName(assignee)}` : "created the task as OPEN";
    }
    case "TASK_UPDATED": {
      const fields = field(newValue, "fields");
      return Array.isArray(fields) && fields.length ? `edited ${fields.join(", ")}` : "edited the task";
    }
    case "ASSIGNEE_CHANGED": {
      const reason = str(field(newValue, "reason"));
      const from = field(oldValue, "assignee");
      const to = personName(field(newValue, "assignee"));
      const base = from ? `reassigned from ${personName(from)} to ${to}` : `assigned the task to ${to}`;
      return reason ? `${base} — “${reason}”` : base;
    }
    case "TASK_CLAIMED":
      return "claimed this OPEN task";
    case "RETURNED_TO_OPEN": {
      const reason = str(field(newValue, "reason"));
      const base = `returned the task to OPEN (was ${personName(field(oldValue, "assignee"))})`;
      return reason ? `${base} — “${reason}”` : base;
    }
    case "STATUS_CHANGED":
    case "TASK_COMPLETED":
    case "TASK_REOPENED": {
      const from = str(field(oldValue, "status")) as TaskStatus | undefined;
      const to = str(field(newValue, "status")) as TaskStatus | undefined;
      const verb = action === "TASK_COMPLETED" ? "completed the task" : action === "TASK_REOPENED" ? "reopened the task" : "changed status";
      return from && to ? `${verb}: ${STATUS_LABELS[from]} → ${STATUS_LABELS[to]}` : verb;
    }
    case "PROGRESS_CHANGED":
      return `updated progress: ${field(oldValue, "progress") ?? 0}% → ${field(newValue, "progress") ?? 0}%`;
    case "PRIORITY_CHANGED": {
      const from = str(field(oldValue, "priority")) as Priority | undefined;
      const to = str(field(newValue, "priority")) as Priority | undefined;
      return from && to ? `changed priority: ${PRIORITY_LABELS[from]} → ${PRIORITY_LABELS[to]}` : "changed priority";
    }
    case "DUE_DATE_CHANGED":
      return `changed due date: ${formatDate(str(field(oldValue, "dueDate")))} → ${formatDate(str(field(newValue, "dueDate")))}`;
    case "TASK_ARCHIVED":
      return "archived the task";
    case "TASK_UNARCHIVED":
      return "restored the task from the archive";
    case "COMMENT_ADDED":
      return str(field(newValue, "kind")) === "PROGRESS_UPDATE" ? "posted a progress update" : "added a comment";
    case "ATTACHMENT_ADDED":
      return `attached ${str(field(newValue, "fileName")) ?? "a file"}`;
    case "ATTACHMENT_REMOVED":
      return `removed attachment ${str(field(oldValue, "fileName")) ?? ""}`.trim();
    case "TIME_LOGGED": {
      const minutes = field(newValue, "actualMinutes");
      return `logged actual time: ${formatMinutes(typeof minutes === "number" ? minutes : null)}`;
    }
    case "USER_CREATED":
      return `added user ${entry.subjectUser?.name ?? ""}`.trim();
    case "USER_UPDATED":
      return `updated the account of ${entry.subjectUser?.name ?? "a user"}`;
    case "USER_ACTIVATED":
      return `activated ${entry.subjectUser?.name ?? "a user"}`;
    case "USER_DEACTIVATED":
      return `deactivated ${entry.subjectUser?.name ?? "a user"}`;
    case "USER_PASSWORD_RESET":
      return `reset the password of ${entry.subjectUser?.name ?? "a user"}`;
    case "PROFILE_UPDATED":
      return "updated their profile";
    case "PASSWORD_CHANGED":
      return "changed their password";
  }
}
