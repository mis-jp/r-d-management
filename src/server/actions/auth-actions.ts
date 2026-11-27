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
  const identifier = formData.get("identifier") ?? formData.get("email");
  const parsed = loginSchema.safeParse({ identifier, password: formData.get("password") });
  if (!parsed.success) return fromZodError(parsed.error);

  // On by default in production. Set LOGIN_RATE_LIMIT=0 to disable (local QA only).
  const rateLimitEnabled = process.env.LOGIN_RATE_LIMIT
    ? !["0", "false", "off"].includes(process.env.LOGIN_RATE_LIMIT.trim().toLowerCase())
    : process.env.NODE_ENV === "production";
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const key = `login:${ip}:${parsed.data.identifier.toLowerCase()}`;
  if (rateLimitEnabled) {
    const limit = checkRateLimit(key, 5, 15 * 60 * 1000);
    if (!limit.allowed) {
      const minutes = Math.ceil(limit.retryAfterMs / 60000);
      return {
        ok: false,
        error: `Too many sign-in attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
      };
    }
  }

  let result: Awaited<ReturnType<typeof authenticate>>;
  try {
    result = await authenticate(parsed.data.identifier, parsed.data.password);
  } catch (error) {
    return loginFailure(error);
  }
  if (!result.ok) {
    return {
      ok: false,
      error:
        result.reason === "inactive"
          ? "This account has been deactivated. Contact your R&D administrator."
          : "Incorrect employee ID / email or password.",
    };
  }

  if (rateLimitEnabled) resetRateLimit(key);
  try {
    await createSession(result.userId, result.sessionVersion);
  } catch (error) {
    return loginFailure(error);
  }
  redirect(safeNext(formData.get("next")));
}

function loginFailure(error: unknown): FormState {
  const msg = error instanceof Error ? error.message : String(error);
  if (/Environment variable not found:\s*DATABASE_URL|DATABASE_URL/i.test(msg) && /not found|invalid|undefined/i.test(msg)) {
    return {
      ok: false,
      error: "Server is missing DATABASE_URL. Add it in the hosting environment settings and redeploy.",
    };
  }
  if (/SESSION_SECRET/i.test(msg)) {
    return {
      ok: false,
      error: "Server is missing SESSION_SECRET. Add a 32+ character secret in the hosting environment and redeploy.",
    };
  }
  if (
    /Can't reach database server|P1001|P1002|P1017|ECONNREFUSED|ETIMEDOUT|Server has gone away|Host '.*' is not allowed to connect/i.test(
      msg,
    )
  ) {
    return {
      ok: false,
      error: "Cannot reach the database right now. Confirm DATABASE_URL (Neon pooler) and try again in a moment.",
    };
  }
  if (/Access denied for user|P1000|authentication failed/i.test(msg)) {
    return {
      ok: false,
      error: "Database rejected the credentials in DATABASE_URL. Update the connection string and redeploy.",
    };
  }
  return toActionError(error);
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
