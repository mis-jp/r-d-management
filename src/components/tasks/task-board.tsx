import Link from "next/link";
import type { TaskStatus } from "@prisma/client";
import { STATUS_LABELS, TASK_STATUSES } from "@/lib/constants";
import type { SessionUser } from "@/lib/auth/session";
import type { TaskListItem } from "@/server/repositories/task-repository";
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
    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
      {columns.map((col) => (
        <section key={col.key} className="flex w-72 shrink-0 flex-col rounded-xl bg-slate-100/70" aria-label={`${col.label} column`}>
          <header className="flex items-center justify-between px-3 py-2.5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600">{col.label}</h2>
            <span className="rounded-full bg-surface px-2 text-xs font-medium tabular-nums text-slate-600">{col.items.length}</span>
          </header>
          <ul className="flex-1 space-y-2 px-2 pb-2">
            {col.items.length === 0 && (
              <li className="rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-xs text-slate-500">
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
  );
}

function BoardCard({ task, viewer }: { task: TaskListItem; viewer: SessionUser }) {
  const isAdmin = viewer.role === "ADMIN";
  const canUpdate = isAdmin || task.assigneeId === viewer.id;
  return (
    <article className="rounded-lg border bg-surface p-3 shadow-xs transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[11px] text-slate-500">{task.taskKey}</span>
        <PriorityBadge priority={task.priority} />
      </div>
      <Link href={`/tasks/${task.taskKey}`} className="mt-1 block text-sm font-medium leading-snug text-slate-900 hover:underline">
        {task.title}
      </Link>
      {task.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {task.tags.slice(0, 3).map((tag) => (
            <TagChip key={tag.id} name={tag.name} color={tag.color} />
          ))}
        </div>
      )}
      <div className="mt-3 flex items-center gap-2">
        <ProgressBar value={task.progress} label={`${task.taskKey} progress`} />
        <span className="text-[11px] tabular-nums text-slate-500">{task.progress}%</span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 text-xs">
        <DueDate date={task.dueDate} status={task.status} className="text-xs" />
        {task.assignee ? (
          <Avatar name={task.assignee.name} color={task.assignee.avatarColor} size="sm" />
        ) : (
          <OpenBadge />
        )}
      </div>
      {canUpdate && (
        <div className="mt-2 border-t pt-2">
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
