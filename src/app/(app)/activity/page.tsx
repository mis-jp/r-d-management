import type { Metadata } from "next";
import type { ActivityAction, Prisma } from "@prisma/client";
import { History } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { resolveRange } from "@/lib/date-range";
import { firstParam } from "@/lib/utils";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Pagination } from "@/components/shared/pagination";
import { RangeSelect } from "@/components/shared/url-controls";
import { ActivityTimeline } from "@/components/tasks/activity-timeline";
import { ActivityFilters } from "./activity-filters";

export const metadata: Metadata = { title: "Activity Log" };

const PAGE_SIZE = 40;

const GROUPS: Record<string, ActivityAction[]> = {
  tasks: ["TASK_CREATED", "TASK_UPDATED", "PRIORITY_CHANGED", "DUE_DATE_CHANGED", "TASK_ARCHIVED", "TASK_UNARCHIVED"],
  assignment: ["ASSIGNEE_CHANGED", "TASK_CLAIMED", "RETURNED_TO_OPEN"],
  status: ["STATUS_CHANGED", "PROGRESS_CHANGED", "TASK_COMPLETED", "TASK_REOPENED", "TIME_LOGGED"],
  discussion: ["COMMENT_ADDED", "ATTACHMENT_ADDED", "ATTACHMENT_REMOVED"],
  users: [
    "USER_CREATED",
    "USER_UPDATED",
    "USER_ACTIVATED",
    "USER_DEACTIVATED",
    "USER_PASSWORD_RESET",
    "PROFILE_UPDATED",
    "PASSWORD_CHANGED",
  ],
};

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const range = resolveRange(firstParam(params.range), "30d");
  const group = firstParam(params.type);
  const actor = firstParam(params.actor);
  const page = Math.max(1, Number(firstParam(params.page)) || 1);

  const where: Prisma.ActivityLogWhereInput = {
    createdAt: { gte: range.start ?? undefined, lte: range.end },
    ...(group && GROUPS[group] ? { action: { in: GROUPS[group] } } : {}),
    ...(actor ? { actorId: actor } : {}),
  };

  const [entries, total, people] = await Promise.all([
    db.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        action: true,
        oldValue: true,
        newValue: true,
        createdAt: true,
        actor: { select: { id: true, name: true, avatarColor: true } },
        subjectUser: { select: { id: true, name: true } },
        task: { select: { taskKey: true, title: true } },
      },
    }),
    db.activityLog.count({ where }),
    db.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <>
      <PageHeader
        title="Activity log"
        description="An append-only audit trail of task and account changes. Entries cannot be edited or deleted."
        actions={<RangeSelect value={range.key} />}
      />
      <Card>
        <ActivityFilters people={people} />
        {entries.length === 0 ? (
          <EmptyState icon={<History />} title="No activity during this period." description="Try a longer date range or clear the filters." />
        ) : (
          <CardBody>
            <ActivityTimeline entries={entries} showTask />
          </CardBody>
        )}
        <Pagination
          page={page}
          pageCount={Math.max(1, Math.ceil(total / PAGE_SIZE))}
          total={total}
          pageSize={PAGE_SIZE}
          basePath="/activity"
          params={params}
        />
      </Card>
    </>
  );
}
