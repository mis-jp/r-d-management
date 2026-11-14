# R&D Task Management System

Internal web app for the Research & Development department. Admins create, assign, and review research tasks or publish them as **OPEN** for the team to claim. Employees track status, progress, and time on their own work.

Built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Prisma 6, and MySQL.

## Features

- **Roles:** `ADMIN` and `EMPLOYEE`, enforced on the server for every page, action, and download.
- **Tasks:** create, edit, assign, reassign, return to OPEN, approve or send back from review, reopen, cancel, archive, and restore. Each task gets a readable key such as `RD-001`.
- **Claiming OPEN tasks:** claims are atomic, so if two employees click "Claim" at the same time, only one wins.
- **Status and progress rules:**
  - Not Started is always 0%.
  - Completed is always 100% and records the completion time.
  - Raising progress on a Not Started task moves it to In Progress.
  - Reopening a completed task without a progress value sets it to 90%.
- **Collaboration:** comments with `@mentions`, file attachments (10 MB maximum, common document and image types), a full activity history, and in-app notifications.
- **Views:** list, board, and calendar (month or week). Search, filters, sorting, and pagination are stored in the URL.
- **Dashboards:**
  - Admin: overview, team workload, and reports with selectable date ranges and charts.
  - Employee: personal dashboard.
- **User management (admin):**
  - Add employees or users.
  - Edit profile details and role, reset passwords, and activate or deactivate accounts.
  - The last active admin can never be demoted or deactivated.
- **Profile (every user, including admins):** edit name, email, job title, department, phone, bio, and avatar color, and change your password. Changing your email requires your current password.
- **Settings (admin):** manage tags.

## Requirements

- Node.js 20.19+ (22 LTS recommended)
- MySQL 8.0+ (or MariaDB 10.6+)

## Environment variables

Copy `.env.example` to `.env` and fill in the values. Never commit `.env`.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | MySQL connection string, e.g. `mysql://USER:PASSWORD@localhost:3306/rd_tasks` |
| `SESSION_SECRET` | Random string, at least 32 characters, used to sign session cookies |
| `UPLOAD_DIR` | Where attachments are stored on disk (default `storage/uploads`) |

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

## Setup

```bash
# 1. Create the database (in the MySQL client)
CREATE DATABASE rd_tasks CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 2. Install dependencies (also generates the Prisma client)
npm install

# 3. Apply migrations
npm run db:deploy        # or `npm run db:migrate` while developing the schema

# 4. Load demo data (refuses to run when NODE_ENV=production; wipes existing data)
npm run db:seed

# 5. Start the dev server
npm run dev              # http://localhost:3000
```

Production build:

```bash
npm run build
npm run start
```

> **Windows note:** the project folder name contains `&`, which breaks npm's `.cmd` shims (`npx prisma` and similar fail with "'D' is not recognized"). All npm scripts therefore call the tools through `node node_modules/...`. Use the `npm run ...` scripts instead of `npx`.

### Other scripts

| Script | What it does |
| --- | --- |
| `npm run lint` | ESLint (flat config) |
| `npm run typecheck` | TypeScript with no output |
| `npm test` | Vitest unit tests (task rules, permissions, metrics) |
| `npm run db:generate` | Regenerate the Prisma client |
| `npm run db:reset` | Drop and re-create the database schema (without seeding) |

## Demo credentials (seed data only)

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@rnd.local` | `Password123!` |
| Employee | `maria.santos@rnd.local` | `Password123!` |

Other employees: `james.lee`, `aisha.khan`, `carlos.reyes`, and `nina.patel`, all `@rnd.local`. `tom.becker@rnd.local` is seeded as an inactive account. **Change or remove these accounts before any real deployment.** The login page shows the demo hint only outside production.

## Architecture

```
prisma/                 schema, migrations, seed
src/proxy.ts            fast session-cookie gate (redirects to /login, 401 for /api)
src/app/(auth)          login
src/app/(app)           authenticated pages (dashboard, tasks, board, calendar, team, reports, ...)
src/app/api/attachments authenticated file download
src/server/actions      Server Actions: validate input with Zod, call services, revalidate
src/server/services     business logic and authorization (tasks, users, metrics, notifications)
src/server/repositories Prisma queries and visibility filters
src/lib                 auth/session, validation schemas, task rules, metrics, permissions
src/components          UI primitives, layout shell, task/chart/dashboard components
```

- **Sessions:** an HS256 JWT in an httpOnly cookie. Every request re-reads the user's role and active state from the database. Changing a password, changing a role, or deactivating an account bumps `sessionVersion`, which signs out the user's existing sessions.
- **Authorization:** checked in the service layer, so it is not bypassed by calling a Server Action directly. Employees see only their own tasks plus OPEN tasks.
- **Passwords:** hashed with bcrypt (12 rounds). Must be at least 10 characters and include a letter and a number. Login is rate-limited to 5 attempts per 15 minutes per IP and email.

## Metric definitions

- **Tasks in period:** tasks created by the end of the period that were not cancelled and not completed before the period started.
- **Completion rate:** tasks completed within the period divided by tasks in period. Shown as "—" when there are none.
- **Average progress:** mean progress of active (not completed, not cancelled) tasks.
- **Overdue:** an active task whose due date is before today.
- **Average completion time:** days from creation to completion for tasks completed in the period.

## Known limitations

- The login rate limiter is in memory. It resets on restart and is not shared across multiple server instances. Use Redis or similar for multi-instance deployments.
- Attachments are stored on local disk (`UPLOAD_DIR`). Use object storage for multi-instance or serverless hosting.
- Dashboard and report metrics are computed in JavaScript from the tasks in scope. This is fine for a department-sized dataset; very large datasets would need SQL aggregation.
- Board view uses status menus instead of drag-and-drop.
- Saved views are just shareable URLs (filters live in the query string).
- Notifications are in-app only (no email). They update on navigation, not in real time.
