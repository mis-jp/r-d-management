"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { TaskStatus } from "@prisma/client";
import { Archive, ArchiveRestore, Ban, CheckCircle2, Hand, Pencil, RotateCcw, Undo2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/action-result";
import {
  assignTaskAction,
  returnToOpenAction,
  setArchivedAction,
  updateWorkAction,
} from "@/server/actions/task-actions";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form-controls";

type Employee = { id: string; name: string; jobTitle: string | null };

type Props = {
  task: {
    id: string;
    taskKey: string;
    title: string;
    status: TaskStatus;
    isArchived: boolean;
    assignee: { id: string; name: string } | null;
  };
  employees: Employee[];
};

type DialogKind = "assign" | "open" | "archive" | "cancel" | null;

export function AdminTaskActions({ task, employees }: Props) {
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [pending, startTransition] = useTransition();
  const [assigneeId, setAssigneeId] = useState("");
  const [query, setQuery] = useState("");
  const [reason, setReason] = useState("");

  const closed = task.status === "COMPLETED" || task.status === "CANCELLED";

  function run(fn: () => Promise<ActionResult>, after?: () => void) {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        toast.success(res.message ?? "Saved.");
        setDialog(null);
        setReason("");
        setAssigneeId("");
        after?.();
      } else toast.error(res.error);
    });
  }

  const status = (s: TaskStatus) => () => run(() => updateWorkAction({ taskId: task.id, status: s }));

  const candidates = employees.filter(
    (e) => e.id !== task.assignee?.id && (!query || e.name.toLowerCase().includes(query.toLowerCase())),
  );

  return (
    <Card id="assign">
      <CardHeader title="Admin actions" />
      <CardBody className="space-y-2">
        {task.status === "IN_REVIEW" && (
          <div className="mb-3 rounded-lg border border-purple-200 bg-purple-50 p-3">
            <p className="text-sm font-medium text-purple-900">Waiting for your review</p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="success" onClick={status("COMPLETED")} loading={pending}>
                <CheckCircle2 /> Approve
              </Button>
              <Button size="sm" variant="outline" onClick={status("IN_PROGRESS")} disabled={pending}>
                <Undo2 /> Send back
              </Button>
            </div>
          </div>
        )}

        <Button asChild variant="outline" className="w-full justify-start">
          <Link href={`/tasks/${task.taskKey}/edit`}>
            <Pencil /> Edit details
          </Link>
        </Button>

        {!task.isArchived && (
          <Button variant="outline" className="w-full justify-start" onClick={() => setDialog("assign")}>
            <UserPlus /> {task.assignee ? "Reassign" : "Assign to employee"}
          </Button>
        )}

        {!task.isArchived && task.assignee && !closed && (
          <Button variant="outline" className="w-full justify-start" onClick={() => setDialog("open")}>
            <Hand /> Return to OPEN
          </Button>
        )}

        {!task.isArchived && closed && (
          <Button variant="outline" className="w-full justify-start" onClick={status("IN_PROGRESS")} disabled={pending}>
            <RotateCcw /> Reopen task
          </Button>
        )}

        {!task.isArchived && !closed && (
          <Button variant="outline" className="w-full justify-start text-slate-700" onClick={() => setDialog("cancel")}>
            <Ban /> Cancel task
          </Button>
        )}

        {task.isArchived ? (
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => run(() => setArchivedAction(task.id, false))}
            disabled={pending}
          >
            <ArchiveRestore /> Restore from archive
          </Button>
        ) : (
          <Button variant="outline" className="w-full justify-start text-red-700" onClick={() => setDialog("archive")}>
            <Archive /> Archive
          </Button>
        )}
      </CardBody>

      <Dialog open={dialog === "assign"} onOpenChange={(o) => setDialog(o ? "assign" : null)}>
        <DialogContent
          title={task.assignee ? `Reassign ${task.taskKey}` : `Assign ${task.taskKey}`}
          description={
            task.assignee ? `Currently assigned to ${task.assignee.name}. Both people will be notified.` : "The employee will be notified."
          }
        >
          <div className="space-y-3">
            <Field label="Search employees" htmlFor="assign-search">
              <Input id="assign-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type a name…" />
            </Field>
            <Field label="Employee" htmlFor="assign-employee" required>
              <Select id="assign-employee" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} size={6} className="h-auto py-1">
                {candidates.map((e) => (
                  <option key={e.id} value={e.id} className="rounded px-2 py-1">
                    {e.name}
                    {e.jobTitle ? ` — ${e.jobTitle}` : ""}
                  </option>
                ))}
              </Select>
            </Field>
            {candidates.length === 0 && <p className="text-xs text-slate-500">No matching active employees.</p>}
            <Field label="Reason (optional)" htmlFor="assign-reason">
              <Textarea id="assign-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={500} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              disabled={!assigneeId}
              loading={pending}
              onClick={() => run(() => assignTaskAction({ taskId: task.id, assigneeId, reason: reason || undefined }))}
            >
              {task.assignee ? "Reassign" : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "open"} onOpenChange={(o) => setDialog(o ? "open" : null)}>
        <DialogContent
          title="Return this task to OPEN?"
          description={`${task.assignee?.name ?? "The assignee"} will be unassigned and notified. Any employee can then claim it.`}
        >
          <Field label="Reason (optional)" htmlFor="open-reason">
            <Textarea id="open-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={500} />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Keep assignment
            </Button>
            <Button loading={pending} onClick={() => run(() => returnToOpenAction({ taskId: task.id, reason: reason || undefined }))}>
              Return to OPEN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "cancel"} onOpenChange={(o) => setDialog(o ? "cancel" : null)}>
        <DialogContent title="Cancel this task?" description="The task stays in history with status Cancelled. You can reopen it later.">
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Keep task
            </Button>
            <Button variant="danger" loading={pending} onClick={status("CANCELLED")}>
              Cancel task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "archive"} onOpenChange={(o) => setDialog(o ? "archive" : null)}>
        <DialogContent
          title="Archive this task?"
          description="Archived tasks are hidden from boards, lists and metrics, but keep their full history. You can restore them anytime."
        >
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button variant="danger" loading={pending} onClick={() => run(() => setArchivedAction(task.id, true))}>
              Archive task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
