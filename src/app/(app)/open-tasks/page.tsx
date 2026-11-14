import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, Hand, SearchX, Timer, UserPlus } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { formatDate, formatMinutes } from "@/lib/utils";
import { parseTaskFilters } from "@/lib/validations/task";
import { listTags, listTasks, type TaskListItem } from "@/server/repositories/task-repository";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Pagination } from "@/components/shared/pagination";
import { DueDate, OpenBadge, PriorityBadge, TagChip } from "@/components/tasks/badges";
import { ClaimButton } from "@/components/tasks/claim-button";
import { TaskFilters } from "@/components/tasks/task-filters";

export const metadata: Metadata = { title: "OPEN Tasks" };

const PAGE_SIZE = 12;

export default async function OpenTasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const filters = parseTaskFilters(params);
  const hasFilters = Object.keys(filters).some((k) => k !== "page" && k !== "sort" && k !== "dir");
  const [result, tags] = await Promise.all([
    listTasks(user, "open", { ...filters, status: undefined, sort: filters.sort ?? "priority" }, PAGE_SIZE),
    listTags(),
  ]);

  return (
    <>
      <PageHeader
        title="OPEN Tasks"
        description={
          user.role === "ADMIN"
            ? "Unassigned tasks published for the team. Employees can claim them, or you can assign them directly."
            : "Unassigned tasks you can pick up. Claiming assigns the task to you immediately."
        }
      />
      <Card className="mb-4">
        <TaskFilters
          tags={tags}
          showStatus={false}
          sortOptions={[
            { value: "priority", label: "Priority" },
            { value: "due", label: "Due date" },
            { value: "created", label: "Newest" },
          ]}
        />
      </Card>

      {result.items.length === 0 ? (
        <Card>
          <EmptyState
            icon={hasFilters ? <SearchX /> : <Hand />}
            title={hasFilters ? "No OPEN tasks match these filters." : "There are no OPEN tasks right now."}
            description={hasFilters ? "Try clearing the filters." : "Check back later — new tasks appear here as soon as they're published."}
            action={
              hasFilters ? (
                <Button asChild variant="outline">
                  <Link href="/open-tasks">Reset filters</Link>
                </Button>
              ) : user.role === "ADMIN" ? (
                <Button asChild>
                  <Link href="/tasks/new">Publish a task</Link>
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {result.items.map((task) => (
              <li key={task.id}>
                <OpenTaskCard task={task} isAdmin={user.role === "ADMIN"} />
              </li>
            ))}
          </ul>
          <Card className="mt-4">
            <Pagination
              page={result.page}
              pageCount={result.pageCount}
              total={result.total}
              pageSize={PAGE_SIZE}
              basePath="/open-tasks"
              params={params}
            />
          </Card>
        </>
      )}
    </>
  );
}

function OpenTaskCard({ task, isAdmin }: { task: TaskListItem; isAdmin: boolean }) {
  const excerpt = task.description ? task.description.slice(0, 160) + (task.description.length > 160 ? "…" : "") : null;
  return (
    <article className="flex h-full flex-col rounded-xl border bg-surface p-4 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <OpenBadge />
          <span className="font-mono text-xs text-slate-500">{task.taskKey}</span>
        </div>
        <PriorityBadge priority={task.priority} />
      </div>
      <h2 className="mt-2 font-semibold leading-snug text-slate-900">
        <Link href={`/tasks/${task.taskKey}`} className="hover:underline">
          {task.title}
        </Link>
      </h2>
      {excerpt && <p className="mt-1 line-clamp-3 text-sm text-slate-600">{excerpt}</p>}
      {task.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {task.tags.map((t) => (
            <TagChip key={t.id} name={t.name} color={t.color} />
          ))}
        </div>
      )}
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <CalendarClock className="size-3.5 text-slate-400" aria-hidden />
          <dt className="sr-only">Due date</dt>
          <dd>
            <DueDate date={task.dueDate} status={task.status} />
          </dd>
        </div>
        <div className="flex items-center gap-1.5 text-slate-600">
          <Timer className="size-3.5 text-slate-400" aria-hidden />
          <dt className="sr-only">Estimated effort</dt>
          <dd>{task.estimatedMinutes ? `Est. ${formatMinutes(task.estimatedMinutes)}` : "No estimate"}</dd>
        </div>
        <div className="col-span-2 text-slate-500">
          <dt className="inline">Published </dt>
          <dd className="inline">{formatDate(task.createdAt)}</dd>
        </div>
      </dl>
      <div className="mt-auto flex justify-end gap-2 pt-4">
        <Button asChild variant="outline" size="sm">
          <Link href={`/tasks/${task.taskKey}`}>Details</Link>
        </Button>
        {isAdmin ? (
          <Button asChild size="sm">
            <Link href={`/tasks/${task.taskKey}#assign`}>
              <UserPlus /> Assign
            </Link>
          </Button>
        ) : (
          <ClaimButton taskId={task.id} taskKey={task.taskKey} title={task.title} dueLabel={formatDate(task.dueDate)} />
        )}
      </div>
    </article>
  );
}
