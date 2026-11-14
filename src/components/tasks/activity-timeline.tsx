import Link from "next/link";
import type { ActivityAction, Prisma } from "@prisma/client";
import { describeActivity } from "@/lib/activity-format";
import { Avatar } from "@/components/ui/misc";
import { LocalTime } from "@/components/shared/local-time";

export type TimelineEntry = {
  id: string;
  action: ActivityAction;
  oldValue: Prisma.JsonValue | null;
  newValue: Prisma.JsonValue | null;
  createdAt: Date;
  actor: { id: string; name: string; avatarColor: string | null };
  subjectUser?: { id: string; name: string } | null;
  task?: { taskKey: string; title: string } | null;
};

export function ActivityTimeline({ entries, showTask = false }: { entries: TimelineEntry[]; showTask?: boolean }) {
  if (!entries.length) return <p className="py-6 text-center text-sm text-slate-500">No activity during this period.</p>;
  return (
    <ol className="relative space-y-4 before:absolute before:bottom-2 before:left-3 before:top-2 before:w-px before:bg-slate-200">
      {entries.map((e) => (
        <li key={e.id} className="relative flex gap-3">
          <Avatar name={e.actor.name} color={e.actor.avatarColor} size="sm" className="relative ring-2 ring-surface" />
          <div className="min-w-0 text-sm">
            <p className="text-slate-700">
              <span className="font-medium text-slate-900">{e.actor.name}</span> {describeActivity(e)}
              {showTask && e.task && (
                <>
                  {" "}
                  on{" "}
                  <Link href={`/tasks/${e.task.taskKey}`} className="font-medium text-brand-700 hover:underline">
                    {e.task.taskKey}
                  </Link>
                </>
              )}
            </p>
            <p className="text-xs text-slate-400">
              <LocalTime value={e.createdAt} />
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
