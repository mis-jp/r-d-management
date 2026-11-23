import { readFileSync, writeFileSync } from "node:fs";

const pulled = Object.fromEntries(
  readFileSync(".env.vercel", "utf8")
    .split(/\r?\n/)
    .map((line) => line.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^"|"$/g, "")]),
);

const databaseUrl =
  pulled.POSTGRES_PRISMA_URL ||
  pulled.DATABASE_URL ||
  pulled.DATABASE_URL_UNPOOLED;

if (!databaseUrl?.startsWith("postgres")) {
  console.error("No Neon Postgres URL in .env.vercel");
  process.exit(1);
}

const session =
  pulled.SESSION_SECRET && !pulled.SESSION_SECRET.includes("SENSITIVE")
    ? pulled.SESSION_SECRET
    : "e79OPaPAExgDL3mBsnJZ7XJP77Tjff16yiE6jKUspjzflMx4uUAYDzUPvzDkSmF9";

writeFileSync(
  ".env",
  [
    `# Neon Postgres — reachable from Vercel (unlike 190.92.233.232 MySQL).`,
    `DATABASE_URL="${databaseUrl}"`,
    `SESSION_SECRET="${session}"`,
    `UPLOAD_DIR="storage/uploads"`,
    `LOGIN_RATE_LIMIT=false`,
    "",
  ].join("\n"),
);

console.log("Wrote .env with Neon DATABASE_URL");
