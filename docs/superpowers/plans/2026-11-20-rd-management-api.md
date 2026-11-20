# R&D Management API Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox syntax.

**Goal:** Ship a self-contained R&D Management REST API under KGS-PURCHASE that uses only `db_rd_management`.

**Architecture:** Next.js App Router catch-all at `app/api/rd-management/[[...action]]/route.ts`, mysql2 pool scoped to the dedicated DB, bcrypt sessions, idempotent schema bootstrap + admin seed.

**Tech Stack:** Next.js 16 route handlers, mysql2/promise, bcryptjs (already in KGS-PURCHASE).

## Global Constraints

- Never DELETE/UPDATE/DROP anything in `db_purchase` or `db_kelin_inventory`
- Connect only to `db_rd_management`
- Public URL prefix: `/kgs-purchase/api/rd-management/`
- Admin seed email: `johnpaulpolendey22@gmail.com`

---

### Task 1: Database pool + schema bootstrap + admin seed

**Files:**
- Create: `C:\Kelin HRIS\hris3\acu\KGS-PURCHASE\app\api\rd-management\db.ts`
- Create: `C:\Kelin HRIS\hris3\acu\KGS-PURCHASE\app\api\rd-management\schema.ts`
- Create: `C:\Kelin HRIS\hris3\acu\KGS-PURCHASE\app\api\rd-management\types.ts`
- Modify: `C:\Kelin HRIS\hris3\acu\KGS-PURCHASE\.env.example` (add `MYSQL_RD_DATABASE`)
- Modify: `C:\Kelin HRIS\hris3\acu\KGS-PURCHASE\.env` (add `MYSQL_RD_DATABASE=db_rd_management`)

- [ ] Create database + tables via script using existing MYSQL_* credentials
- [ ] Seed admin if missing
- [ ] Verify with `SELECT DATABASE()` / `SHOW TABLES`

### Task 2: HTTP helpers + auth (login/logout/me)

**Files:**
- Create: `...\rd-management\http.ts`
- Create: `...\rd-management\auth.ts`

- [ ] Implement bcrypt verify/hash, session create/revoke, requireAuth
- [ ] Expose health + auth actions

### Task 3: Domain services + catch-all route

**Files:**
- Create: `...\rd-management\users.ts`
- Create: `...\rd-management\tasks.ts`
- Create: `...\rd-management\support.ts`
- Create: `...\rd-management\[[...action]]\route.ts`

- [ ] Users / tasks / tags / comments / activity / notifications / metrics / search
- [ ] Wire `[[...action]]` GET/POST/OPTIONS with CORS

### Task 4: Smoke-test against live MySQL

- [ ] Call health, login as admin, users_list, tasks_create
- [ ] Confirm zero impact on other databases
