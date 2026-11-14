import type { Metadata } from "next";
import Link from "next/link";
import { SearchX, UserPlus, Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { ROLE_LABELS } from "@/lib/constants";
import { isActive, isOverdue } from "@/lib/metrics";
import { firstParam } from "@/lib/utils";
import { listUsers } from "@/server/repositories/user-repository";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, Badge, EmptyState, PageHeader } from "@/components/ui/misc";
import { EmployeeFilters } from "./employee-filters";

export const metadata: Metadata = { title: "Employees" };

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const q = firstParam(params.q)?.slice(0, 100);
  const roleParam = firstParam(params.role);
  const statusParam = firstParam(params.status);
  const role = roleParam === "ADMIN" || roleParam === "EMPLOYEE" ? roleParam : undefined;
  const status = statusParam === "active" || statusParam === "inactive" ? statusParam : undefined;

  const [users, tasks] = await Promise.all([
    listUsers({ q, role, status }),
    db.task.findMany({
      where: { isArchived: false, assigneeId: { not: null } },
      select: {
        assigneeId: true,
        status: true,
        priority: true,
        progress: true,
        createdAt: true,
        completedAt: true,
        dueDate: true,
        claimedAt: true,
        estimatedMinutes: true,
      },
    }),
  ]);
  const hasFilters = !!(q || role || status);

  return (
    <>
      <PageHeader
        title="Employees"
        description="Manage department accounts and see each person's workload."
        actions={
          <Button asChild>
            <Link href="/employees/new">
              <UserPlus /> Add user
            </Link>
          </Button>
        }
      />
      <Card>
        <EmployeeFilters />
        {users.length === 0 ? (
          <EmptyState
            icon={hasFilters ? <SearchX /> : <Users />}
            title={hasFilters ? "No people match these filters." : "No users yet."}
            action={
              hasFilters ? (
                <Button asChild variant="outline">
                  <Link href="/employees">Reset filters</Link>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th scope="col" className="px-5 py-2.5 font-medium">Name</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Role</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Active</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Overdue</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((u) => {
                  const mine = tasks.filter((t) => t.assigneeId === u.id);
                  const overdue = mine.filter((t) => isOverdue(t)).length;
                  return (
                    <tr key={u.id} className={u.isActive ? "hover:bg-slate-50/80" : "bg-slate-50/50 text-slate-500"}>
                      <td className="px-5 py-3">
                        <Link href={`/employees/${u.id}`} className="flex items-center gap-3">
                          <Avatar name={u.name} color={u.avatarColor} />
                          <span className="min-w-0">
                            <span className="block font-medium text-slate-900 hover:underline">{u.name}</span>
                            <span className="block truncate text-xs text-slate-500">
                              {u.email}
                              {u.jobTitle ? ` · ${u.jobTitle}` : ""}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <Badge className={u.role === "ADMIN" ? "border-brand-200 bg-brand-50 text-brand-700" : "border-slate-200 bg-surface text-slate-600"}>
                          {ROLE_LABELS[u.role]}
                        </Badge>
                      </td>
                      <td className="px-3 py-3">
                        <Badge className={u.isActive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-500"}>
                          {u.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">{mine.filter(isActive).length}</td>
                      <td className={`px-3 py-3 text-right tabular-nums ${overdue ? "font-semibold text-red-600" : ""}`}>{overdue}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{mine.filter((t) => t.status === "COMPLETED").length}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
