import Link from "next/link";
import type { TaskStatus } from "@prisma/client";
import { CalendarDays } from "lucide-react";
import { STATUS_LABELS, TASK_STATUSES } from "@/lib/constants";
import type { SessionUser } from "@/lib/auth/session";
import type { TaskListItem } from "@/server/repositories/task-repository";
import { cn } from "@/lib/utils";
import { DragScroll } from "@/components/ui/drag-scroll";
import { Avatar, ProgressBar } from "@/components/ui/misc";
import { DueDate, OpenBadge, PriorityBadge, TagChip } from "./badges";
import { StatusMenu } from "./status-menu";

type Props = {
  tasks: TaskListItem[];
  viewer: SessionUser;
  groupBy?: "status" | "priority";
  hideCancelled?: boolean;
};

const PRIORITY_COLUMNS = ["URGENT", "HIGH", "NORMAL", "LOW"] as const;

/** Kanban-style board. Status changes go through a menu (no drag-and-drop) with server-side checks. */
export function TaskBoard({ tasks, viewer, groupBy = "status", hideCancelled = true }: Props) {
  const columns =
    groupBy === "status"
      ? TASK_STATUSES.filter((s) => !(hideCancelled && s === "CANCELLED")).map((s) => ({
          key: s,
          label: STATUS_LABELS[s],
          items: tasks.filter((t) => t.status === s),
        }))
      : PRIORITY_COLUMNS.map((p) => ({
          key: p,
          label: p.charAt(0) + p.slice(1).toLowerCase(),
          items: tasks.filter((t) => t.priority === p),
        }));

  return (
    <DragScroll>
      <div className="flex w-max min-w-full gap-4">
        {columns.map((col) => (
          <section
            key={col.key}
            className="flex w-[18.5rem] shrink-0 flex-col rounded-2xl bg-slate-100/70"
            aria-label={`${col.label} column`}
          >
            <header className="flex items-center justify-between gap-2 px-3.5 pb-2 pt-3">
              <h2 className="truncate text-xs font-semibold uppercase tracking-wide text-slate-600">
                {col.label}
              </h2>
              <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium tabular-nums text-slate-500">
                {col.items.length}
              </span>
            </header>
            <ul className="flex-1 space-y-2.5 px-2.5 pb-3">
              {col.items.length === 0 && (
                <li className="rounded-xl border border-dashed border-slate-300 px-3 py-8 text-center text-xs text-slate-500">
                  No tasks
                </li>
              )}
              {col.items.map((t) => (
                <li key={t.id}>
                  <BoardCard task={t} viewer={viewer} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </DragScroll>
  );
}

function BoardCard({ task, viewer }: { task: TaskListItem; viewer: SessionUser }) {
  const isAdmin = viewer.role === "ADMIN";
  const canUpdate = isAdmin || task.assigneeId === viewer.id;

  return (
    <article
      className={cn(
        "rounded-xl border border-slate-200/80 bg-surface p-3.5",
        "shadow-xs transition-[box-shadow,border-color] duration-150",
        "hover:border-slate-300 hover:shadow-sm",
        "focus-within:border-brand-300 focus-within:ring-2 focus-within:ring-brand-500/15",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] text-slate-400">{task.taskKey}</span>
        <PriorityBadge priority={task.priority} className="shrink-0" />
      </div>

      <Link
        href={`/tasks/${task.taskKey}`}
        className="mt-1.5 block text-sm font-medium leading-snug text-slate-900 hover:text-brand-700"
      >
        <span className="line-clamp-2">{task.title}</span>
      </Link>

      {task.tags.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1">
          {task.tags.slice(0, 3).map((tag) => (
            <TagChip key={tag.id} name={tag.name} color={tag.color} />
          ))}
          {task.tags.length > 3 && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
              +{task.tags.length - 3}
            </span>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <ProgressBar value={task.progress} label={`${task.taskKey} progress`} />
        <span className="shrink-0 text-[11px] tabular-nums text-slate-500">{task.progress}%</span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
        <div className="flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
          <CalendarDays className="size-3.5 shrink-0 text-slate-400" aria-hidden />
          <DueDate date={task.dueDate} status={task.status} className="truncate text-xs" />
        </div>
        {task.assignee ? (
          <div className="flex max-w-[46%] items-center gap-1.5" title={task.assignee.name}>
            <Avatar name={task.assignee.name} color={task.assignee.avatarColor} size="sm" />
            <span className="truncate text-[11px] font-medium text-slate-600">
              {task.assignee.name.split(" ")[0]}
            </span>
          </div>
        ) : (
          <OpenBadge />
        )}
      </div>

      {canUpdate && (
        <div className="mt-2.5">
          <StatusMenu
            taskId={task.id}
            taskKey={task.taskKey}
            title={task.title}
            status={task.status as TaskStatus}
            isAdmin={isAdmin}
          />
        </div>
      )}
    </article>
  );
}
