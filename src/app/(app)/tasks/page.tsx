import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, Plus, SearchX } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { parseTaskFilters } from "@/lib/validations/task";
import { listTags, listTasks } from "@/server/repositories/task-repository";
import { listAssignableEmployees } from "@/server/repositories/user-repository";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Pagination } from "@/components/shared/pagination";
import { TaskFilters } from "@/components/tasks/task-filters";
import { TaskTable } from "@/components/tasks/task-table";

export const metadata: Metadata = { title: "All Tasks" };

export default async function AllTasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAdmin();
  const params = await searchParams;
  const filters = parseTaskFilters(params);
  const hasFilters = Object.keys(filters).some((k) => k !== "page" && k !== "sort" && k !== "dir");

  const [result, tags, employees] = await Promise.all([
    listTasks(user, "all", filters),
    listTags(),
    listAssignableEmployees(),
  ]);

  return (
    <>
      <PageHeader
        title="All Tasks"
        description={`${result.total} task${result.total === 1 ? "" : "s"} in the department${hasFilters ? " match your filters" : ""}.`}
        actions={
          <Button asChild>
            <Link href="/tasks/new">
              <Plus /> New task
            </Link>
          </Button>
        }
      />
      <Card>
        <TaskFilters tags={tags} assignees={employees} showArchived showCreatedRange />
        <TaskTable
          tasks={result.items}
          empty={
            <EmptyState
              icon={hasFilters ? <SearchX /> : <ClipboardList />}
              title={hasFilters ? "No tasks match these filters." : "No tasks yet."}
              description={hasFilters ? "Try removing a filter." : "Create the first task for your team."}
              action={
                hasFilters ? (
                  <Button asChild variant="outline">
                    <Link href="/tasks">Reset filters</Link>
                  </Button>
                ) : (
                  <Button asChild>
                    <Link href="/tasks/new">
                      <Plus /> New task
                    </Link>
                  </Button>
                )
              }
            />
          }
        />
        <Pagination
          page={result.page}
          pageCount={result.pageCount}
          total={result.total}
          pageSize={20}
          basePath="/tasks"
          params={params}
        />
      </Card>
    </>
  );
}
