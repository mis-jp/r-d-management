"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fromZodError, toActionError, type ActionResult, type FormState } from "@/lib/action-result";
import { createSession, getCurrentUser, type SessionUser } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { formToObject, idSchema } from "@/lib/validations/common";
import {
  adminResetPasswordSchema,
  adminUpdateUserSchema,
  changePasswordSchema,
  createUserSchema,
  tagSchema,
  updateProfileSchema,
} from "@/lib/validations/user";
import * as users from "@/server/services/user-service";
import * as tags from "@/server/services/tag-service";

async function actor(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AppError("Your session has expired. Please sign in again.", "UNAUTHORIZED");
  return user;
}

function refresh() {
  revalidatePath("/", "layout");
}

// --- Admin: user management -------------------------------------------------

export async function createUserAction(_prev: FormState, formData: FormData): Promise<FormState> {
  let userId: string;
  try {
    const user = await actor();
    const parsed = createUserSchema.safeParse(formToObject(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    const created = await users.createUser(user, parsed.data);
    userId = created.id;
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  redirect(`/employees/${userId}?created=1`);
}

export async function updateUserAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const user = await actor();
    const parsed = adminUpdateUserSchema.safeParse(formToObject(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    await users.adminUpdateUser(user, parsed.data);
    refresh();
    return { ok: true, message: "Account updated." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function setUserActiveAction(userId: string, active: boolean): Promise<ActionResult> {
  try {
    const user = await actor();
    await users.setUserActive(user, idSchema.parse(userId), active === true);
    refresh();
    return { ok: true, message: active ? "Account activated." : "Account deactivated." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function resetPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const user = await actor();
    const parsed = adminResetPasswordSchema.safeParse(formToObject(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    await users.adminResetPassword(user, parsed.data.userId, parsed.data.password);
    refresh();
    return { ok: true, message: "Password reset. The user has been signed out of all sessions." };
  } catch (error) {
    return toActionError(error);
  }
}

// --- Self-service profile -------------------------------------------------

export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const user = await actor();
    const parsed = updateProfileSchema.safeParse(formToObject(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    await users.updateOwnProfile(user, parsed.data);
    refresh();
    return { ok: true, message: "Profile saved." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const user = await actor();
    const parsed = changePasswordSchema.safeParse(formToObject(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    const version = await users.changeOwnPassword(user, parsed.data.currentPassword, parsed.data.newPassword);
    // Other sessions are revoked by the version bump; keep this one signed in.
    await createSession(user.id, version);
    return { ok: true, message: "Password changed. Other sessions have been signed out." };
  } catch (error) {
    return toActionError(error);
  }
}

// --- Admin: tags -------------------------------------------------------------

export async function createTagAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const user = await actor();
    const parsed = tagSchema.safeParse(formToObject(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    await tags.createTag(user, parsed.data.name, parsed.data.color);
    refresh();
    return { ok: true, message: "Tag created." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateTagAction(input: { id: string; name: string; color?: string }): Promise<ActionResult> {
  try {
    const user = await actor();
    const parsed = tagSchema.safeParse(input);
    if (!parsed.success) return fromZodError(parsed.error);
    await tags.updateTag(user, idSchema.parse(input.id), parsed.data.name, parsed.data.color);
    refresh();
    return { ok: true, message: "Tag updated." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteTagAction(id: string): Promise<ActionResult> {
  try {
    const user = await actor();
    await tags.deleteTag(user, idSchema.parse(id));
    refresh();
    return { ok: true, message: "Tag deleted." };
  } catch (error) {
    return toActionError(error);
  }
}
