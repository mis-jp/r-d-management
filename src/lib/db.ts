import "server-only";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Neon pooler + Prisma: keep the client pool small so we don't exhaust
 * the remote pool (default Prisma limit is ~num_cpus*2+1 ≈ 17).
 * Prefer pooler host + pgbouncer; allow cold-start headroom via connect_timeout.
 */
function datasourceUrl(): string | undefined {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) return undefined;

  try {
    const url = new URL(raw);
    if (!url.searchParams.has("pgbouncer")) url.searchParams.set("pgbouncer", "true");
    // Small pool per Next server instance — avoids stampedes against Neon.
    if (!url.searchParams.has("connection_limit")) url.searchParams.set("connection_limit", "3");
    if (!url.searchParams.has("pool_timeout")) url.searchParams.set("pool_timeout", "30");
    // Neon compute wake can exceed 10s; give TCP connect time to succeed.
    if (!url.searchParams.has("connect_timeout")) url.searchParams.set("connect_timeout", "30");
    // channel_binding=require can break some pooled TLS paths; prefer prefer/disable.
    if (url.searchParams.get("channel_binding") === "require") {
      url.searchParams.set("channel_binding", "prefer");
    }
    return url.toString();
  } catch {
    return raw;
  }
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: datasourceUrl() } },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export type TxClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];
