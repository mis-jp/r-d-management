import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/** Public user fields. Password hashes are never selected outside the auth service. */
export const userPublicSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  jobTitle: true,
  department: true,
  phone: true,
  bio: true,
  avatarColor: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type PublicUser = Prisma.UserGetPayload<{ select: typeof userPublicSelect }>;

export function getUserById(id: string) {
  return db.user.findUnique({ where: { id }, select: userPublicSelect });
}

/** Active employees who can receive task assignments. */
export function listAssignableEmployees() {
  return db.user.findMany({
    where: { isActive: true, role: "EMPLOYEE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, jobTitle: true, avatarColor: true },
  });
}

export function listUsers(filters: { q?: string; role?: "ADMIN" | "EMPLOYEE"; status?: "active" | "inactive" }) {
  const where: Prisma.UserWhereInput = {};
  if (filters.q) where.OR = [{ name: { contains: filters.q } }, { email: { contains: filters.q } }];
  if (filters.role) where.role = filters.role;
  if (filters.status) where.isActive = filters.status === "active";
  return db.user.findMany({ where, orderBy: [{ isActive: "desc" }, { name: "asc" }], select: userPublicSelect });
}

export function listMentionableUsers() {
  return db.user.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });
}
