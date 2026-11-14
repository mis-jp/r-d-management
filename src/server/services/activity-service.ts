import "server-only";
import type { ActivityAction, Prisma } from "@prisma/client";
import type { TxClient } from "@/lib/db";

type ActivityInput = {
  actorId: string;
  action: ActivityAction;
  taskId?: string | null;
  subjectUserId?: string | null;
  oldValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
};

/** Activity entries are append-only; there is intentionally no update or delete API. */
export async function logActivity(tx: TxClient, input: ActivityInput) {
  await tx.activityLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      taskId: input.taskId ?? null,
      subjectUserId: input.subjectUserId ?? null,
      oldValue: input.oldValue,
      newValue: input.newValue,
    },
  });
}

export async function logActivities(tx: TxClient, inputs: ActivityInput[]) {
  if (!inputs.length) return;
  await tx.activityLog.createMany({
    data: inputs.map((input) => ({
      actorId: input.actorId,
      action: input.action,
      taskId: input.taskId ?? null,
      subjectUserId: input.subjectUserId ?? null,
      oldValue: input.oldValue,
      newValue: input.newValue,
    })),
  });
}
