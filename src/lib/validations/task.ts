import { z } from "zod";
import { idSchema, optionalDate, optionalHoursAsMinutes, optionalString } from "./common";

const status = z.enum(["NOT_STARTED", "IN_PROGRESS", "IN_REVIEW", "COMPLETED", "ON_HOLD", "CANCELLED"]);
const priority = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);

const tagIds = z.preprocess(
  (v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]),
  z.array(idSchema).max(20, "Too many tags."),
);

const newTagNames = z.preprocess(
  (v) =>
    typeof v === "string"
      ? v
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
  z.array(z.string().max(50, "Tag names must be 50 characters or fewer.")).max(10, "Too many new tags."),
);

const taskFields = {
  title: z.string().trim().min(1, "Title is required.").max(200, "Title must be 200 characters or fewer."),
  description: optionalString(20000),
  priority,
  startDate: optionalDate,
  dueDate: optionalDate,
  estimatedMinutes: optionalHoursAsMinutes,
  "tagIds[]": tagIds,
  newTags: newTagNames,
};

const dateOrder = <T extends { startDate?: Date; dueDate?: Date }>(v: T) =>
  !v.startDate || !v.dueDate || v.startDate <= v.dueDate;
const dateOrderIssue = { message: "Due date cannot be before the start date.", path: ["dueDate"] };

export const createTaskSchema = z
  .object({
    ...taskFields,
    status: status.default("NOT_STARTED"),
    assignmentMode: z.enum(["ASSIGN", "OPEN"]),
    assigneeId: optionalString(191),
  })
  .refine(dateOrder, dateOrderIssue)
  .refine((v) => v.assignmentMode === "OPEN" || !!v.assigneeId, {
    message: "Choose an employee or publish the task as OPEN.",
    path: ["assigneeId"],
  });

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z.object({ ...taskFields, taskId: idSchema }).refine(dateOrder, dateOrderIssue);

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const workUpdateSchema = z.object({
  taskId: idSchema,
  status: status.optional(),
  progress: z.coerce.number().int().min(0).max(100).optional(),
});

export const logTimeSchema = z.object({
  taskId: idSchema,
  actualMinutes: optionalHoursAsMinutes,
});

export const assignSchema = z.object({
  taskId: idSchema,
  assigneeId: idSchema,
  reason: optionalString(500),
});

export const reasonSchema = z.object({
  taskId: idSchema,
  reason: optionalString(500),
});

export const commentSchema = z.object({
  taskId: idSchema,
  kind: z.enum(["COMMENT", "PROGRESS_UPDATE"]).default("COMMENT"),
  body: z.string().trim().min(1, "Write something first.").max(5000, "Comments must be 5000 characters or fewer."),
});

export const taskFilterSchema = z.object({
  q: z.string().max(100).optional(),
  status: status.optional(),
  priority: priority.optional(),
  assignee: z.string().max(191).optional(),
  tag: z.string().max(191).optional(),
  due: z.enum(["overdue", "today", "week", "month", "none"]).optional(),
  createdFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  createdTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  archived: z.enum(["only", "include"]).optional(),
  sort: z.enum(["due", "priority", "created", "updated", "progress", "key"]).optional(),
  dir: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).max(10000).optional(),
});

export type TaskFilters = z.infer<typeof taskFilterSchema>;

export function parseTaskFilters(params: Record<string, string | string[] | undefined>): TaskFilters {
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    const value = Array.isArray(v) ? v[0] : v;
    if (value !== undefined && value !== "") flat[k] = value;
  }
  const parsed = taskFilterSchema.safeParse(flat);
  if (parsed.success) return parsed.data;
  // Drop only the invalid keys rather than discarding every filter.
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(flat)) {
    const single = taskFilterSchema.shape[k as keyof typeof taskFilterSchema.shape];
    if (single && single.safeParse(v).success) result[k] = single.parse(v);
  }
  return result as TaskFilters;
}
