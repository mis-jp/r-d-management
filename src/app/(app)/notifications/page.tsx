import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { firstParam } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Pagination } from "@/components/shared/pagination";
import { ParamToggle } from "@/components/tasks/view-toggle";
import { MarkAllReadButton, NotificationRow } from "./notification-row";

export const metadata: Metadata = { title: "Notifications" };

const PAGE_SIZE = 25;

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const filter = firstParam(params.filter) === "unread" ? "unread" : "all";
  const page = Math.max(1, Number(firstParam(params.page)) || 1);
  const where = { recipientId: user.id, ...(filter === "unread" ? { isRead: false } : {}) };

  const [items, total, unread] = await Promise.all([
    db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, type: true, message: true, isRead: true, createdAt: true, task: { select: { taskKey: true } } },
    }),
    db.notification.count({ where }),
    db.notification.count({ where: { recipientId: user.id, isRead: false } }),
  ]);

  return (
    <>
      <PageHeader
        title="Notifications"
        description={unread ? `You have ${unread} unread notification${unread === 1 ? "" : "s"}.` : "You're all caught up."}
        actions={
          <>
            <ParamToggle
              label="Filter"
              name="filter"
              value={filter}
              basePath="/notifications"
              params={params}
              options={[
                { value: "all", label: "All" },
                { value: "unread", label: "Unread" },
              ]}
            />
            {unread > 0 && <MarkAllReadButton />}
          </>
        }
      />
      <Card>
        {items.length === 0 ? (
          <EmptyState
            icon={<Bell />}
            title={filter === "unread" ? "No unread notifications." : "No notifications yet."}
            description="You'll be notified about assignments, claims, comments, mentions and reviews."
          />
        ) : (
          <ul className="divide-y">
            {items.map((n) => (
              <NotificationRow
                key={n.id}
                notification={{
                  id: n.id,
                  type: n.type,
                  message: n.message,
                  isRead: n.isRead,
                  createdAt: n.createdAt.toISOString(),
                  taskKey: n.task?.taskKey ?? null,
                }}
              />
            ))}
          </ul>
        )}
        <Pagination
          page={page}
          pageCount={Math.max(1, Math.ceil(total / PAGE_SIZE))}
          total={total}
          pageSize={PAGE_SIZE}
          basePath="/notifications"
          params={params}
        />
      </Card>
    </>
  );
}
