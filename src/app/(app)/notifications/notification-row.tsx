"use client";

import Link from "next/link";
import { useTransition } from "react";
import type { NotificationType } from "@prisma/client";
import {
  AtSign,
  Bell,
  CalendarClock,
  CheckCheck,
  CheckCircle2,
  Eye,
  Hand,
  MessageSquare,
  RotateCcw,
  UserMinus,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/server/actions/notification-actions";
import { Button } from "@/components/ui/button";
import { LocalTime } from "@/components/shared/local-time";
import type { ShellNotification } from "@/components/layout/app-shell";

const ICONS: Record<NotificationType, typeof Bell> = {
  TASK_ASSIGNED: UserPlus,
  TASK_REASSIGNED: UserPlus,
  TASK_UNASSIGNED: UserMinus,
  TASK_CLAIMED: Hand,
  DUE_DATE_CHANGED: CalendarClock,
  COMMENT_ADDED: MessageSquare,
  MENTIONED: AtSign,
  TASK_SUBMITTED_FOR_REVIEW: Eye,
  TASK_COMPLETED: CheckCircle2,
  TASK_RETURNED_TO_OPEN: Hand,
  TASK_REOPENED: RotateCcw,
};

export function NotificationRow({ notification: n }: { notification: ShellNotification }) {
  const [pending, startTransition] = useTransition();
  const Icon = ICONS[n.type] ?? Bell;
  return (
    <li className={cn("flex items-start gap-3 px-5 py-4", !n.isRead && "bg-brand-50/40")}>
      <span className={cn("mt-0.5 rounded-lg p-2", n.isRead ? "bg-slate-100 text-slate-500" : "bg-brand-100 text-brand-700")}>
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm", n.isRead ? "text-slate-600" : "font-medium text-slate-900")}>
          {!n.isRead && <span className="sr-only">Unread: </span>}
          {n.message}
        </p>
        <p className="mt-0.5 text-xs text-slate-400">
          <LocalTime value={n.createdAt} />
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {n.taskKey && (
          <Button asChild variant="outline" size="sm">
            <Link
              href={`/tasks/${n.taskKey}`}
              onClick={() => {
                if (!n.isRead) void markNotificationReadAction(n.id);
              }}
            >
              Open {n.taskKey}
            </Link>
          </Button>
        )}
        {!n.isRead && (
          <Button
            variant="ghost"
            size="sm"
            loading={pending}
            onClick={() => startTransition(async () => void (await markNotificationReadAction(n.id)))}
          >
            Mark read
          </Button>
        )}
      </div>
    </li>
  );
}

export function MarkAllReadButton() {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await markAllNotificationsReadAction();
          if (res.ok) toast.success(res.message ?? "Done.");
        })
      }
    >
      <CheckCheck /> Mark all read
    </Button>
  );
}
