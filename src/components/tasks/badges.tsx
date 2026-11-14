import type { Priority, TaskStatus } from "@prisma/client";
import {
  ArrowDown,
  ArrowUp,
  Ban,
  CircleCheck,
  CircleDashed,
  CircleDot,
  CirclePause,
  Eye,
  Flame,
  Hand,
  Minus,
} from "lucide-react";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/misc";
import { startOfDay } from "date-fns";

const statusStyles: Record<TaskStatus, { cls: string; Icon: typeof CircleDot }> = {
  NOT_STARTED: { cls: "border-slate-200 bg-slate-50 text-slate-700", Icon: CircleDashed },
  IN_PROGRESS: { cls: "border-blue-200 bg-blue-50 text-blue-700", Icon: CircleDot },
  IN_REVIEW: { cls: "border-purple-200 bg-purple-50 text-purple-700", Icon: Eye },
  COMPLETED: { cls: "border-emerald-200 bg-emerald-50 text-emerald-700", Icon: CircleCheck },
  ON_HOLD: { cls: "border-amber-200 bg-amber-50 text-amber-800", Icon: CirclePause },
  CANCELLED: { cls: "border-slate-200 bg-slate-100 text-slate-500 line-through", Icon: Ban },
};

export function StatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  const { cls, Icon } = statusStyles[status];
  return (
    <Badge className={cn(cls, className)}>
      <Icon aria-hidden />
      {STATUS_LABELS[status]}
    </Badge>
  );
}

const priorityStyles: Record<Priority, { cls: string; Icon: typeof Flame }> = {
  LOW: { cls: "border-slate-200 bg-surface text-slate-600", Icon: ArrowDown },
  NORMAL: { cls: "border-sky-200 bg-sky-50 text-sky-700", Icon: Minus },
  HIGH: { cls: "border-orange-200 bg-orange-50 text-orange-700", Icon: ArrowUp },
  URGENT: { cls: "border-red-200 bg-red-50 text-red-700", Icon: Flame },
};

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  const { cls, Icon } = priorityStyles[priority];
  return (
    <Badge className={cn(cls, className)}>
      <Icon aria-hidden />
      {PRIORITY_LABELS[priority]}
    </Badge>
  );
}

export function OpenBadge({ className }: { className?: string }) {
  return (
    <Badge className={cn("border-teal-300 bg-teal-50 font-semibold uppercase tracking-wide text-teal-700", className)}>
      <Hand aria-hidden />
      Open
    </Badge>
  );
}

export function TagChip({ name, color }: { name: string; color: string | null }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
      <span className="size-1.5 rounded-full" style={{ backgroundColor: color ?? "#94a3b8" }} aria-hidden />
      {name}
    </span>
  );
}

export function DueDate({
  date,
  status,
  className,
}: {
  date: Date | null;
  status: TaskStatus;
  className?: string;
}) {
  if (!date) return <span className={cn("text-slate-400", className)}>No due date</span>;
  const overdue = status !== "COMPLETED" && status !== "CANCELLED" && date < startOfDay(new Date());
  return (
    <span className={cn(overdue ? "font-semibold text-red-600" : "text-slate-600", className)}>
      {formatDate(date)}
      {overdue && <span className="ml-1 rounded bg-red-50 px-1 text-[10px] uppercase text-red-700">Overdue</span>}
    </span>
  );
}
