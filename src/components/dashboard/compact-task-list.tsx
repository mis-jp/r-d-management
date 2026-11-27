import Link from "next/link";
import type { TaskListItem } from "@/server/repositories/task-repository";
import { isOpenTask } from "@/lib/permissions";
import { Avatar } from "@/components/ui/misc";
import { DueDate, OpenBadge, StatusBadge } from "@/components/tasks/badges";

export function CompactTaskList({
  tasks,
  empty,
  showAssignee = true,
}: {
  tasks: TaskListItem[];
  empty: string;
  showAssignee?: boolean;
}) {
  if (!tasks.length) return <p className="px-5 py-8 text-center text-sm text-slate-500">{empty}</p>;
  return (
    <ul className="divide-y">
      {tasks.map((t) => (
        <li key={t.id} className="flex items-center gap-3 px-5 py-3">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[11px] font-medium tracking-wide text-slate-500">{t.taskKey}</p>
            <Link href={`/tasks/${t.taskKey}`} className="mt-0.5 block truncate text-sm font-semibold text-slate-900 hover:underline">
              {t.title}
            </Link>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
              <StatusBadge status={t.status} />
              <DueDate date={t.dueDate} status={t.status} />
            </div>
          </div>
          {showAssignee &&
            (t.assignee ? (
              <Avatar name={t.assignee.name} color={t.assignee.avatarColor} size="sm" />
            ) : isOpenTask(t) ? (
              <OpenBadge />
            ) : null)}
        </li>
      ))}
    </ul>
  );
}
