import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Briefcase, Building2, Mail, Phone } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { CLOSED_STATUSES, ROLE_LABELS, STATUS_COLORS, STATUS_LABELS } from "@/lib/constants";
import { resolveRange } from "@/lib/date-range";
import { firstParam } from "@/lib/utils";
import { taskListSelect } from "@/server/repositories/task-repository";
import { getUserById } from "@/server/repositories/user-repository";
import { getEmployeeStats } from "@/server/services/metrics-service";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, Badge, StatCard } from "@/components/ui/misc";
import { LocalTime } from "@/components/shared/local-time";
import { QueryToast } from "@/components/shared/query-toast";
import { RangeSelect } from "@/components/shared/url-controls";
import { DonutChart } from "@/components/charts/charts";
import { AccountControls, EditUserForm } from "@/components/employees/user-forms";
import { TaskTable } from "@/components/tasks/task-table";

export const metadata: Metadata = { title: "Employee Profile" };

export default async function EmployeeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const user = await getUserById(id);
  if (!user) notFound();

  const range = resolveRange(firstParam(sp.range), "30d");
  const [stats, activeTasks, recentCompleted] = await Promise.all([
    getEmployeeStats(user.id, range),
    db.task.findMany({
      where: { assigneeId: user.id, isArchived: false, status: { notIn: CLOSED_STATUSES } },
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }],
      take: 50,
      select: taskListSelect,
    }),
    db.task.findMany({
      where: { assigneeId: user.id, isArchived: false, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      take: 5,
      select: taskListSelect,
    }),
  ]);
  const isSelf = viewer.id === user.id;

  return (
    <>
      <QueryToast messages={{ created: "Account created." }} />
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={user.name} color={user.avatarColor} size="xl" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{user.name}</h1>
              <Badge className="border-brand-200 bg-brand-50 text-brand-700">{ROLE_LABELS[user.role]}</Badge>
              <Badge className={user.isActive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-500"}>
                {user.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
              <li className="flex items-center gap-1.5">
                <Mail className="size-3.5" aria-hidden /> {user.email}
              </li>
              {user.jobTitle && (
                <li className="flex items-center gap-1.5">
                  <Briefcase className="size-3.5" aria-hidden /> {user.jobTitle}
                </li>
              )}
              {user.department && (
                <li className="flex items-center gap-1.5">
                  <Building2 className="size-3.5" aria-hidden /> {user.department}
                </li>
              )}
              {user.phone && (
                <li className="flex items-center gap-1.5">
                  <Phone className="size-3.5" aria-hidden /> {user.phone}
                </li>
              )}
            </ul>
          </div>
        </div>
        <RangeSelect value={range.key} />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Active tasks" value={stats.active} />
        <StatCard label="Overdue" value={stats.overdue} tone="red" />
        <StatCard label="Completed" value={stats.completion.completed} hint={`${range.label} · ${stats.completedAllTime} all time`} />
        <StatCard
          label="Completion rate"
          value={stats.completion.rate === null ? "—" : `${stats.completion.rate}%`}
          hint={stats.completion.total ? `${stats.completion.completed} of ${stats.completion.total} in period` : "No tasks in this period"}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader
              title={`Active tasks (${activeTasks.length})`}
              action={
                <Link href={`/tasks?assignee=${user.id}`} className="text-xs font-medium text-brand-700 hover:underline">
                  View in All Tasks
                </Link>
              }
            />
            <TaskTable
              tasks={activeTasks}
              showAssignee={false}
              empty={<p className="px-5 py-8 text-center text-sm text-slate-500">No active tasks.</p>}
            />
          </Card>
          <Card>
            <CardHeader title="Recently completed" />
            <TaskTable
              tasks={recentCompleted}
              showAssignee={false}
              empty={<p className="px-5 py-8 text-center text-sm text-slate-500">No completed tasks yet.</p>}
            />
          </Card>
          <EditUserForm
            isSelf={isSelf}
            user={{
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              jobTitle: user.jobTitle,
              department: user.department,
              phone: user.phone,
              bio: user.bio,
              avatarColor: user.avatarColor,
            }}
          />
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Tasks by status" />
            <CardBody>
              <DonutChart
                data={stats.status.map((s) => ({ label: STATUS_LABELS[s.status], value: s.count, color: STATUS_COLORS[s.status] }))}
                emptyMessage="No tasks assigned"
              />
            </CardBody>
          </Card>
          <AccountControls user={{ id: user.id, name: user.name }} isActive={user.isActive} isSelf={isSelf} />
          <Card>
            <CardHeader title="Account info" />
            <CardBody>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Last sign-in</dt>
                  <dd>{user.lastLoginAt ? <LocalTime value={user.lastLoginAt} /> : "Never"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Created</dt>
                  <dd>
                    <LocalTime value={user.createdAt} />
                  </dd>
                </div>
              </dl>
              {user.bio && <p className="mt-3 whitespace-pre-wrap border-t pt-3 text-sm text-slate-600">{user.bio}</p>}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
