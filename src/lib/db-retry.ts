import "server-only";
import { Prisma } from "@prisma/client";

const POOL_TIMEOUT_RE =
  /Timed out fetching a new connection|connection pool|P2024|Can't reach database server|P1001|P1002|P1017|ETIMEDOUT|ECONNRESET|ECONNREFUSED|ConnectionReset|Server has gone away|Connection closed|kind: Closed/i;

export function isDbConnectivityError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // P2024 = pool timeout; P1001/P1002/P1017 = unreachable / closed.
    return (
      error.code === "P1001" ||
      error.code === "P1002" ||
      error.code === "P1017" ||
      error.code === "P2024"
    );
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }
  const msg = error instanceof Error ? error.message : String(error);
  return POOL_TIMEOUT_RE.test(msg);
}

function shouldReconnect(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Pool timeout: don't disconnect — that worsens contention. Just wait and retry.
    if (error.code === "P2024") return false;
    return error.code === "P1001" || error.code === "P1002" || error.code === "P1017";
  }
  const msg = error instanceof Error ? error.message : String(error);
  return /Can't reach|P1001|P1017|ECONNRESET|ConnectionReset|kind: Closed|Server has gone away/i.test(msg);
}

/** Retries transient Neon/Prisma connectivity and pool-timeout failures (incl. cold start). */
export async function withDbRetry<T>(fn: () => Promise<T>, attempts = 6): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isDbConnectivityError(error) || i === attempts - 1) throw error;

      if (shouldReconnect(error)) {
        try {
          const { db } = await import("@/lib/db");
          await db.$disconnect();
          await db.$connect();
        } catch {
          /* reconnect best-effort — Neon may still be waking */
        }
      }

      // Exponential backoff with floor so cold-start wakes get ~0.8s → ~12s total wait.
      const delayMs = Math.min(800 * 2 ** i, 8000);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastError;
}
