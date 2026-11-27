import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .map((line) => line.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^"|"$/g, "")]),
);

console.log(`
Add these on Vercel → im269's projects → r-d-management → Settings → Environment Variables
(Production). Then Redeploy.

DATABASE_URL=
${env.DATABASE_URL}

SESSION_SECRET=
${env.SESSION_SECRET}

UPLOAD_DIR=
storage/uploads
`);
