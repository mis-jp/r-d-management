import "server-only";
import type { NotificationType } from "@prisma/client";
import { db, type TxClient } from "@/lib/db";
import { withDbRetry } from "@/lib/db-retry";

type NotifyInput = {
  recipientIds: (string | null | undefined)[];
  /** The user who caused the event never notifies themselves. */
  actorId: string;
  type: NotificationType;
  message: string;
  taskId?: string | null;
};

export async function notify(tx: TxClient, input: NotifyInput) {
  const recipients = [...new Set(input.recipientIds.filter((id): id is string => !!id && id !== input.actorId))];
  if (!recipients.length) return;
  await tx.notification.createMany({
    data: recipients.map((recipientId) => ({
      recipientId,
      type: input.type,
      message: input.message.slice(0, 500),
      taskId: input.taskId ?? null,
    })),
  });
}

export async function activeAdminIds(tx: TxClient): Promise<string[]> {
  const admins = await tx.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { id: true } });
  return admins.map((a) => a.id);
}

export function unreadCount(userId: string) {
  return withDbRetry(() =>
    db.notification.count({ where: { recipientId: userId, isRead: false } }),
  );
}

export function recentNotifications(userId: string, take = 8) {
  return withDbRetry(() =>
    db.notification.findMany({
      where: { recipientId: userId },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        type: true,
        message: true,
        isRead: true,
        createdAt: true,
        task: { select: { taskKey: true } },
      },
    }),
  );
}

export async function markRead(userId: string, notificationId: string) {
  await withDbRetry(() =>
    db.notification.updateMany({
      where: { id: notificationId, recipientId: userId },
      data: { isRead: true },
    }),
  );
}

export async function markAllRead(userId: string) {
  await withDbRetry(() =>
    db.notification.updateMany({
      where: { recipientId: userId, isRead: false },
      data: { isRead: true },
    }),
  );
}
