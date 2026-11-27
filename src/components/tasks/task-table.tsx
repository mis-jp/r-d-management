import Link from "next/link";
import { MessageSquare, Paperclip } from "lucide-react";
import type { TaskListItem } from "@/server/repositories/task-repository";
import { isOpenTask } from "@/lib/permissions";
import { Avatar, ProgressBar } from "@/components/ui/misc";
import { DueDate, OpenBadge, PriorityBadge, StatusBadge, TagChip } from "./badges";
import { cn } from "@/lib/utils";

type Props = {
  tasks: TaskListItem[];
  showAssignee?: boolean;
  empty?: React.ReactNode;
};

/** Compact table on desktop; stacked cards on small screens. */
export function TaskTable({ tasks, showAssignee = true, empty }: Props) {
  if (!tasks.length) return <>{empty}</>;
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50/60 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <th scope="col" className="px-4 py-2.5">Task</th>
              <th scope="col" className="px-3 py-2.5">Status</th>
              <th scope="col" className="px-3 py-2.5">Priority</th>
              {showAssignee && <th scope="col" className="px-3 py-2.5">Assignee</th>}
              <th scope="col" className="px-3 py-2.5">Due</th>
              <th scope="col" className="w-36 px-4 py-2.5">Progress</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {tasks.map((t) => (
              <tr key={t.id} className={cn("group hover:bg-slate-50/80", t.isArchived && "opacity-60")}>
                <td className="max-w-md px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 font-mono text-xs text-slate-500">{t.taskKey}</span>
                    <Link
                      href={`/tasks/${t.taskKey}`}
                      className="truncate font-medium text-slate-900 hover:text-brand-700 hover:underline"
                    >
                      {t.title}
                    </Link>
                    {t.isArchived && <span className="text-xs text-slate-500">(archived)</span>}
                  </div>
                  <TaskMeta task={t} />
                </td>
                <td className="px-3 py-3">
                  <StatusBadge status={t.status} />
                </td>
                <td className="px-3 py-3">
                  <PriorityBadge priority={t.priority} />
                </td>
                {showAssignee && (
                  <td className="px-3 py-3">
                    {t.assignee ? (
                      <span className="flex items-center gap-2">
                        <Avatar name={t.assignee.name} color={t.assignee.avatarColor} size="sm" />
                        <span className="truncate text-slate-700">{t.assignee.name}</span>
                      </span>
                    ) : isOpenTask(t) ? (
                      <OpenBadge />
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                )}
                <td className="whitespace-nowrap px-3 py-3 text-sm">
                  <DueDate date={t.dueDate} status={t.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <ProgressBar value={t.progress} label={`${t.taskKey} progress`} />
                    <span className="w-9 text-right text-xs tabular-nums text-slate-600">{t.progress}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y md:hidden">
        {tasks.map((t) => (
          <li key={t.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="font-mono text-xs text-slate-500">{t.taskKey}</span>
                <Link href={`/tasks/${t.taskKey}`} className="block font-medium text-slate-900 hover:underline">
                  {t.title}
                </Link>
              </div>
              <PriorityBadge priority={t.priority} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <StatusBadge status={t.status} />
              {showAssignee &&
                (t.assignee ? (
                  <span className="text-slate-600">{t.assignee.name}</span>
                ) : isOpenTask(t) ? (
                  <OpenBadge />
                ) : null)}
              <DueDate date={t.dueDate} status={t.status} />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <ProgressBar value={t.progress} label={`${t.taskKey} progress`} />
              <span className="text-xs tabular-nums text-slate-600">{t.progress}%</span>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function TaskMeta({ task }: { task: TaskListItem }) {
  const hasMeta = task.tags.length || task._count.comments || task._count.attachments;
  if (!hasMeta) return null;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5">
      {task.tags.slice(0, 3).map((tag) => (
        <TagChip key={tag.id} name={tag.name} color={tag.color} />
      ))}
      {task.tags.length > 3 && <span className="text-[11px] text-slate-500">+{task.tags.length - 3}</span>}
      {task._count.comments > 0 && (
        <span className="inline-flex items-center gap-0.5 text-[11px] text-slate-500">
          <MessageSquare className="size-3" aria-hidden />
          {task._count.comments}
          <span className="sr-only">comments</span>
        </span>
      )}
      {task._count.attachments > 0 && (
        <span className="inline-flex items-center gap-0.5 text-[11px] text-slate-500">
          <Paperclip className="size-3" aria-hidden />
          {task._count.attachments}
          <span className="sr-only">attachments</span>
        </span>
      )}
    </div>
  );
}
