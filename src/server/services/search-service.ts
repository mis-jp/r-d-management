import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { openTaskWhere } from "@/server/repositories/task-repository";

const TASK_LIMIT = 6;
const PEOPLE_LIMIT = 4;

export async function quickSearch(viewer: SessionUser, rawQuery: string) {
  const q = rawQuery.trim().slice(0, 100);
  if (!q) return { tasks: [], people: [] };
  const isAdmin = viewer.role === "ADMIN";

  const match: Prisma.TaskWhereInput[] = [
    { taskKey: { contains: q } },
    { title: { contains: q } },
    { tags: { some: { name: { contains: q } } } },
  ];
  if (isAdmin) match.push({ assignee: { name: { contains: q } } });

  const visibility: Prisma.TaskWhereInput = isAdmin
    ? { isArchived: false }
    : { OR: [{ assigneeId: viewer.id, isArchived: false }, openTaskWhere()] };

  const [tasks, people] = await Promise.all([
    db.task.findMany({
      where: { AND: [visibility, { OR: match }] },
      orderBy: [{ updatedAt: "desc" }],
      take: TASK_LIMIT,
      select: {
        id: true,
        taskKey: true,
        title: true,
        status: true,
        assignee: { select: { name: true } },
      },
    }),
    isAdmin
      ? db.user.findMany({
          where: {
            OR: [{ name: { contains: q } }, { email: { contains: q } }, { jobTitle: { contains: q } }],
          },
          orderBy: [{ isActive: "desc" }, { name: "asc" }],
          take: PEOPLE_LIMIT,
          select: { id: true, name: true, email: true, jobTitle: true, avatarColor: true, isActive: true },
        })
      : Promise.resolve([]),
  ]);

  return { tasks, people };
}

export type QuickSearchResult = Awaited<ReturnType<typeof quickSearch>>;
