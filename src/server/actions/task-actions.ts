"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { TaskStatus } from "@prisma/client";
import { fromZodError, toActionError, type ActionResult, type FormState } from "@/lib/action-result";
import { getCurrentUser, type SessionUser } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { formToObject, idSchema } from "@/lib/validations/common";
import {
  assignSchema,
  commentSchema,
  createTaskSchema,
  logTimeSchema,
  reasonSchema,
  updateTaskSchema,
  workUpdateSchema,
} from "@/lib/validations/task";
import { filesFromForm } from "@/server/services/attachment-storage";
import * as tasks from "@/server/services/task-service";

async function actor(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AppError("Your session has expired. Please sign in again.", "UNAUTHORIZED");
  return user;
}

function refresh() {
  revalidatePath("/", "layout");
}

export async function createTaskAction(_prev: FormState, formData: FormData): Promise<FormState> {
  let taskKey: string;
  try {
    const user = await actor();
    const parsed = createTaskSchema.safeParse(formToObject(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    const task = await tasks.createTask(user, parsed.data, filesFromForm(formData));
    taskKey = task.taskKey;
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  redirect(`/tasks/${taskKey}?created=1`);
}

export async function updateTaskAction(_prev: FormState, formData: FormData): Promise<FormState> {
  let taskKey: string;
  try {
    const user = await actor();
    const parsed = updateTaskSchema.safeParse(formToObject(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    const task = await tasks.updateTask(user, parsed.data);
    taskKey = task.taskKey;
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  redirect(`/tasks/${taskKey}?updated=1`);
}

export async function assignTaskAction(input: { taskId: string; assigneeId: string; reason?: string }): Promise<ActionResult> {
  try {
    const user = await actor();
    const parsed = assignSchema.safeParse(input);
    if (!parsed.success) return fromZodError(parsed.error);
    await tasks.assignTask(user, parsed.data.taskId, parsed.data.assigneeId, parsed.data.reason);
    refresh();
    return { ok: true, message: "Task assigned." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function returnToOpenAction(input: { taskId: string; reason?: string }): Promise<ActionResult> {
  try {
    const user = await actor();
    const parsed = reasonSchema.safeParse(input);
    if (!parsed.success) return fromZodError(parsed.error);
    await tasks.returnTaskToOpen(user, parsed.data.taskId, parsed.data.reason);
    refresh();
    return { ok: true, message: "Task returned to OPEN." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function setArchivedAction(taskId: string, archived: boolean): Promise<ActionResult> {
  try {
    const user = await actor();
    await tasks.setArchived(user, idSchema.parse(taskId), archived === true);
    refresh();
    return { ok: true, message: archived ? "Task archived." : "Task restored." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function claimTaskAction(taskId: string): Promise<ActionResult<{ taskKey: string }>> {
  try {
    const user = await actor();
    const task = await tasks.claimTask(user, idSchema.parse(taskId));
    refresh();
    return { ok: true, message: `You claimed ${task.taskKey}.`, data: { taskKey: task.taskKey } };
  } catch (error) {
    refresh();
    return toActionError(error);
  }
}

export async function updateWorkAction(input: {
  taskId: string;
  status?: TaskStatus;
  progress?: number;
}): Promise<ActionResult> {
  try {
    const user = await actor();
    const parsed = workUpdateSchema.safeParse(input);
    if (!parsed.success) return fromZodError(parsed.error);
    await tasks.updateWork(user, parsed.data.taskId, { status: parsed.data.status, progress: parsed.data.progress });
    refresh();
    return { ok: true, message: "Task updated." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function logTimeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const user = await actor();
    const parsed = logTimeSchema.safeParse(formToObject(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    await tasks.logActualTime(user, parsed.data.taskId, parsed.data.actualMinutes);
    refresh();
    return { ok: true, message: "Time saved." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function addCommentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const user = await actor();
    const parsed = commentSchema.safeParse(formToObject(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    await tasks.addComment(user, parsed.data.taskId, parsed.data.kind, parsed.data.body);
    refresh();
    return { ok: true, message: parsed.data.kind === "PROGRESS_UPDATE" ? "Progress update posted." : "Comment added." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function uploadAttachmentsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const user = await actor();
    const taskId = idSchema.parse(formData.get("taskId"));
    const files = filesFromForm(formData);
    if (!files.length) return { ok: false, error: "Choose at least one file." };
    await tasks.addAttachments(user, taskId, files);
    refresh();
    return { ok: true, message: files.length === 1 ? "File attached." : `${files.length} files attached.` };
  } catch (error) {
    return toActionError(error);
  }
}

export async function removeAttachmentAction(attachmentId: string): Promise<ActionResult> {
  try {
    const user = await actor();
    await tasks.removeAttachment(user, idSchema.parse(attachmentId));
    refresh();
    return { ok: true, message: "Attachment removed." };
  } catch (error) {
    return toActionError(error);
  }
}
