import "server-only";
import { Prisma } from "@prisma/client";

export function isDbConnectivityError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P1001" || error.code === "P1017" || error.code === "P1002";
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }
  const msg = error instanceof Error ? error.message : String(error);
  return /Can't reach database server|P1001|P1002|P1017|ETIMEDOUT|ECONNRESET|ECONNREFUSED|ConnectionReset|Server has gone away/i.test(
    msg,
  );
}

/** Retries transient MySQL/Prisma connectivity failures (common on remote hosts). */
export async function withDbRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isDbConnectivityError(error) || i === attempts - 1) throw error;
      try {
        const { db } = await import("@/lib/db");
        await db.$disconnect();
        await db.$connect();
      } catch {
        /* reconnect best-effort */
      }
      await new Promise((r) => setTimeout(r, 400 * 2 ** i));
    }
  }
  throw lastError;
}
