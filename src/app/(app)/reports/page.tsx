import type { Metadata } from "next";
import { BarChart3, CheckCircle2, Clock, Gauge, Target } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { PRIORITY_COLORS, PRIORITY_LABELS, STATUS_COLORS, STATUS_LABELS } from "@/lib/constants";
import { resolveRange } from "@/lib/date-range";
import { firstParam } from "@/lib/utils";
import { getReports } from "@/server/services/metrics-service";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, PageHeader, StatCard } from "@/components/ui/misc";
import { RangeSelect } from "@/components/shared/url-controls";
import { DonutChart, HorizontalBars, TrendChart } from "@/components/charts/charts";

export const metadata: Metadata = { title: "Reports & Analytics" };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const range = resolveRange(firstParam(params.range), "90d");
  const r = await getReports(range);

  const header = (
    <PageHeader
      title="Reports & analytics"
      description={`Department metrics · ${range.label}. Archived tasks are excluded.`}
      actions={<RangeSelect value={range.key} />}
    />
  );

  if (!r.hasData) {
    return (
      <>
        {header}
        <Card>
          <EmptyState icon={<BarChart3 />} title="No task data yet" description="Charts appear once tasks have been created." />
        </Card>
      </>
    );
  }

  const created = r.createdVsCompleted.reduce((s, b) => s + b.created, 0);
  const employeesWithTasks = r.byEmployee.filter((e) => e.periodTotal > 0);

  return (
    <>
      {header}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Created" value={created} icon={<BarChart3 />} tone="brand" hint={range.label} />
        <StatCard label="Completed" value={r.totals.completed} icon={<CheckCircle2 />} tone="emerald" hint={range.label} />
        <StatCard
          label="Completion rate"
          value={r.totals.rate === null ? "—" : `${r.totals.rate}%`}
          icon={<Target />}
          tone="emerald"
          hint={r.totals.total ? `${r.totals.completed} of ${r.totals.total} tasks in period` : "No tasks in this period"}
        />
        <StatCard
          label="Avg. completion time"
          value={r.averageCompletionDays === null ? "—" : `${r.averageCompletionDays} d`}
          icon={<Clock />}
          tone="blue"
          hint={r.averageCompletionDays === null ? "No tasks completed in period" : "Created → completed"}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Tasks created vs. completed" description="Counted by creation date and completion date" />
          <CardBody>
            <TrendChart
              data={r.createdVsCompleted}
              series={[
                { key: "created", label: "Created", color: "#6366f1" },
                { key: "completed", label: "Completed", color: "#10b981" },
              ]}
              summary={`${created} created and ${r.totals.completed} completed in ${range.label.toLowerCase()}.`}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Tasks by status" description="Current snapshot" />
          <CardBody>
            <DonutChart
              data={r.status.map((s) => ({ label: STATUS_LABELS[s.status], value: s.count, color: STATUS_COLORS[s.status] }))}
            />
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Overdue trend"
            description={`Tasks overdue at the end of each interval · currently ${r.currentOverdue} overdue`}
          />
          <CardBody>
            <TrendChart
              type="bar"
              data={r.overdueTrend}
              series={[{ key: "overdue", label: "Overdue", color: "#ef4444" }]}
              summary={`Currently ${r.currentOverdue} overdue tasks.`}
              emptyMessage="No overdue tasks in this period"
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Active tasks by priority" />
          <CardBody>
            <DonutChart
              data={[...r.priority].reverse().map((p) => ({ label: PRIORITY_LABELS[p.priority], value: p.count, color: PRIORITY_COLORS[p.priority] }))}
              centerLabel="active"
              emptyMessage="No active tasks"
            />
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Completion rate by employee" description={range.label} />
          <CardBody>
            <HorizontalBars
              data={employeesWithTasks.map((e) => ({ label: e.name, "Completion rate": e.completionRate ?? 0 }))}
              series={[{ key: "Completion rate", label: "Completion rate", color: "#10b981" }]}
              max={100}
              unit="%"
              summary={employeesWithTasks.map((e) => `${e.name}: ${e.completionRate}%`).join(", ")}
              emptyMessage="No employee had tasks in this period"
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Workload by employee" description="Current active tasks and completions in range" />
          <CardBody>
            <HorizontalBars
              data={r.byEmployee.map((e) => ({ label: e.name, Active: e.active, Completed: e.completedInRange }))}
              series={[
                { key: "Active", label: "Active now", color: "#6366f1" },
                { key: "Completed", label: "Completed in range", color: "#10b981" },
              ]}
              summary={r.byEmployee.map((e) => `${e.name}: ${e.active} active, ${e.completedInRange} completed`).join(", ")}
            />
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="How these numbers are calculated" />
        <CardBody>
          <ul className="grid gap-3 text-sm text-slate-600 md:grid-cols-2">
            <li className="flex gap-2">
              <Target className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
              <span>
                <strong className="text-slate-800">Completion rate</strong> — tasks completed within the period ÷ tasks in the period
                (created by the period end, not cancelled, and not already completed before it started).
              </span>
            </li>
            <li className="flex gap-2">
              <Gauge className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
              <span>
                <strong className="text-slate-800">Average progress</strong> ({r.averageProgress === null ? "—" : `${r.averageProgress}%`} now) — the
                mean progress percentage of active tasks. It is a separate measure from completion rate.
              </span>
            </li>
            <li className="flex gap-2">
              <Clock className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
              <span>
                <strong className="text-slate-800">Average completion time</strong> — mean days from task creation to completion, for
                tasks completed within the period.
              </span>
            </li>
            <li className="flex gap-2">
              <BarChart3 className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
              <span>
                <strong className="text-slate-800">Overdue</strong> — active tasks whose due date is before the given day. Cancelled
                tasks never count as overdue.
              </span>
            </li>
          </ul>
        </CardBody>
      </Card>
    </>
  );
}
