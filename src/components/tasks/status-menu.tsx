"use client";

import { useState, useTransition } from "react";
import type { TaskStatus } from "@prisma/client";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { EMPLOYEE_STATUSES, STATUS_LABELS, TASK_STATUSES } from "@/lib/constants";
import { updateWorkAction } from "@/server/actions/task-actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./badges";

type Props = {
  taskId: string;
  taskKey: string;
  title: string;
  status: TaskStatus;
  isAdmin: boolean;
};

/** Quick status change used on boards and lists. Server re-checks every permission. */
export function StatusMenu({ taskId, taskKey, title, status, isAdmin }: Props) {
  const [pending, startTransition] = useTransition();
  const [confirmComplete, setConfirmComplete] = useState(false);
  const options = isAdmin ? TASK_STATUSES : EMPLOYEE_STATUSES;
  const locked = !isAdmin && (status === "COMPLETED" || status === "CANCELLED");

  function apply(next: TaskStatus) {
    startTransition(async () => {
      const res = await updateWorkAction({ taskId, status: next });
      if (res.ok) toast.success(`${taskKey} moved to ${STATUS_LABELS[next]}.`);
      else toast.error(res.error);
    });
  }

  if (locked) return <StatusBadge status={status} />;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="inline-flex items-center gap-0.5 rounded-md disabled:opacity-50"
          disabled={pending}
          aria-label={`Change status of ${taskKey} (currently ${STATUS_LABELS[status]})`}
        >
          <StatusBadge status={status} />
          <ChevronDown className="size-3 text-slate-400" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Move to</DropdownMenuLabel>
          {options
            .filter((s) => s !== status)
            .map((s) => (
              <DropdownMenuItem key={s} onSelect={() => (s === "COMPLETED" ? setConfirmComplete(true) : apply(s))}>
                <StatusBadge status={s} />
              </DropdownMenuItem>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={confirmComplete} onOpenChange={setConfirmComplete}>
        <DialogContent
          title="Mark task as completed?"
          description={`${taskKey}: ${title} will be set to 100% progress and its completion time recorded.`}
        >
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmComplete(false)}>
              Cancel
            </Button>
            <Button
              variant="success"
              onClick={() => {
                setConfirmComplete(false);
                apply("COMPLETED");
              }}
            >
              Mark completed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
