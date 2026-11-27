import Link from "next/link";
import { AlertTriangle, CheckCircle2, CircleDot, ClipboardList, Eye, Gauge, Hand, Plus, Target } from "lucide-react";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/constants";
import { firstName } from "@/lib/utils";
import type { DateRange } from "@/lib/date-range";
import type { getAdminDashboard } from "@/server/services/metrics-service";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, PageHeader, StatCard } from "@/components/ui/misc";
import { RangeSelect } from "@/components/shared/url-controls";
import { DonutChart, TrendChart } from "@/components/charts/charts";
import { EmployeeShareChart } from "@/components/charts/employee-share-chart";
import { ActivityTimeline } from "@/components/tasks/activity-timeline";
import { CompactTaskList } from "./compact-task-list";

type Data = Awaited<ReturnType<typeof getAdminDashboard>>;

export function AdminDashboard({ data, range, name }: { data: Data; range: DateRange; name: string }) {
  const { counts, completion } = data;
  const busiest = [...data.workload].sort((a, b) => b.active - a.active).slice(0, 6);

  return (
    <>
      <PageHeader
        title={`Welcome back, ${firstName(name)}`}
        description={`Department overview · ${range.label}`}
        actions={
          <>
            <RangeSelect value={range.key} />
            <Button asChild>
              <Link href="/tasks/new">
                <Plus /> New task
              </Link>
            </Button>
          </>
        }
      />

      {/* Primary signals first — keeps Overview scannable */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatCard label="Active tasks" value={counts.active} icon={<ClipboardList />} tone="brand" hint="Not completed or cancelled" />
        <StatCard label="OPEN to claim" value={counts.open} icon={<Hand />} tone="slate" hint="Waiting for someone to claim" />
        <StatCard label="Overdue" value={counts.overdue} icon={<AlertTriangle />} tone="red" hint="Past due and still active" />
        <StatCard
          label="Awaiting review"
          value={counts.inReview}
          icon={<Eye />}
          tone="purple"
          hint="Ready for admin check"
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 md:gap-4">
        <StatCard label="In progress" value={counts.inProgress} icon={<CircleDot />} tone="blue" />
        <StatCard
          label="Completed"
          value={counts.completedInRange}
          icon={<CheckCircle2 />}
          tone="emerald"
          hint={`${counts.completed} all time`}
        />
        <StatCard
          label="Completion rate"
          value={completion.rate === null ? "—" : `${completion.rate}%`}
          icon={<Target />}
          tone="emerald"
          hint={completion.total ? `${completion.completed} of ${completion.total} in period` : "No tasks in this period"}
        />
        <StatCard
          label="Avg. progress"
          value={data.averageProgress === null ? "—" : `${data.averageProgress}%`}
          icon={<Gauge />}
          tone="amber"
          hint="Active tasks only"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Created vs. completed" description={range.label} />
          <CardBody>
            <TrendChart
              data={data.trend}
              series={[
                { key: "created", label: "Created", color: "#6366f1" },
                { key: "completed", label: "Completed", color: "#10b981" },
              ]}
              summary={`Over ${range.label.toLowerCase()}, ${data.trend.reduce((s, r) => s + r.created, 0)} tasks were created and ${data.trend.reduce((s, r) => s + r.completed, 0)} completed.`}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Tasks by status" description="Current, excluding archived" />
          <CardBody>
            <DonutChart
              data={data.status.map((s) => ({ label: STATUS_LABELS[s.status], value: s.count, color: STATUS_COLORS[s.status] }))}
              emptyMessage="No tasks yet"
            />
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Team workload"
            description="Active tasks per employee"
            action={
              <Button asChild variant="link" size="sm">
                <Link href={`/team?range=${range.key}`}>View all</Link>
              </Button>
            }
          />
          {busiest.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">No active employees yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-slate-500">
                    <th scope="col" className="px-5 py-2 font-medium">Employee</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Active</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">In progress</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Overdue</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Done (range)</th>
                    <th scope="col" className="px-5 py-2 text-right font-medium">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {busiest.map((r) => (
                    <tr key={r.id}>
                      <td className="px-5 py-2.5">
                        <Link href={`/employees/${r.id}`} className="flex items-center gap-2 hover:underline">
                          <Avatar name={r.name} color={r.avatarColor} size="sm" />
                          <span className="font-medium text-slate-800">{r.name}</span>
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{r.active}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{r.inProgress}</td>
                      <td className={`px-3 py-2.5 text-right tabular-nums ${r.overdue ? "font-semibold text-red-600" : ""}`}>{r.overdue}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{r.completedInRange}</td>
                      <td className="px-5 py-2.5 text-right tabular-nums">{r.completionRate === null ? "—" : `${r.completionRate}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card>
          <CardHeader title="Tasks by employee" description="Each person's share · hover a slice for details" />
          <CardBody>
            <EmployeeShareChart rows={data.workload} />
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="Awaiting review" description="Oldest first" />
          <CompactTaskList tasks={data.awaitingReview} empty="Nothing waiting for review." />
        </Card>
        <Card>
          <CardHeader
            title="Recently updated"
            action={
              <Button asChild variant="link" size="sm">
                <Link href="/tasks?sort=updated">All tasks</Link>
              </Button>
            }
          />
          <CompactTaskList tasks={data.recentTasks} empty="No tasks yet." />
        </Card>
        <Card>
          <CardHeader
            title="Recent activity"
            action={
              <Button asChild variant="link" size="sm">
                <Link href="/activity">Activity log</Link>
              </Button>
            }
          />
          <CardBody>
            <ActivityTimeline entries={data.recentActivity} showTask />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
