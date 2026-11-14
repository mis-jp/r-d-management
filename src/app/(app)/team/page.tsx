import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { resolveRange } from "@/lib/date-range";
import { cn, firstParam, formatMinutes } from "@/lib/utils";
import { getTeamWorkload } from "@/server/services/metrics-service";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, EmptyState, PageHeader, ProgressBar, StatCard } from "@/components/ui/misc";
import { RangeSelect } from "@/components/shared/url-controls";
import { HorizontalBars } from "@/components/charts/charts";
import { EmployeeShareChart } from "@/components/charts/employee-share-chart";

export const metadata: Metadata = { title: "Team Workload" };

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const range = resolveRange(firstParam(params.range), "30d");
  const { rows, openTasks, averageActive } = await getTeamWorkload(range);
  const sorted = [...rows].sort((a, b) => b.active - a.active || b.estimatedActiveMinutes - a.estimatedActiveMinutes);
  // "Heavy" = noticeably above the team average, or carrying overdue work. A signal, not a verdict.
  const heavy = (r: (typeof rows)[number]) => (averageActive > 0 && r.active >= Math.max(3, averageActive * 1.5)) || r.overdue >= 2;

  return (
    <>
      <PageHeader
        title="Team workload"
        description={`Active work per employee · completions for ${range.label.toLowerCase()}`}
        actions={<RangeSelect value={range.key} />}
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Employees" value={rows.length} />
        <StatCard label="Avg. active tasks" value={averageActive} hint="Per employee" />
        <StatCard label="OPEN tasks" value={openTasks} hint="Unassigned capacity" />
        <StatCard label="Possibly overloaded" value={rows.filter(heavy).length} tone="amber" icon={<AlertTriangle />} hint="≥1.5× average, or 2+ overdue" />
      </div>

      {rows.length === 0 ? (
        <Card className="mt-6">
          <EmptyState
            icon={<Users />}
            title="No active employees"
            action={
              <Button asChild>
                <Link href="/employees/new">Add an employee</Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader title="Share by employee" description="Hover a slice for name and percentage" />
              <CardBody>
                <EmployeeShareChart rows={rows} height={200} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Workload distribution" description="Active tasks by status" />
              <CardBody>
                <HorizontalBars
                  stacked
                  data={sorted.map((r) => ({
                    label: r.name,
                    "Not started": r.notStarted,
                    "In progress": r.inProgress,
                    "In review": r.inReview,
                    "On hold": r.onHold,
                  }))}
                  series={[
                    { key: "Not started", label: "Not started", color: "#94a3b8" },
                    { key: "In progress", label: "In progress", color: "#3b82f6" },
                    { key: "In review", label: "In review", color: "#a855f7" },
                    { key: "On hold", label: "On hold", color: "#f59e0b" },
                  ]}
                  summary={sorted.map((r) => `${r.name}: ${r.active} active`).join(", ")}
                  emptyMessage="No active tasks assigned"
                />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Estimated effort on active tasks" description="Hours, where an estimate exists" />
              <CardBody>
                <HorizontalBars
                  data={sorted.map((r) => ({ label: r.name, Hours: Math.round((r.estimatedActiveMinutes / 60) * 10) / 10 }))}
                  series={[{ key: "Hours", label: "Estimated hours", color: "#6366f1" }]}
                  summary={sorted.map((r) => `${r.name}: ${formatMinutes(r.estimatedActiveMinutes)}`).join(", ")}
                  emptyMessage="No estimates on active tasks"
                />
              </CardBody>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader title="Per-employee breakdown" description="Task counts are a rough signal — check estimates and task complexity before rebalancing." />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th scope="col" className="px-5 py-2.5 font-medium">Employee</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Active</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">In progress</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Overdue</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Claimed</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Completed</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Completion rate</th>
                    <th scope="col" className="px-5 py-2.5 text-right font-medium">Est. effort</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sorted.map((r) => (
                    <tr key={r.id} className={cn(heavy(r) && "bg-amber-50/50")}>
                      <td className="px-5 py-3">
                        <Link href={`/employees/${r.id}?range=${range.key}`} className="flex items-center gap-2.5">
                          <Avatar name={r.name} color={r.avatarColor} size="sm" />
                          <span>
                            <span className="block font-medium text-slate-900 hover:underline">{r.name}</span>
                            {r.jobTitle && <span className="block text-xs text-slate-500">{r.jobTitle}</span>}
                          </span>
                          {heavy(r) && (
                            <span className="ml-1 inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
                              <AlertTriangle className="size-3" aria-hidden /> Heavy
                            </span>
                          )}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums font-medium">{r.active}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{r.inProgress}</td>
                      <td className={cn("px-3 py-3 text-right tabular-nums", r.overdue && "font-semibold text-red-600")}>{r.overdue}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{r.claimedInRange}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{r.completedInRange}</td>
                      <td className="px-3 py-3">
                        {r.completionRate === null ? (
                          <span className="text-xs text-slate-400">No tasks in period</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <ProgressBar value={r.completionRate} className="w-20" label={`${r.name} completion rate`} />
                            <span className="text-xs tabular-nums">{r.completionRate}%</span>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right text-xs tabular-nums text-slate-600">
                        {formatMinutes(r.estimatedActiveMinutes || null)}
                        {r.activeWithoutEstimate > 0 && <span className="block text-slate-400">{r.activeWithoutEstimate} w/o estimate</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t px-5 py-3 text-xs text-slate-500">
              Completion rate = tasks completed in the period ÷ tasks the employee held during the period (created by the end of the
              period, not cancelled, and not already completed before it began). “Claimed” counts OPEN tasks claimed in the period.
            </p>
          </Card>
        </>
      )}
    </>
  );
}
