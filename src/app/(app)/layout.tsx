import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/session";
import { recentNotifications, unreadCount } from "@/server/services/notification-service";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [unread, notifications, store] = await Promise.all([
    unreadCount(user.id),
    recentNotifications(user.id),
    cookies(),
  ]);

  return (
    <AppShell
      user={user}
      unread={unread}
      initialCollapsed={store.get("sidebar")?.value === "collapsed"}
      notifications={notifications.map((n) => ({
        id: n.id,
        type: n.type,
        message: n.message,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
        taskKey: n.task?.taskKey ?? null,
      }))}
    >
      {children}
    </AppShell>
  );
}
