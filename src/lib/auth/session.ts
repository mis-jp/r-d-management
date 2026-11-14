import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, signSession, verifySession } from "./token";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  jobTitle: string | null;
  avatarColor: string | null;
};

export async function createSession(userId: string, sessionVersion: number) {
  const token = await signSession({ sub: userId, ver: sessionVersion });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/**
 * Resolves the signed-in user from the session cookie. Role and active state always
 * come from the database, never from the token or the browser.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const payload = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!payload) return null;

  const user = await db.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      jobTitle: true,
      avatarColor: true,
      sessionVersion: true,
    },
  });
  if (!user || !user.isActive || user.sessionVersion !== payload.ver) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    jobTitle: user.jobTitle,
    avatarColor: user.avatarColor,
  };
});

/** For pages and layouts: redirects to login when there is no valid session. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** For admin-only pages: employees are sent back to their dashboard. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard?denied=1");
  return user;
}
