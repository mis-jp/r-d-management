import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { isDbConnectivityError } from "@/lib/db-retry";
import { resolveRange } from "@/lib/date-range";
import { firstParam } from "@/lib/utils";
import { getAdminDashboard, getEmployeeDashboard } from "@/server/services/metrics-service";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-controls";
import { EmptyState } from "@/components/ui/misc";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { EmployeeDashboard } from "@/components/dashboard/employee-dashboard";
import { AlertTriangle } from "lucide-react";

export const metadata: Metadata = { title: "Overview" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const range = resolveRange(firstParam(params.range), user.role === "ADMIN" ? "30d" : "month");
  const denied = firstParam(params.denied) === "1";

  const banner = denied ? (
    <div className="mb-4">
      <FormAlert message="That page is only available to administrators." />
    </div>
  ) : null;

  try {
    if (user.role === "ADMIN") {
      const data = await getAdminDashboard(range);
      return (
        <>
          {banner}
          <AdminDashboard data={data} range={range} name={user.name} />
        </>
      );
    }
    const data = await getEmployeeDashboard(user.id, range);
    return (
      <>
        {banner}
        <EmployeeDashboard data={data} range={range} name={user.name} />
      </>
    );
  } catch (error) {
    if (!isDbConnectivityError(error)) throw error;
    return (
      <>
        {banner}
        <div className="rounded-xl border bg-surface">
          <EmptyState
            icon={<AlertTriangle />}
            title="Database temporarily unreachable"
            description="The overview could not load because the database connection dropped. Wait a moment and try again."
            action={
              <Button asChild>
                <Link href="/dashboard">Try again</Link>
              </Button>
            }
          />
        </div>
      </>
    );
  }
}
