import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

function parseEnv(file) {
  const out = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^"|"$/g, "");
  }
  return out;
}

const envFile = resolve(".env.vercel");
const pulled = parseEnv(envFile);
const databaseUrl =
  pulled.DATABASE_URL_UNPOOLED ||
  pulled.POSTGRES_URL_NON_POOLING ||
  pulled.POSTGRES_PRISMA_URL ||
  pulled.DATABASE_URL;

if (!databaseUrl?.startsWith("postgres")) {
  console.error("No Postgres DATABASE_URL found in .env.vercel");
  process.exit(1);
}

const sessionSecret =
  pulled.SESSION_SECRET && !pulled.SESSION_SECRET.includes("SENSITIVE")
    ? pulled.SESSION_SECRET
    : "e79OPaPAExgDL3mBsnJZ7XJP77Tjff16yiE6jKUspjzflMx4uUAYDzUPvzDkSmF9";

writeFileSync(
  ".env",
  [
    `# Production/shared Neon Postgres (Vercel cannot reach the old MySQL host).`,
    `DATABASE_URL="${databaseUrl}"`,
    `SESSION_SECRET="${sessionSecret}"`,
    `UPLOAD_DIR="storage/uploads"`,
    `LOGIN_RATE_LIMIT=false`,
    "",
  ].join("\n"),
);

const env = { ...process.env, DATABASE_URL: databaseUrl, SESSION_SECRET: sessionSecret };

function run(command, args) {
  console.log(">", command, args.join(" "));
  // shell:false — path contains "R&D" which breaks cmd.exe on "&"
  const result = spawnSync(command, args, { stdio: "inherit", env, shell: false });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const prismaCli = resolve("node_modules/prisma/build/index.js");
const tsx = resolve("node_modules/tsx/dist/cli.mjs");
const seed = resolve("prisma/seed.ts");

run(process.execPath, [prismaCli, "generate"]);
run(process.execPath, [prismaCli, "db", "push", "--accept-data-loss"]);
run(process.execPath, [tsx, seed]);
console.log("Neon schema + seed complete.");
