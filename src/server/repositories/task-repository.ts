import "server-only";
import { addDays, endOfDay, endOfMonth, endOfWeek, startOfDay } from "date-fns";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { CLOSED_STATUSES, PAGE_SIZE } from "@/lib/constants";
import type { SessionUser } from "@/lib/auth/session";
import type { TaskFilters } from "@/lib/validations/task";

export const taskListSelect = {
  id: true,
  taskKey: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  progress: true,
  dueDate: true,
  startDate: true,
  completedAt: true,
  estimatedMinutes: true,
  actualMinutes: true,
  isArchived: true,
  createdAt: true,
  updatedAt: true,
  assigneeId: true,
  assignee: { select: { id: true, name: true, avatarColor: true } },
  tags: { select: { id: true, name: true, color: true }, orderBy: { name: "asc" } },
  _count: { select: { comments: true, attachments: true } },
} satisfies Prisma.TaskSelect;

export type TaskListItem = Prisma.TaskGetPayload<{ select: typeof taskListSelect }>;

/** Which slice of tasks a page shows. Employees are always limited to `mine` or `open`. */
export type TaskScope = "all" | "mine" | "open" | "board";

export function openTaskWhere(): Prisma.TaskWhereInput {
  return { assigneeId: null, isArchived: false, status: { notIn: CLOSED_STATUSES } };
}

export function overdueWhere(now = new Date()): Prisma.TaskWhereInput {
  return { dueDate: { lt: startOfDay(now) }, status: { notIn: CLOSED_STATUSES }, isArchived: false };
}

export function buildTaskWhere(viewer: SessionUser, scope: TaskScope, filters: TaskFilters): Prisma.TaskWhereInput {
  const isAdmin = viewer.role === "ADMIN";
  const and: Prisma.TaskWhereInput[] = [];

  if (scope === "open") {
    and.push(openTaskWhere());
  } else if (scope === "mine" || !isAdmin) {
    and.push({ assigneeId: viewer.id });
  }

  if (isAdmin && filters.archived === "only") and.push({ isArchived: true });
  else if (!(isAdmin && filters.archived === "include")) and.push({ isArchived: false });

  if (filters.q) {
    const q = filters.q.trim();
    const or: Prisma.TaskWhereInput[] = [
      { taskKey: { contains: q } },
      { title: { contains: q } },
      { tags: { some: { name: { contains: q } } } },
    ];
    if (isAdmin) or.push({ assignee: { name: { contains: q } } });
    and.push({ OR: or });
  }
  if (filters.status) and.push({ status: filters.status });
  if (filters.priority) and.push({ priority: filters.priority });
  if (filters.tag) and.push({ tags: { some: { id: filters.tag } } });

  if (isAdmin && filters.assignee && scope !== "open") {
    and.push(filters.assignee === "open" ? { assigneeId: null } : { assigneeId: filters.assignee });
  }

  const now = new Date();
  switch (filters.due) {
    case "overdue":
      and.push(overdueWhere(now));
      break;
    case "today":
      and.push({ dueDate: { gte: startOfDay(now), lte: endOfDay(now) } });
      break;
    case "week":
      and.push({ dueDate: { gte: startOfDay(now), lte: endOfWeek(now, { weekStartsOn: 1 }) } });
      break;
    case "month":
      and.push({ dueDate: { gte: startOfDay(now), lte: endOfMonth(now) } });
      break;
    case "none":
      and.push({ dueDate: null });
      break;
  }

  if (filters.createdFrom) and.push({ createdAt: { gte: new Date(`${filters.createdFrom}T00:00:00`) } });
  if (filters.createdTo) and.push({ createdAt: { lte: new Date(`${filters.createdTo}T23:59:59.999`) } });

  return { AND: and };
}

export function buildTaskOrder(filters: TaskFilters): Prisma.TaskOrderByWithRelationInput[] {
  const dir = filters.dir ?? (filters.sort === "due" || filters.sort === "key" ? "asc" : "desc");
  switch (filters.sort) {
    case "due":
      return [{ dueDate: { sort: dir, nulls: "last" } }, { priority: "desc" }];
    case "priority":
      return [{ priority: dir }, { dueDate: { sort: "asc", nulls: "last" } }];
    case "created":
      return [{ createdAt: dir }];
    case "progress":
      return [{ progress: dir }, { updatedAt: "desc" }];
    case "key":
      return [{ createdAt: dir }];
    case "updated":
    default:
      return [{ updatedAt: dir }];
  }
}

export async function listTasks(viewer: SessionUser, scope: TaskScope, filters: TaskFilters, pageSize = PAGE_SIZE) {
  const where = buildTaskWhere(viewer, scope, filters);
  const page = filters.page ?? 1;
  const [items, total] = await Promise.all([
    db.task.findMany({
      where,
      orderBy: buildTaskOrder(filters),
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: taskListSelect,
    }),
    db.task.count({ where }),
  ]);
  return { items, total, page, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

/** Unpaginated variant for board and calendar views (capped to keep pages responsive). */
export function listTasksForView(
  viewer: SessionUser,
  scope: TaskScope,
  filters: TaskFilters,
  extra?: Prisma.TaskWhereInput,
  take = 500,
) {
  const where = buildTaskWhere(viewer, scope, filters);
  return db.task.findMany({
    where: extra ? { AND: [where, extra] } : where,
    orderBy: buildTaskOrder(filters),
    take,
    select: taskListSelect,
  });
}

export function tasksDueBetween(viewer: SessionUser, start: Date, end: Date, includeOpen: boolean) {
  const visibility: Prisma.TaskWhereInput =
    viewer.role === "ADMIN"
      ? {}
      : includeOpen
        ? { OR: [{ assigneeId: viewer.id }, openTaskWhere()] }
        : { assigneeId: viewer.id };
  return db.task.findMany({
    where: { AND: [visibility, { isArchived: false, dueDate: { gte: start, lte: end } }] },
    orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
    select: taskListSelect,
  });
}

export function dueSoonWhere(days = 7, now = new Date()): Prisma.TaskWhereInput {
  return {
    dueDate: { gte: startOfDay(now), lte: endOfDay(addDays(now, days)) },
    status: { notIn: CLOSED_STATUSES },
    isArchived: false,
  };
}

export const taskDetailInclude = {
  assignee: { select: { id: true, name: true, email: true, avatarColor: true, jobTitle: true } },
  createdBy: { select: { id: true, name: true, avatarColor: true } },
  tags: { select: { id: true, name: true, color: true }, orderBy: { name: "asc" } },
  comments: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      kind: true,
      body: true,
      createdAt: true,
      author: { select: { id: true, name: true, avatarColor: true, role: true } },
    },
  },
  activities: {
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      action: true,
      oldValue: true,
      newValue: true,
      createdAt: true,
      actor: { select: { id: true, name: true, avatarColor: true } },
      subjectUser: { select: { id: true, name: true } },
    },
  },
  attachments: {
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fileName: true,
      mimeType: true,
      sizeBytes: true,
      createdAt: true,
      uploadedBy: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.TaskInclude;

export type TaskDetail = Prisma.TaskGetPayload<{ include: typeof taskDetailInclude }>;

export function getTaskByKey(taskKey: string) {
  return db.task.findUnique({ where: { taskKey }, include: taskDetailInclude });
}

export function listTags() {
  return db.tag.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, color: true, _count: { select: { tasks: true } } },
  });
}
