"use client";

import { useState, useTransition } from "react";
import type { TaskStatus } from "@prisma/client";
import { toast } from "sonner";
import { EMPLOYEE_STATUSES, STATUS_LABELS, TASK_STATUSES } from "@/lib/constants";
import { logTimeAction, updateWorkAction } from "@/server/actions/task-actions";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/form-controls";
import { ProgressBar } from "@/components/ui/misc";
import { fieldError, useActionToast } from "@/components/shared/use-action-toast";
import { useFormAction } from "@/components/shared/use-form-action";

type Props = {
  taskId: string;
  status: TaskStatus;
  progress: number;
  actualMinutes: number | null;
  isAdmin: boolean;
};

/** Mirrors the server rule in `resolveWorkState` so the preview matches what will be saved. */
function previewProgress(status: TaskStatus, progress: number) {
  if (status === "NOT_STARTED") return 0;
  if (status === "COMPLETED") return 100;
  return progress;
}

export function WorkPanel({ taskId, status, progress, actualMinutes, isAdmin }: Props) {
  const [nextStatus, setNextStatus] = useState<TaskStatus>(status);
  const [nextProgress, setNextProgress] = useState(progress);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [synced, setSynced] = useState({ status, progress });
  if (synced.status !== status || synced.progress !== progress) {
    setSynced({ status, progress });
    setNextStatus(status);
    setNextProgress(progress);
  }

  const locked = !isAdmin && (status === "COMPLETED" || status === "CANCELLED");
  const options = isAdmin ? TASK_STATUSES : EMPLOYEE_STATUSES;
  const shown = previewProgress(nextStatus, nextProgress);
  const progressEditable = nextStatus !== "NOT_STARTED" && nextStatus !== "COMPLETED";
  const dirty = nextStatus !== status || shown !== progress;

  function save() {
    startTransition(async () => {
      const res = await updateWorkAction({
        taskId,
        status: nextStatus !== status ? nextStatus : undefined,
        progress: progressEditable ? nextProgress : undefined,
      });
      if (res.ok) toast.success(nextStatus === "COMPLETED" && status !== "COMPLETED" ? "Task marked as completed." : "Progress saved.");
      else toast.error(res.error);
    });
  }

  const time = useFormAction(logTimeAction);
  useActionToast(time.state);

  return (
    <Card>
      <CardHeader title="Status & progress" />
      <CardBody className="space-y-4">
        {locked ? (
          <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            This task is {STATUS_LABELS[status].toLowerCase()}. Ask an admin to reopen it if more work is needed.
          </p>
        ) : (
          <>
            <Field label="Status" htmlFor="work-status">
              <Select id="work-status" value={nextStatus} onChange={(e) => setNextStatus(e.target.value as TaskStatus)}>
                {options.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="work-progress" className="text-sm font-medium text-slate-700">
                  Progress
                </label>
                <span className="text-sm font-semibold tabular-nums text-slate-900">{shown}%</span>
              </div>
              <input
                id="work-progress"
                type="range"
                min={0}
                max={100}
                step={5}
                value={shown}
                disabled={!progressEditable}
                onChange={(e) => setNextProgress(Number(e.target.value))}
                className="w-full disabled:opacity-50"
                aria-valuetext={`${shown} percent`}
              />
              <p className="text-xs text-slate-500">
                {nextStatus === "NOT_STARTED"
                  ? "Not started tasks are always 0%."
                  : nextStatus === "COMPLETED"
                    ? "Completed tasks are always 100%."
                    : "Drag to update how far along the work is."}
              </p>
            </div>
            <Button
              className="w-full"
              disabled={!dirty}
              loading={pending}
              variant={nextStatus === "COMPLETED" && status !== "COMPLETED" ? "success" : "primary"}
              onClick={() => (nextStatus === "COMPLETED" && status !== "COMPLETED" ? setConfirmOpen(true) : save())}
            >
              {nextStatus === "COMPLETED" && status !== "COMPLETED" ? "Mark as completed" : "Save progress"}
            </Button>
          </>
        )}

        <form onSubmit={time.onSubmit} className="border-t pt-4" noValidate>
          <input type="hidden" name="taskId" value={taskId} />
          <Field label="Actual time spent (hours)" htmlFor="actualMinutes" error={fieldError(time.state, "actualMinutes")}>
            <div className="flex gap-2">
              <Input
                id="actualMinutes"
                name="actualMinutes"
                type="number"
                min={0}
                step={0.25}
                defaultValue={actualMinutes !== null ? Math.round((actualMinutes / 60) * 100) / 100 : ""}
                placeholder="e.g. 4.5"
              />
              <Button type="submit" variant="outline" loading={time.pending}>
                Save
              </Button>
            </div>
          </Field>
        </form>
      </CardBody>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent
          title="Mark this task as completed?"
          description="Progress will be set to 100% and the completion time recorded. Admins will be notified."
        >
          <ProgressBar value={100} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Not yet
            </Button>
            <Button
              variant="success"
              onClick={() => {
                setConfirmOpen(false);
                save();
              }}
            >
              Yes, it&apos;s done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
