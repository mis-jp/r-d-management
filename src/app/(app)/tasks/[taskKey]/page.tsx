import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MessageSquare, TrendingUp } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { canClaim, canComment, canUpdateWork, isOpenTask } from "@/lib/permissions";
import { cn, formatDate, formatMinutes } from "@/lib/utils";
import { getTaskForViewer } from "@/server/services/task-service";
import { listAssignableEmployees } from "@/server/repositories/user-repository";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, Badge, ProgressBar } from "@/components/ui/misc";
import { LocalTime } from "@/components/shared/local-time";
import { QueryToast } from "@/components/shared/query-toast";
import { ActivityTimeline } from "@/components/tasks/activity-timeline";
import { AdminTaskActions } from "@/components/tasks/admin-task-actions";
import { AttachmentsPanel } from "@/components/tasks/attachments-panel";
import { DueDate, OpenBadge, PriorityBadge, StatusBadge, TagChip } from "@/components/tasks/badges";
import { ClaimButton } from "@/components/tasks/claim-button";
import { CommentForm } from "@/components/tasks/comment-form";
import { WorkPanel } from "@/components/tasks/work-panel";

type Params = { params: Promise<{ taskKey: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { taskKey } = await params;
  return { title: decodeURIComponent(taskKey) };
}

export default async function TaskDetailPage({ params }: Params) {
  const user = await requireUser();
  const { taskKey } = await params;
  const task = await getTaskForViewer(user, decodeURIComponent(taskKey));
  if (!task) notFound();

  const isAdmin = user.role === "ADMIN";
  const open = isOpenTask(task);
  const employees = isAdmin ? await listAssignableEmployees() : [];
  const mayUpdate = canUpdateWork(user, task) && !task.isArchived;

  return (
    <>
      <QueryToast messages={{ created: "Task created.", updated: "Changes saved." }} />

      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm text-slate-500">{task.taskKey}</span>
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
          {open && <OpenBadge />}
          {task.isArchived && <Badge className="border-slate-300 bg-slate-100 text-slate-600">Archived</Badge>}
        </div>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{task.title}</h1>
        <div className="mt-3 flex max-w-md items-center gap-3">
          <ProgressBar value={task.progress} label="Task progress" className="h-2" />
          <span className="text-sm font-semibold tabular-nums">{task.progress}%</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {canClaim(user, task) && (
            <div className="flex flex-col gap-3 rounded-xl border border-teal-200 bg-teal-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-teal-900">This task is OPEN</p>
                <p className="text-sm text-teal-800">Claim it to add it to your tasks and start working.</p>
              </div>
              <ClaimButton
                taskId={task.id}
                taskKey={task.taskKey}
                title={task.title}
                dueLabel={formatDate(task.dueDate)}
                size="md"
                goToTask
              />
            </div>
          )}

          <Card>
            <CardHeader title="Description" />
            <CardBody>
              {task.description ? (
                <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">{task.description}</div>
              ) : (
                <p className="text-sm text-slate-500">No description provided.</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={`Comments & updates (${task.comments.length})`} />
            <CardBody className="space-y-5">
              {task.comments.length === 0 ? (
                <p className="text-sm text-slate-500">No comments yet.{canComment(user, task) ? " Start the discussion below." : ""}</p>
              ) : (
                <ol className="space-y-4">
                  {task.comments.map((c) => (
                    <li key={c.id} className="flex gap-3">
                      <Avatar name={c.author.name} color={c.author.avatarColor} size="md" />
                      <div
                        className={cn(
                          "min-w-0 flex-1 rounded-lg border px-3 py-2",
                          c.kind === "PROGRESS_UPDATE" ? "border-blue-200 bg-blue-50/50" : "bg-surface",
                        )}
                      >
                        <div className="flex flex-wrap items-center gap-x-2 text-xs">
                          <span className="font-semibold text-slate-900">{c.author.name}</span>
                          {c.author.role === "ADMIN" && <span className="text-slate-500">Admin</span>}
                          {c.kind === "PROGRESS_UPDATE" ? (
                            <span className="inline-flex items-center gap-1 font-medium text-blue-700">
                              <TrendingUp className="size-3" aria-hidden /> Progress update
                            </span>
                          ) : (
                            <MessageSquare className="size-3 text-slate-400" aria-hidden />
                          )}
                          <span className="text-slate-400">
                            <LocalTime value={c.createdAt} />
                          </span>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-700">{c.body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
              {canComment(user, task) && !task.isArchived ? (
                <div className="border-t pt-4">
                  <CommentForm taskId={task.id} />
                </div>
              ) : (
                open &&
                !isAdmin && <p className="border-t pt-4 text-xs text-slate-500">Claim this task to join the discussion.</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Activity" description="System-recorded changes. Entries cannot be edited." />
            <CardBody>
              <ActivityTimeline entries={task.activities} />
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          {mayUpdate && (
            <WorkPanel
              taskId={task.id}
              status={task.status}
              progress={task.progress}
              actualMinutes={task.actualMinutes}
              isAdmin={isAdmin}
            />
          )}

          <Card>
            <CardHeader title="Details" />
            <CardBody>
              <dl className="space-y-3 text-sm">
                <DetailRow label="Assignee">
                  {task.assignee ? (
                    <span className="flex items-center gap-2">
                      <Avatar name={task.assignee.name} color={task.assignee.avatarColor} size="sm" />
                      {task.assignee.name}
                    </span>
                  ) : (
                    <OpenBadge />
                  )}
                </DetailRow>
                <DetailRow label="Created by">
                  <span className="flex items-center gap-2">
                    <Avatar name={task.createdBy.name} color={task.createdBy.avatarColor} size="sm" />
                    {task.createdBy.name}
                  </span>
                </DetailRow>
                <DetailRow label="Due date">
                  <DueDate date={task.dueDate} status={task.status} />
                </DetailRow>
                <DetailRow label="Start date">{formatDate(task.startDate)}</DetailRow>
                <DetailRow label="Estimate">{formatMinutes(task.estimatedMinutes)}</DetailRow>
                <DetailRow label="Actual time">{formatMinutes(task.actualMinutes)}</DetailRow>
                <DetailRow label="Created">
                  <LocalTime value={task.createdAt} />
                </DetailRow>
                <DetailRow label="Updated">
                  <LocalTime value={task.updatedAt} />
                </DetailRow>
                {task.completedAt && (
                  <DetailRow label="Completed">
                    <LocalTime value={task.completedAt} />
                  </DetailRow>
                )}
                <DetailRow label="Tags">
                  {task.tags.length ? (
                    <span className="flex flex-wrap gap-1">
                      {task.tags.map((t) => (
                        <TagChip key={t.id} name={t.name} color={t.color} />
                      ))}
                    </span>
                  ) : (
                    <span className="text-slate-400">None</span>
                  )}
                </DetailRow>
              </dl>
            </CardBody>
          </Card>

          <AttachmentsPanel
            taskId={task.id}
            canUpload={mayUpdate}
            viewerId={user.id}
            isAdmin={isAdmin}
            attachments={task.attachments.map((a) => ({
              id: a.id,
              fileName: a.fileName,
              sizeBytes: a.sizeBytes,
              uploadedBy: a.uploadedBy,
              createdAt: a.createdAt.toISOString(),
            }))}
          />

          {isAdmin && (
            <AdminTaskActions
              employees={employees}
              task={{
                id: task.id,
                taskKey: task.taskKey,
                title: task.title,
                status: task.status,
                isArchived: task.isArchived,
                assignee: task.assignee ? { id: task.assignee.id, name: task.assignee.name } : null,
              }}
            />
          )}
        </div>
      </div>
    </>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[96px_1fr] items-start gap-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="min-w-0 text-slate-800">{children}</dd>
    </div>
  );
}
