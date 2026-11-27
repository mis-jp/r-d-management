import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/session";
import { recentNotifications, unreadCount } from "@/server/services/notification-service";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const store = await cookies();

  // Notifications are non-critical: if Neon is briefly saturated, keep the shell up.
  let unread = 0;
  let notifications: Awaited<ReturnType<typeof recentNotifications>> = [];
  try {
    [unread, notifications] = await Promise.all([
      unreadCount(user.id),
      recentNotifications(user.id),
    ]);
  } catch (error) {
    console.error("[AppLayout] notification fetch failed:", error);
  }

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
