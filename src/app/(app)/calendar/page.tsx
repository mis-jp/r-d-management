import type { Metadata } from "next";
import Link from "next/link";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isValid,
  parse,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { cn, firstParam } from "@/lib/utils";
import { tasksDueBetween, type TaskListItem } from "@/server/repositories/task-repository";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { ParamToggle } from "@/components/tasks/view-toggle";

export const metadata: Metadata = { title: "Calendar" };

const statusDot: Record<TaskListItem["status"], string> = {
  NOT_STARTED: "border-l-slate-400",
  IN_PROGRESS: "border-l-blue-500",
  IN_REVIEW: "border-l-purple-500",
  COMPLETED: "border-l-emerald-500",
  ON_HOLD: "border-l-amber-500",
  CANCELLED: "border-l-slate-300",
};

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const view = firstParam(params.view) === "week" ? "week" : "month";
  const includeOpen = firstParam(params.open) !== "hide";
  const parsed = parse(firstParam(params.date) ?? "", "yyyy-MM-dd", new Date());
  const anchor = isValid(parsed) ? parsed : new Date();

  const gridStart = view === "month" ? startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 }) : startOfWeek(anchor, { weekStartsOn: 1 });
  const gridEnd = view === "month" ? endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 }) : endOfWeek(anchor, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const tasks = await tasksDueBetween(user, gridStart, endOfDay(addDays(gridEnd, 0)), includeOpen);

  const prev = view === "month" ? subMonths(anchor, 1) : subWeeks(anchor, 1);
  const next = view === "month" ? addMonths(anchor, 1) : addWeeks(anchor, 1);
  const link = (d: Date) => {
    const qs = new URLSearchParams();
    qs.set("date", format(d, "yyyy-MM-dd"));
    if (view === "week") qs.set("view", "week");
    if (!includeOpen) qs.set("open", "hide");
    return `/calendar?${qs.toString()}`;
  };
  const today = new Date();
  const title = view === "month" ? format(anchor, "MMMM yyyy") : `${format(gridStart, "MMM d")} – ${format(gridEnd, "MMM d, yyyy")}`;

  return (
    <>
      <PageHeader
        title="Calendar"
        description={user.role === "ADMIN" ? "All department tasks by due date." : "Your tasks (and OPEN tasks) by due date."}
        actions={
          <>
            {user.role !== "ADMIN" && (
              <ParamToggle
                label="OPEN tasks"
                name="open"
                value={includeOpen ? "show" : "hide"}
                basePath="/calendar"
                params={params}
                options={[
                  { value: "show", label: "Show OPEN" },
                  { value: "hide", label: "Hide OPEN" },
                ]}
              />
            )}
            <ParamToggle
              label="Calendar view"
              name="view"
              value={view}
              basePath="/calendar"
              params={params}
              options={[
                { value: "month", label: "Month" },
                { value: "week", label: "Week" },
              ]}
            />
          </>
        }
      />
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-base font-semibold">{title}</h2>
          <div className="flex items-center gap-1">
            <Link href={link(prev)} className="rounded-md p-1.5 hover:bg-slate-100" aria-label={`Previous ${view}`}>
              <ChevronLeft className="size-4" />
            </Link>
            <Link href={link(today)} className="rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-slate-50">
              Today
            </Link>
            <Link href={link(next)} className="rounded-md p-1.5 hover:bg-slate-100" aria-label={`Next ${view}`}>
              <ChevronRight className="size-4" />
            </Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            <div className="grid grid-cols-7 border-b bg-slate-50 text-center text-xs font-medium uppercase tracking-wide text-slate-500">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} className="py-2">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day) => {
                const dayTasks = tasks.filter((t) => t.dueDate && isSameDay(t.dueDate, day));
                const muted = view === "month" && !isSameMonth(day, anchor);
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "border-b border-r p-1.5 [&:nth-child(7n)]:border-r-0",
                      view === "month" ? "min-h-28" : "min-h-80",
                      muted && "bg-slate-50/70",
                    )}
                  >
                    <div className="mb-1 flex justify-end">
                      <span
                        className={cn(
                          "flex size-6 items-center justify-center rounded-full text-xs",
                          isSameDay(day, today) ? "bg-brand-600 font-semibold text-white" : muted ? "text-slate-400" : "text-slate-700",
                        )}
                      >
                        {format(day, "d")}
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {dayTasks.slice(0, view === "month" ? 3 : 20).map((t) => (
                        <li key={t.id}>
                          <Link
                            href={`/tasks/${t.taskKey}`}
                            title={`${t.taskKey}: ${t.title}`}
                            className={cn(
                              "block truncate rounded border border-l-4 bg-surface px-1.5 py-0.5 text-[11px] hover:bg-slate-50",
                              statusDot[t.status],
                              t.status === "COMPLETED" && "text-slate-400 line-through",
                            )}
                          >
                            <span className="font-mono text-slate-500">{t.taskKey}</span>{" "}
                            {!t.assigneeId && <span className="font-semibold text-teal-700">OPEN </span>}
                            {t.title}
                          </Link>
                        </li>
                      ))}
                      {view === "month" && dayTasks.length > 3 && (
                        <li>
                          <Link
                            href={`/calendar?date=${format(day, "yyyy-MM-dd")}&view=week${includeOpen ? "" : "&open=hide"}`}
                            className="px-1 text-[11px] font-medium text-brand-700 hover:underline"
                          >
                            +{dayTasks.length - 3} more
                          </Link>
                        </li>
                      )}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        {tasks.length === 0 && (
          <p className="border-t px-4 py-3 text-center text-sm text-slate-500">No tasks are due in this {view}.</p>
        )}
      </Card>
      <p className="mt-3 text-xs text-slate-500">
        Left border color shows status: grey not started, blue in progress, purple in review, green completed, amber on hold.
      </p>
    </>
  );
}
