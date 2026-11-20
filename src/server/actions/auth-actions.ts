"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { fromZodError, toActionError, type FormState } from "@/lib/action-result";
import { checkRateLimit, resetRateLimit } from "@/lib/auth/rate-limit";
import { createSession, destroySession } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validations/user";
import { authenticate } from "@/server/services/user-service";

function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login") ? next : "/dashboard";
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return fromZodError(parsed.error);

  // Login rate limiting is off during development/setup.
  // Re-enable LOGIN_RATE_LIMIT when the app is ready for production use.
  const LOGIN_RATE_LIMIT = false;
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const key = `login:${ip}:${parsed.data.email}`;
  if (LOGIN_RATE_LIMIT) {
    const limit = checkRateLimit(key, 5, 15 * 60 * 1000);
    if (!limit.allowed) {
      const minutes = Math.ceil(limit.retryAfterMs / 60000);
      return {
        ok: false,
        error: `Too many sign-in attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
      };
    }
  } else {
    resetRateLimit(key);
  }

  let result: Awaited<ReturnType<typeof authenticate>>;
  try {
    result = await authenticate(parsed.data.email, parsed.data.password);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (/Can't reach database server|P1001|ECONNREFUSED|ETIMEDOUT/i.test(msg)) {
      return {
        ok: false,
        error: "Cannot reach the database. Check that MySQL is running and DATABASE_URL is correct.",
      };
    }
    return toActionError(error);
  }
  if (!result.ok) {
    return {
      ok: false,
      error:
        result.reason === "inactive"
          ? "This account has been deactivated. Contact your R&D administrator."
          : "Incorrect email or password.",
    };
  }

  if (LOGIN_RATE_LIMIT) resetRateLimit(key);
  await createSession(result.userId, result.sessionVersion);
  redirect(safeNext(formData.get("next")));
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
