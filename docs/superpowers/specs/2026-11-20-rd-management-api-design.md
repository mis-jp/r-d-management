# R&D Management API — Design

**Date:** 2026-11-20  
**Status:** Approved  
**Host project:** `C:\Kelin HRIS\hris3\acu\KGS-PURCHASE`  
**Public base:** `http://190.92.233.232/kgs-purchase/api/rd-management/`

## Goal

Provide a self-contained backend (MySQL + Next.js route handlers) for the R&D Task Management app, deployed with KGS Purchasing, without reading, updating, or deleting any existing purchase/inventory tables or data.

## Decisions

| Topic | Choice |
|---|---|
| Approach | Self-contained module under `app/api/rd-management/` (same pattern as `product-directory`) |
| Database | New dedicated MySQL database `db_rd_management` |
| Credentials | Reuse `MYSQL_HOST` / `MYSQL_PORT` / `MYSQL_USER` / `MYSQL_PASSWORD` from KGS-PURCHASE `.env`; add `MYSQL_RD_DATABASE=db_rd_management` |
| Auth | Own R&D users + bcrypt + opaque session tokens in `rd_sessions` (not KGS `app_users`) |
| Admin seed | Email `johnpaulpolendey22@gmail.com`, role `ADMIN` (password from env / one-time seed) |
| Safety | Pool connects only to `db_rd_management`; no `DROP`/`DELETE` against other databases |

## Schema (tables in `db_rd_management` only)

- `rd_users` — accounts (ADMIN / EMPLOYEE)
- `rd_sessions` — login tokens
- `rd_tasks` — work items + claim/status/progress
- `rd_tags`, `rd_task_tags`
- `rd_comments`
- `rd_activity_logs`
- `rd_notifications`
- `rd_attachments` (metadata; files on disk under project storage)
- `rd_sequences` — task key counters

Bootstrap: `CREATE DATABASE IF NOT EXISTS` + `CREATE TABLE IF NOT EXISTS` on first API use. Never alter tables outside this database.

## API surface (v1)

Response envelope: `{ status: "success"|"error", success?: true, data? | message }`

| Method | Action | Auth |
|---|---|---|
| GET | `health` | public |
| POST | `auth_login` | public |
| POST | `auth_logout` | session |
| GET/POST | `auth_me` | session |
| GET/POST | `users_list`, `users_get`, `users_create`, `users_update` | session (admin for create/update role) |
| GET/POST | `tasks_list`, `tasks_get`, `tasks_create`, `tasks_update`, `tasks_claim`, `tasks_status` | session |
| GET/POST | `tags_list`, `tags_upsert` | session |
| POST | `comments_add`, `comments_list` | session |
| GET/POST | `activity_list`, `notifications_list`, `notifications_read` | session |
| GET/POST | `metrics_summary`, `search` | session |

Auth header: `Authorization: Bearer <token>` or `X-RD-Session: <token>`.

## Employee sync (added)

- **Source (read-only):** `db_kelinconnect.employees` where `department = 'Research and Development'`
- **Target (writable):** `db_rd_management.rd_users` only
- **Actions:** `employees_source_preview` (admin), `employees_sync` (admin)
- Never INSERT/UPDATE/DELETE/DROP against Kelin Connect or any other shared database

## Non-goals (v1)

- Wiring the local Next.js UI to this API (follow-up)
- Migrating or sharing rows with KGS Purchasing users
- Attachment binary upload pipeline beyond metadata stubs (can land in a follow-up if needed)

## Safety checklist

- [x] Dedicated database only
- [x] No writes to `db_purchase` / `db_kelin_inventory`
- [x] Idempotent schema bootstrap
- [x] Admin seed is insert-if-missing by email
