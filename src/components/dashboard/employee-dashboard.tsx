import Link from "next/link";
import { AlertTriangle, CalendarClock, CheckCircle2, Gauge, Hand, ListTodo, Target } from "lucide-react";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/constants";
import { firstName } from "@/lib/utils";
import type { DateRange } from "@/lib/date-range";
import type { getEmployeeDashboard } from "@/server/services/metrics-service";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader, StatCard } from "@/components/ui/misc";
import { RangeSelect } from "@/components/shared/url-controls";
import { DonutChart, HorizontalBars, TrendChart } from "@/components/charts/charts";
import { ActivityTimeline } from "@/components/tasks/activity-timeline";
import { CompactTaskList } from "./compact-task-list";

type Data = Awaited<ReturnType<typeof getEmployeeDashboard>>;

export function EmployeeDashboard({ data, range, name }: { data: Data; range: DateRange; name: string }) {
  const { counts, completion } = data;
  return (
    <>
      <PageHeader
        title={`Hi, ${firstName(name)}`}
        description={`Your work at a glance · ${range.label}`}
        actions={
          <>
            <RangeSelect value={range.key} />
            <Button asChild variant="outline">
              <Link href="/my-tasks">
                <ListTodo /> My Tasks
              </Link>
            </Button>
            <Button asChild>
              <Link href="/open-tasks">
                <Hand /> OPEN Tasks{counts.openAvailable ? ` (${counts.openAvailable})` : ""}
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Active" value={counts.active} icon={<ListTodo />} tone="brand" />
        <StatCard label="Overdue" value={counts.overdue} icon={<AlertTriangle />} tone="red" />
        <StatCard label="Due in 7 days" value={counts.dueSoon} icon={<CalendarClock />} tone="amber" />
        <StatCard label="Completed" value={counts.completedInRange} icon={<CheckCircle2 />} tone="emerald" hint={range.label} />
        <StatCard
          label="Completion rate"
          value={completion.rate === null ? "—" : `${completion.rate}%`}
          icon={<Target />}
          tone="emerald"
          hint={completion.total ? `${completion.completed} of ${completion.total} tasks in period` : "No tasks in this period"}
        />
        <StatCard
          label="Avg. progress"
          value={data.averageProgress === null ? "—" : `${data.averageProgress}%`}
          icon={<Gauge />}
          tone="amber"
          hint="Across your active tasks"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="My tasks by status" description="All current tasks" />
          <CardBody>
            <DonutChart
              data={data.status.map((s) => ({ label: STATUS_LABELS[s.status], value: s.count, color: STATUS_COLORS[s.status] }))}
              emptyMessage="No tasks assigned to you yet"
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Progress overview" description={`Completed in ${range.label.toLowerCase()} vs. currently active and overdue`} />
          <CardBody>
            <HorizontalBars
              data={data.overview.map((o) => ({ label: o.label, value: o.value }))}
              series={[{ key: "value", label: "Tasks", color: "#6366f1" }]}
              summary={data.overview.map((o) => `${o.label}: ${o.value}`).join(", ")}
              emptyMessage="No tasks in this period"
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Completed over time" description={range.label} />
          <CardBody>
            <TrendChart
              type="bar"
              height={220}
              data={data.trend}
              series={[{ key: "completed", label: "Completed", color: "#10b981" }]}
              summary={`You completed ${completion.completed} tasks in ${range.label.toLowerCase()}.`}
              emptyMessage="No completed tasks in this period"
            />
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="Overdue" />
          <CompactTaskList tasks={data.overdueTasks} empty="Nothing overdue — nice work." showAssignee={false} />
        </Card>
        <Card>
          <CardHeader title="Due soon" description="Next 7 days" />
          <CompactTaskList tasks={data.dueSoon} empty="Nothing due in the next week." showAssignee={false} />
        </Card>
        <Card>
          <CardHeader title="Recent updates on my tasks" />
          <CardBody>
            <ActivityTimeline entries={data.recentActivity} showTask />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
