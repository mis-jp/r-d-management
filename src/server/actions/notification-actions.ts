"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { getCurrentUser } from "@/lib/auth/session";
import { idSchema } from "@/lib/validations/common";
import { markAllRead, markRead } from "@/server/services/notification-service";

export async function markNotificationReadAction(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in again." };
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: "Invalid notification." };
  await markRead(user.id, parsed.data);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in again." };
  await markAllRead(user.id);
  revalidatePath("/", "layout");
  return { ok: true, message: "All notifications marked as read." };
}
