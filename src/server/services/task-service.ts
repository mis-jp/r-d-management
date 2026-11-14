import "server-only";
import type { TaskStatus } from "@prisma/client";
import { db, type TxClient } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { CLOSED_STATUSES, EMPLOYEE_STATUSES, STATUS_LABELS, TAG_COLORS } from "@/lib/constants";
import { conflict, forbidden, invalid, notFound } from "@/lib/errors";
import { canComment, canUpdateWork, canViewTask } from "@/lib/permissions";
import { resolveWorkState } from "@/lib/task-rules";
import { formatDate } from "@/lib/utils";
import type { CreateTaskInput, UpdateTaskInput } from "@/lib/validations/task";
import { getTaskByKey } from "@/server/repositories/task-repository";
import { logActivities, logActivity } from "./activity-service";
import { activeAdminIds, notify } from "./notification-service";
import { deleteUpload, saveUpload, validateUpload } from "./attachment-storage";

function requireAdmin(actor: SessionUser) {
  if (actor.role !== "ADMIN") throw forbidden("Only admins can do that.");
}

/**
 * Concurrency-safe key generation: `INSERT … ON DUPLICATE KEY UPDATE` takes a row lock that is
 * held until the surrounding transaction commits, so two creators can never read the same value.
 */
async function nextTaskKey(tx: TxClient): Promise<string> {
  await tx.$executeRaw`INSERT INTO \`Sequence\` (\`name\`, \`value\`) VALUES ('task', 1) ON DUPLICATE KEY UPDATE \`value\` = \`value\` + 1`;
  const row = await tx.sequence.findUniqueOrThrow({ where: { name: "task" } });
  return `RD-${String(row.value).padStart(3, "0")}`;
}

async function resolveTags(tx: TxClient, tagIds: string[], newTags: string[]) {
  const ids = new Set<string>();
  if (tagIds.length) {
    const existing = await tx.tag.findMany({ where: { id: { in: tagIds } }, select: { id: true } });
    existing.forEach((t) => ids.add(t.id));
  }
  for (const [i, name] of newTags.entries()) {
    const tag = await tx.tag.upsert({
      where: { name },
      update: {},
      create: { name, color: TAG_COLORS[i % TAG_COLORS.length] },
      select: { id: true },
    });
    ids.add(tag.id);
  }
  return [...ids].map((id) => ({ id }));
}

async function requireActiveEmployee(tx: TxClient, userId: string) {
  const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true, name: true, role: true, isActive: true } });
  if (!user || !user.isActive) throw invalid("The selected employee is not active.");
  if (user.role !== "EMPLOYEE") throw invalid("Tasks can only be assigned to employees.");
  return user;
}

async function loadTask(tx: TxClient, taskId: string) {
  const task = await tx.task.findUnique({
    where: { id: taskId },
    include: { assignee: { select: { id: true, name: true } } },
  });
  if (!task) throw notFound("Task not found.");
  return task;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** Returns the task only if the viewer may see it; otherwise `null` (don't reveal existence). */
export async function getTaskForViewer(viewer: SessionUser, taskKey: string) {
  const task = await getTaskByKey(taskKey);
  if (!task || !canViewTask(viewer, task)) return null;
  return task;
}

// ---------------------------------------------------------------------------
// Admin task management
// ---------------------------------------------------------------------------

export async function createTask(actor: SessionUser, input: CreateTaskInput, files: File[] = []) {
  requireAdmin(actor);
  files.forEach(validateUpload);

  const task = await db.$transaction(async (tx) => {
    const assignee =
      input.assignmentMode === "ASSIGN" && input.assigneeId ? await requireActiveEmployee(tx, input.assigneeId) : null;
    const taskKey = await nextTaskKey(tx);
    const tags = await resolveTags(tx, input["tagIds[]"], input.newTags);
    const work = resolveWorkState(
      { status: "NOT_STARTED", progress: 0, completedAt: null },
      { status: input.status },
    );

    const created = await tx.task.create({
      data: {
        taskKey,
        title: input.title,
        description: input.description ?? null,
        priority: input.priority,
        status: work.status,
        progress: work.progress,
        completedAt: work.completedAt,
        startDate: input.startDate ?? null,
        dueDate: input.dueDate ?? null,
        estimatedMinutes: input.estimatedMinutes ?? null,
        assigneeId: assignee?.id ?? null,
        createdById: actor.id,
        tags: { connect: tags },
      },
      select: { id: true, taskKey: true, title: true },
    });

    await logActivity(tx, {
      actorId: actor.id,
      taskId: created.id,
      action: "TASK_CREATED",
      newValue: {
        title: created.title,
        assignee: assignee ? { id: assignee.id, name: assignee.name } : null,
        mode: input.assignmentMode,
      },
    });
    if (assignee) {
      await notify(tx, {
        recipientIds: [assignee.id],
        actorId: actor.id,
        type: "TASK_ASSIGNED",
        taskId: created.id,
        message: `${actor.name} assigned you ${created.taskKey}: ${created.title}`,
      });
    }
    return created;
  });

  if (files.length) await addAttachments(actor, task.id, files);
  return task;
}

export async function updateTask(actor: SessionUser, input: UpdateTaskInput) {
  requireAdmin(actor);
  return db.$transaction(async (tx) => {
    const task = await tx.task.findUnique({
      where: { id: input.taskId },
      include: { tags: { select: { id: true, name: true } } },
    });
    if (!task) throw notFound("Task not found.");

    const tags = await resolveTags(tx, input["tagIds[]"], input.newTags);
    const updated = await tx.task.update({
      where: { id: task.id },
      data: {
        title: input.title,
        description: input.description ?? null,
        priority: input.priority,
        startDate: input.startDate ?? null,
        dueDate: input.dueDate ?? null,
        estimatedMinutes: input.estimatedMinutes ?? null,
        tags: { set: tags },
      },
      include: { tags: { select: { name: true } } },
    });

    const changed: string[] = [];
    if (task.title !== updated.title) changed.push("title");
    if ((task.description ?? "") !== (updated.description ?? "")) changed.push("description");
    if (task.startDate?.getTime() !== updated.startDate?.getTime()) changed.push("start date");
    if (task.estimatedMinutes !== updated.estimatedMinutes) changed.push("estimate");
    const oldTags = task.tags.map((t) => t.name).sort().join(",");
    const newTags = updated.tags.map((t) => t.name).sort().join(",");
    if (oldTags !== newTags) changed.push("tags");

    const entries: Parameters<typeof logActivities>[1] = [];
    if (changed.length) {
      entries.push({ actorId: actor.id, taskId: task.id, action: "TASK_UPDATED", newValue: { fields: changed } });
    }
    if (task.priority !== updated.priority) {
      entries.push({
        actorId: actor.id,
        taskId: task.id,
        action: "PRIORITY_CHANGED",
        oldValue: { priority: task.priority },
        newValue: { priority: updated.priority },
      });
    }
    const dueChanged = task.dueDate?.getTime() !== updated.dueDate?.getTime();
    if (dueChanged) {
      entries.push({
        actorId: actor.id,
        taskId: task.id,
        action: "DUE_DATE_CHANGED",
        oldValue: { dueDate: task.dueDate?.toISOString() ?? null },
        newValue: { dueDate: updated.dueDate?.toISOString() ?? null },
      });
    }
    await logActivities(tx, entries);

    if (dueChanged && task.assigneeId) {
      await notify(tx, {
        recipientIds: [task.assigneeId],
        actorId: actor.id,
        type: "DUE_DATE_CHANGED",
        taskId: task.id,
        message: `Due date for ${task.taskKey} changed to ${formatDate(updated.dueDate)}.`,
      });
    }
    return updated;
  });
}

export async function assignTask(actor: SessionUser, taskId: string, assigneeId: string, reason?: string) {
  requireAdmin(actor);
  return db.$transaction(async (tx) => {
    const task = await loadTask(tx, taskId);
    if (task.isArchived) throw invalid("Unarchive the task before assigning it.");
    if (task.assigneeId === assigneeId) throw invalid("The task is already assigned to that employee.");
    const assignee = await requireActiveEmployee(tx, assigneeId);

    await tx.task.update({ where: { id: task.id }, data: { assigneeId: assignee.id, claimedAt: null } });
    await logActivity(tx, {
      actorId: actor.id,
      taskId: task.id,
      action: "ASSIGNEE_CHANGED",
      subjectUserId: assignee.id,
      oldValue: { assignee: task.assignee },
      newValue: { assignee: { id: assignee.id, name: assignee.name }, reason: reason ?? null },
    });
    await notify(tx, {
      recipientIds: [assignee.id],
      actorId: actor.id,
      type: task.assigneeId ? "TASK_REASSIGNED" : "TASK_ASSIGNED",
      taskId: task.id,
      message: `${actor.name} assigned you ${task.taskKey}: ${task.title}`,
    });
    if (task.assigneeId) {
      await notify(tx, {
        recipientIds: [task.assigneeId],
        actorId: actor.id,
        type: "TASK_UNASSIGNED",
        taskId: task.id,
        message: `${task.taskKey} was reassigned to ${assignee.name}${reason ? ` — ${reason}` : ""}.`,
      });
    }
  });
}

export async function returnTaskToOpen(actor: SessionUser, taskId: string, reason?: string) {
  requireAdmin(actor);
  return db.$transaction(async (tx) => {
    const task = await loadTask(tx, taskId);
    if (task.isArchived) throw invalid("Unarchive the task first.");
    if (!task.assigneeId) throw invalid("This task is already OPEN.");
    if (CLOSED_STATUSES.includes(task.status)) {
      throw invalid("Completed or cancelled tasks must be reopened before returning them to OPEN.");
    }

    await tx.task.update({ where: { id: task.id }, data: { assigneeId: null, claimedAt: null } });
    await logActivity(tx, {
      actorId: actor.id,
      taskId: task.id,
      action: "RETURNED_TO_OPEN",
      oldValue: { assignee: task.assignee },
      newValue: { reason: reason ?? null },
    });
    await notify(tx, {
      recipientIds: [task.assigneeId],
      actorId: actor.id,
      type: "TASK_RETURNED_TO_OPEN",
      taskId: task.id,
      message: `${task.taskKey} was returned to OPEN${reason ? ` — ${reason}` : ""}.`,
    });
  });
}

export async function setArchived(actor: SessionUser, taskId: string, archived: boolean) {
  requireAdmin(actor);
  return db.$transaction(async (tx) => {
    const task = await loadTask(tx, taskId);
    if (task.isArchived === archived) return;
    await tx.task.update({ where: { id: task.id }, data: { isArchived: archived } });
    await logActivity(tx, {
      actorId: actor.id,
      taskId: task.id,
      action: archived ? "TASK_ARCHIVED" : "TASK_UNARCHIVED",
    });
  });
}

// ---------------------------------------------------------------------------
// Employee workflow
// ---------------------------------------------------------------------------

/**
 * Atomic claim: the conditional UPDATE only matches while the task is still OPEN. InnoDB re-checks
 * the WHERE clause under a row lock, so when two employees race, exactly one update affects a row.
 */
export async function claimTask(actor: SessionUser, taskId: string) {
  if (actor.role !== "EMPLOYEE") throw forbidden("Admins assign tasks instead of claiming them.");

  return db.$transaction(async (tx) => {
    const now = new Date();
    const result = await tx.task.updateMany({
      where: { id: taskId, assigneeId: null, isArchived: false, status: { notIn: CLOSED_STATUSES } },
      data: { assigneeId: actor.id, claimedAt: now },
    });
    if (result.count !== 1) {
      const exists = await tx.task.findUnique({ where: { id: taskId }, select: { id: true } });
      if (!exists) throw notFound("Task not found.");
      throw conflict("Sorry — this task was just claimed by someone else or is no longer OPEN.");
    }

    const task = await tx.task.findUniqueOrThrow({
      where: { id: taskId },
      select: { id: true, taskKey: true, title: true, createdById: true },
    });
    await logActivity(tx, {
      actorId: actor.id,
      taskId: task.id,
      action: "TASK_CLAIMED",
      subjectUserId: actor.id,
      newValue: { assignee: { id: actor.id, name: actor.name } },
    });
    await notify(tx, {
      recipientIds: [...(await activeAdminIds(tx)), task.createdById],
      actorId: actor.id,
      type: "TASK_CLAIMED",
      taskId: task.id,
      message: `${actor.name} claimed ${task.taskKey}: ${task.title}`,
    });
    return task;
  });
}

export async function updateWork(
  actor: SessionUser,
  taskId: string,
  change: { status?: TaskStatus; progress?: number },
) {
  return db.$transaction(async (tx) => {
    const task = await loadTask(tx, taskId);
    if (!canUpdateWork(actor, task)) throw forbidden("Only the assignee or an admin can update this task.");
    if (task.isArchived) throw invalid("Archived tasks cannot be updated.");

    const isAdmin = actor.role === "ADMIN";
    if (!isAdmin) {
      if (CLOSED_STATUSES.includes(task.status)) {
        throw forbidden("This task is closed. Ask an admin to reopen it.");
      }
      if (change.status && !EMPLOYEE_STATUSES.includes(change.status)) {
        throw forbidden("Only admins can cancel tasks.");
      }
    }
    const next = resolveWorkState(
      { status: task.status, progress: task.progress, completedAt: task.completedAt },
      change,
    );
    if (next.status === task.status && next.progress === task.progress) return task;

    await tx.task.update({
      where: { id: task.id },
      data: { status: next.status, progress: next.progress, completedAt: next.completedAt },
    });

    const entries: Parameters<typeof logActivities>[1] = [];
    if (next.status !== task.status) {
      const action =
        next.status === "COMPLETED" ? "TASK_COMPLETED" : task.status === "COMPLETED" ? "TASK_REOPENED" : "STATUS_CHANGED";
      entries.push({
        actorId: actor.id,
        taskId: task.id,
        action,
        oldValue: { status: task.status },
        newValue: { status: next.status },
      });
    }
    if (next.progress !== task.progress) {
      entries.push({
        actorId: actor.id,
        taskId: task.id,
        action: "PROGRESS_CHANGED",
        oldValue: { progress: task.progress },
        newValue: { progress: next.progress },
      });
    }
    await logActivities(tx, entries);

    if (next.status !== task.status) {
      const label = `${task.taskKey}: ${task.title}`;
      if (!isAdmin && next.status === "IN_REVIEW") {
        await notify(tx, {
          recipientIds: [...(await activeAdminIds(tx)), task.createdById],
          actorId: actor.id,
          type: "TASK_SUBMITTED_FOR_REVIEW",
          taskId: task.id,
          message: `${actor.name} submitted ${label} for review.`,
        });
      } else if (!isAdmin && next.status === "COMPLETED") {
        await notify(tx, {
          recipientIds: [...(await activeAdminIds(tx)), task.createdById],
          actorId: actor.id,
          type: "TASK_COMPLETED",
          taskId: task.id,
          message: `${actor.name} completed ${label}.`,
        });
      } else if (isAdmin && task.assigneeId) {
        const reopened = task.status === "COMPLETED" || task.status === "IN_REVIEW";
        await notify(tx, {
          recipientIds: [task.assigneeId],
          actorId: actor.id,
          type: reopened && next.status !== "COMPLETED" ? "TASK_REOPENED" : "TASK_COMPLETED",
          taskId: task.id,
          message: `${actor.name} moved ${label} to ${STATUS_LABELS[next.status]}.`,
        });
      }
    }
    return task;
  });
}

export async function logActualTime(actor: SessionUser, taskId: string, actualMinutes: number | undefined) {
  return db.$transaction(async (tx) => {
    const task = await loadTask(tx, taskId);
    if (!canUpdateWork(actor, task)) throw forbidden("Only the assignee or an admin can log time on this task.");
    const value = actualMinutes ?? null;
    if (task.actualMinutes === value) return;
    await tx.task.update({ where: { id: task.id }, data: { actualMinutes: value } });
    await logActivity(tx, {
      actorId: actor.id,
      taskId: task.id,
      action: "TIME_LOGGED",
      oldValue: { actualMinutes: task.actualMinutes },
      newValue: { actualMinutes: value },
    });
  });
}

// ---------------------------------------------------------------------------
// Comments and attachments
// ---------------------------------------------------------------------------

const MENTION_PATTERN = /@([a-z0-9._-]+)/gi;

export async function addComment(
  actor: SessionUser,
  taskId: string,
  kind: "COMMENT" | "PROGRESS_UPDATE",
  body: string,
) {
  return db.$transaction(async (tx) => {
    const task = await loadTask(tx, taskId);
    if (!canComment(actor, task)) throw forbidden("Only the assignee or an admin can comment on this task.");

    const comment = await tx.comment.create({
      data: { taskId: task.id, authorId: actor.id, kind, body },
      select: { id: true },
    });
    await logActivity(tx, {
      actorId: actor.id,
      taskId: task.id,
      action: "COMMENT_ADDED",
      newValue: { commentId: comment.id, kind },
    });

    // Mentions use the email handle (the part before "@"), e.g. "@maria.santos".
    const handles = [...new Set([...body.matchAll(MENTION_PATTERN)].map((m) => m[1]!.toLowerCase()))];
    let mentioned: string[] = [];
    if (handles.length) {
      const users = await tx.user.findMany({
        where: { isActive: true, OR: handles.map((h) => ({ email: { startsWith: `${h}@` } })) },
        select: { id: true, role: true },
      });
      mentioned = users
        .filter((u) => canViewTask({ id: u.id, role: u.role }, task))
        .map((u) => u.id);
      await notify(tx, {
        recipientIds: mentioned,
        actorId: actor.id,
        type: "MENTIONED",
        taskId: task.id,
        message: `${actor.name} mentioned you on ${task.taskKey}: ${task.title}`,
      });
    }

    const watchers = [task.assigneeId, task.createdById].filter((id) => id && !mentioned.includes(id));
    await notify(tx, {
      recipientIds: watchers,
      actorId: actor.id,
      type: "COMMENT_ADDED",
      taskId: task.id,
      message: `${actor.name} ${kind === "PROGRESS_UPDATE" ? "posted a progress update" : "commented"} on ${task.taskKey}.`,
    });
  });
}

export async function addAttachments(actor: SessionUser, taskId: string, files: File[]) {
  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) throw notFound("Task not found.");
  if (!canUpdateWork(actor, task)) throw forbidden("Only the assignee or an admin can add attachments.");
  files.forEach(validateUpload);

  const saved: Awaited<ReturnType<typeof saveUpload>>[] = [];
  try {
    for (const file of files) saved.push(await saveUpload(file));
    await db.$transaction(async (tx) => {
      await tx.attachment.createMany({
        data: saved.map((s) => ({ ...s, taskId: task.id, uploadedById: actor.id })),
      });
      await logActivities(
        tx,
        saved.map((s) => ({
          actorId: actor.id,
          taskId: task.id,
          action: "ATTACHMENT_ADDED" as const,
          newValue: { fileName: s.fileName },
        })),
      );
    });
  } catch (error) {
    await Promise.all(saved.map((s) => deleteUpload(s.storageKey)));
    throw error;
  }
}

export async function removeAttachment(actor: SessionUser, attachmentId: string) {
  const attachment = await db.attachment.findUnique({ where: { id: attachmentId }, include: { task: true } });
  if (!attachment) throw notFound("Attachment not found.");
  const allowed =
    actor.role === "ADMIN" || (attachment.uploadedById === actor.id && canUpdateWork(actor, attachment.task));
  if (!allowed) throw forbidden("You can only remove attachments you uploaded.");

  await db.$transaction(async (tx) => {
    await tx.attachment.delete({ where: { id: attachment.id } });
    await logActivity(tx, {
      actorId: actor.id,
      taskId: attachment.taskId,
      action: "ATTACHMENT_REMOVED",
      oldValue: { fileName: attachment.fileName },
    });
  });
  await deleteUpload(attachment.storageKey);
  return attachment.task.taskKey;
}

/** Used by the download route: returns attachment metadata only when the viewer may see the task. */
export async function getAttachmentForViewer(viewer: SessionUser, attachmentId: string) {
  const attachment = await db.attachment.findUnique({
    where: { id: attachmentId },
    include: { task: { select: { assigneeId: true, status: true, isArchived: true } } },
  });
  if (!attachment || !canViewTask(viewer, attachment.task)) return null;
  return attachment;
}
