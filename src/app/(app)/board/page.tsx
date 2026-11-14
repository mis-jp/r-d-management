import type { Metadata } from "next";
import Link from "next/link";
import { Columns3, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { firstParam } from "@/lib/utils";
import { parseTaskFilters } from "@/lib/validations/task";
import { listTags, listTasksForView } from "@/server/repositories/task-repository";
import { listAssignableEmployees } from "@/server/repositories/user-repository";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { TaskBoard } from "@/components/tasks/task-board";
import { TaskFilters } from "@/components/tasks/task-filters";
import { ParamToggle } from "@/components/tasks/view-toggle";

export const metadata: Metadata = { title: "Task Board" };

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";
  const params = await searchParams;
  const filters = parseTaskFilters(params);
  const group = firstParam(params.group) === "priority" ? "priority" : "status";
  const showCancelled = firstParam(params.cancelled) === "show";

  const [tasks, tags, employees] = await Promise.all([
    listTasksForView(user, isAdmin ? "board" : "mine", { ...filters, sort: filters.sort ?? "priority" }),
    listTags(),
    isAdmin ? listAssignableEmployees() : Promise.resolve(undefined),
  ]);

  return (
    <>
      <PageHeader
        title="Task Board"
        description={isAdmin ? "Every active department task, grouped for quick triage." : "Your tasks, grouped for quick updates."}
        actions={
          <>
            <ParamToggle
              label="Group by"
              name="group"
              value={group}
              basePath="/board"
              params={params}
              options={[
                { value: "status", label: "By status" },
                { value: "priority", label: "By priority" },
              ]}
            />
            {group === "status" && (
              <ParamToggle
                label="Cancelled column"
                name="cancelled"
                value={showCancelled ? "show" : "hide"}
                basePath="/board"
                params={params}
                options={[
                  { value: "hide", label: "Hide cancelled" },
                  { value: "show", label: "Show cancelled" },
                ]}
              />
            )}
            {isAdmin && (
              <Button asChild>
                <Link href="/tasks/new">
                  <Plus /> New task
                </Link>
              </Button>
            )}
          </>
        }
      />
      <Card className="mb-4">
        <TaskFilters tags={tags} assignees={employees} showStatus={group === "priority"} />
      </Card>
      {tasks.length ? (
        <TaskBoard tasks={tasks} viewer={user} groupBy={group} hideCancelled={!showCancelled} />
      ) : (
        <Card>
          <EmptyState
            icon={<Columns3 />}
            title="No tasks to show"
            description="Nothing matches the current filters."
            action={
              <Button asChild variant="outline">
                <Link href="/board">Reset filters</Link>
              </Button>
            }
          />
        </Card>
      )}
    </>
  );
}
