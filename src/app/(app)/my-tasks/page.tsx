import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Columns3, Hand, LayoutList, ListTodo, SearchX } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { firstParam } from "@/lib/utils";
import { parseTaskFilters } from "@/lib/validations/task";
import { listTags, listTasks, listTasksForView } from "@/server/repositories/task-repository";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Pagination } from "@/components/shared/pagination";
import { TaskBoard } from "@/components/tasks/task-board";
import { TaskFilters } from "@/components/tasks/task-filters";
import { TaskTable } from "@/components/tasks/task-table";
import { ParamToggle } from "@/components/tasks/view-toggle";

export const metadata: Metadata = { title: "My Tasks" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function MyTasksPage({ searchParams }: { searchParams: SP }) {
  const user = await requireUser();

  // My Tasks is the employee personal queue. Admins assign work — send them to All Tasks.
  if (user.role === "ADMIN") {
    redirect("/tasks");
  }

  const params = await searchParams;
  const filters = parseTaskFilters(params);
  const view = firstParam(params.view) === "board" ? "board" : "list";
  const group = firstParam(params.group) === "priority" ? "priority" : "status";
  const hasFilters = Object.keys(filters).some((k) => k !== "page" && k !== "sort" && k !== "dir");

  const effective = { ...filters, sort: filters.sort ?? "due" } as const;
  const [tags, listResult, boardTasks] = await Promise.all([
    listTags(),
    view === "list" ? listTasks(user, "mine", effective) : null,
    view === "board" ? listTasksForView(user, "mine", effective) : null,
  ]);

  const empty = (
    <EmptyState
      icon={hasFilters ? <SearchX /> : <ListTodo />}
      title={hasFilters ? "No tasks match these filters." : "No tasks assigned to you yet."}
      description={
        hasFilters
          ? "Try clearing a filter or searching for something else."
          : "When a manager assigns you work — or you claim an OPEN task — it will show up here."
      }
      action={
        hasFilters ? (
          <Button asChild variant="outline">
            <Link href="/my-tasks">Reset filters</Link>
          </Button>
        ) : (
          <Button asChild>
            <Link href="/open-tasks">
              <Hand /> Browse Open Tasks
            </Link>
          </Button>
        )
      }
    />
  );

  return (
    <>
      <PageHeader
        title="My Tasks"
        description="Your personal queue — tasks assigned to you or claimed by you."
        actions={
          <>
            {view === "board" && (
              <ParamToggle
                label="Group by"
                name="group"
                value={group}
                basePath="/my-tasks"
                params={params}
                options={[
                  { value: "status", label: "By status" },
                  { value: "priority", label: "By priority" },
                ]}
              />
            )}
            <ParamToggle
              label="View"
              name="view"
              value={view}
              basePath="/my-tasks"
              params={params}
              options={[
                { value: "list", label: "List", icon: <LayoutList /> },
                { value: "board", label: "Board", icon: <Columns3 /> },
              ]}
            />
          </>
        }
      />
      <Card>
        <TaskFilters
          tags={tags}
          showStatus={view === "list" || group === "priority"}
          sortOptions={[
            { value: "due", label: "Due date" },
            { value: "priority", label: "Priority" },
            { value: "updated", label: "Recently updated" },
          ]}
        />
        {listResult && (
          <>
            <TaskTable tasks={listResult.items} showAssignee={false} empty={empty} />
            <Pagination
              page={listResult.page}
              pageCount={listResult.pageCount}
              total={listResult.total}
              pageSize={20}
              basePath="/my-tasks"
              params={params}
            />
          </>
        )}
        {boardTasks && (
          <div className="p-4">
            {boardTasks.length ? <TaskBoard tasks={boardTasks} viewer={user} groupBy={group} /> : empty}
          </div>
        )}
      </Card>
    </>
  );
}
