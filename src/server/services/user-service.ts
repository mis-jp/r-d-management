import "server-only";
import type { z } from "zod";
import { db, type TxClient } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { AVATAR_COLORS } from "@/lib/constants";
import { conflict, forbidden, invalid, notFound } from "@/lib/errors";
import type {
  adminUpdateUserSchema,
  createUserSchema,
  updateProfileSchema,
} from "@/lib/validations/user";
import { userPublicSelect } from "@/server/repositories/user-repository";
import { logActivity } from "./activity-service";

// Used to keep login timing similar whether or not the email exists.
const DUMMY_HASH = "$2b$12$xUJXVYNiudUEwdUXZ8uGB.meLR/i44JdscvkZE0fLE.FLJfujmebm";

function requireAdmin(actor: SessionUser) {
  if (actor.role !== "ADMIN") throw forbidden("Only admins can manage users.");
}

function pickAvatarColor(seed: string) {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

async function ensureEmailAvailable(tx: TxClient, email: string, exceptUserId?: string) {
  const existing = await tx.user.findUnique({ where: { email }, select: { id: true } });
  if (existing && existing.id !== exceptUserId) throw conflict("Another account already uses that email address.");
}

/** Guards against leaving the department without any active admin. */
async function assertOtherActiveAdmin(tx: TxClient, userId: string) {
  const others = await tx.user.count({ where: { role: "ADMIN", isActive: true, id: { not: userId } } });
  if (others === 0) throw invalid("You cannot remove the last active admin account.");
}

export async function authenticate(email: string, password: string) {
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true, isActive: true, sessionVersion: true },
  });
  const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) return { ok: false as const, reason: "invalid" as const };
  if (!user.isActive) return { ok: false as const, reason: "inactive" as const };
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return { ok: true as const, userId: user.id, sessionVersion: user.sessionVersion };
}

export async function createUser(actor: SessionUser, input: z.infer<typeof createUserSchema>) {
  requireAdmin(actor);
  const passwordHash = await hashPassword(input.password);
  return db.$transaction(async (tx) => {
    await ensureEmailAvailable(tx, input.email);
    const user = await tx.user.create({
      data: {
        name: input.name,
        email: input.email,
        role: input.role,
        passwordHash,
        jobTitle: input.jobTitle ?? null,
        department: input.department ?? "Research & Development",
        phone: input.phone ?? null,
        bio: input.bio ?? null,
        avatarColor: input.avatarColor ?? pickAvatarColor(input.email),
      },
      select: { id: true, name: true, role: true },
    });
    await logActivity(tx, {
      actorId: actor.id,
      subjectUserId: user.id,
      action: "USER_CREATED",
      newValue: { name: user.name, role: user.role },
    });
    return user;
  });
}

export async function adminUpdateUser(actor: SessionUser, input: z.infer<typeof adminUpdateUserSchema>) {
  requireAdmin(actor);
  return db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: input.userId }, select: { id: true, role: true, email: true } });
    if (!user) throw notFound("User not found.");
    await ensureEmailAvailable(tx, input.email, user.id);

    if (user.role !== input.role) {
      if (user.id === actor.id) throw invalid("You cannot change your own role.");
      if (user.role === "ADMIN") await assertOtherActiveAdmin(tx, user.id);
    }
    const roleChanged = user.role !== input.role;

    await tx.user.update({
      where: { id: user.id },
      data: {
        name: input.name,
        email: input.email,
        role: input.role,
        jobTitle: input.jobTitle ?? null,
        department: input.department ?? null,
        phone: input.phone ?? null,
        bio: input.bio ?? null,
        avatarColor: input.avatarColor ?? undefined,
        // A role change revokes existing sessions so new permissions apply immediately.
        ...(roleChanged ? { sessionVersion: { increment: 1 } } : {}),
      },
    });
    if (roleChanged && input.role === "ADMIN") {
      // Admins do not hold assignments; return their active tasks to OPEN.
      await tx.task.updateMany({
        where: { assigneeId: user.id, status: { notIn: ["COMPLETED", "CANCELLED"] } },
        data: { assigneeId: null, claimedAt: null },
      });
    }
    await logActivity(tx, {
      actorId: actor.id,
      subjectUserId: user.id,
      action: "USER_UPDATED",
      oldValue: { role: user.role, email: user.email },
      newValue: { role: input.role, email: input.email },
    });
  });
}

export async function setUserActive(actor: SessionUser, userId: string, active: boolean) {
  requireAdmin(actor);
  if (userId === actor.id && !active) throw invalid("You cannot deactivate your own account.");
  return db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true, role: true, isActive: true } });
    if (!user) throw notFound("User not found.");
    if (user.isActive === active) return;
    if (!active && user.role === "ADMIN") await assertOtherActiveAdmin(tx, user.id);

    await tx.user.update({
      where: { id: user.id },
      data: { isActive: active, ...(active ? {} : { sessionVersion: { increment: 1 } }) },
    });
    await logActivity(tx, {
      actorId: actor.id,
      subjectUserId: user.id,
      action: active ? "USER_ACTIVATED" : "USER_DEACTIVATED",
    });
  });
}

export async function adminResetPassword(actor: SessionUser, userId: string, password: string) {
  requireAdmin(actor);
  if (userId === actor.id) throw invalid("Change your own password from your profile page.");
  const passwordHash = await hashPassword(password);
  await db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw notFound("User not found.");
    await tx.user.update({
      where: { id: user.id },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    });
    await logActivity(tx, { actorId: actor.id, subjectUserId: user.id, action: "USER_PASSWORD_RESET" });
  });
}

export async function updateOwnProfile(actor: SessionUser, input: z.infer<typeof updateProfileSchema>) {
  const user = await db.user.findUniqueOrThrow({
    where: { id: actor.id },
    select: { id: true, email: true, passwordHash: true },
  });
  const emailChanged = user.email !== input.email;
  if (emailChanged) {
    if (!input.currentPassword || !(await verifyPassword(input.currentPassword, user.passwordHash))) {
      throw invalid("Enter your current password to change your email address.");
    }
  }
  await db.$transaction(async (tx) => {
    if (emailChanged) await ensureEmailAvailable(tx, input.email, user.id);
    await tx.user.update({
      where: { id: user.id },
      data: {
        name: input.name,
        email: input.email,
        jobTitle: input.jobTitle ?? null,
        department: input.department ?? null,
        phone: input.phone ?? null,
        bio: input.bio ?? null,
        avatarColor: input.avatarColor ?? undefined,
      },
    });
    await logActivity(tx, {
      actorId: actor.id,
      subjectUserId: actor.id,
      action: "PROFILE_UPDATED",
      newValue: emailChanged ? { emailChanged: true } : undefined,
    });
  });
}

/** Returns the new session version so the caller can re-issue the current session cookie. */
export async function changeOwnPassword(actor: SessionUser, currentPassword: string, newPassword: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: actor.id }, select: { passwordHash: true } });
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw invalid("Your current password is incorrect.");
  }
  const passwordHash = await hashPassword(newPassword);
  return db.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: actor.id },
      data: { passwordHash, sessionVersion: { increment: 1 } },
      select: { sessionVersion: true },
    });
    await logActivity(tx, { actorId: actor.id, subjectUserId: actor.id, action: "PASSWORD_CHANGED" });
    return updated.sessionVersion;
  });
}

export function getOwnProfile(userId: string) {
  return db.user.findUniqueOrThrow({ where: { id: userId }, select: userPublicSelect });
}
