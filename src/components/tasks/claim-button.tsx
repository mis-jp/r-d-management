"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Hand } from "lucide-react";
import { toast } from "sonner";
import { claimTaskAction } from "@/server/actions/task-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

type Props = {
  taskId: string;
  taskKey: string;
  title: string;
  dueLabel: string;
  size?: "sm" | "md";
  goToTask?: boolean;
};

export function ClaimButton({ taskId, taskKey, title, dueLabel, size = "sm", goToTask = false }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function claim() {
    startTransition(async () => {
      const res = await claimTaskAction(taskId);
      setOpen(false);
      if (res.ok) {
        toast.success(res.message ?? "Task claimed.");
        if (goToTask) router.refresh();
        else router.push(`/tasks/${taskKey}`);
      } else {
        toast.error(res.error);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={size}>
          <Hand /> Claim task
        </Button>
      </DialogTrigger>
      <DialogContent title="Claim this task?" description="It will be assigned to you and removed from the OPEN list.">
        <dl className="space-y-2 rounded-lg border bg-slate-50 p-3 text-sm">
          <div className="flex gap-2">
            <dt className="w-16 shrink-0 text-slate-500">Task</dt>
            <dd className="font-medium text-slate-900">
              <span className="font-mono text-xs text-slate-500">{taskKey}</span> {title}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-16 shrink-0 text-slate-500">Due</dt>
            <dd className="text-slate-900">{dueLabel}</dd>
          </div>
        </dl>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={claim} loading={pending}>
            Confirm claim
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
