# R&D Task Management System

## Product Requirements, UX Specification, and Implementation Guide for Cursor AI

> **Purpose:** Build a polished, production-minded task management
> platform for the company's Research & Development (R&D) Department.
> The experience should take inspiration from the workflow clarity and
> interaction patterns of ClickUp, while using an original interface and
> visual identity. Do not copy ClickUp branding, assets, or exact
> screens.

------------------------------------------------------------------------

## 1. Project Overview

Create a web-based R&D Task Management System using the existing Next.js
project.

The platform helps the R&D manager/admin: - Create and organize
department tasks. - Assign tasks to one or more employees. - Publish
tasks as **OPEN** so eligible employees can claim them. - Monitor task
status, deadlines, priorities, workload, and progress. - See
department-wide and individual productivity dashboards.

It helps R&D employees: - View tasks assigned to them. - Browse and
claim available OPEN tasks. - Update the status and progress of their
work. - Add comments, updates, attachments, and time estimates/actual
time. - See their own workload and completion statistics.

The result should feel like a complete internal business application,
not a simple CRUD demo.

### Product principles

1.  **Clarity:** Every task must have an owner or be visibly
    OPEN/unassigned.
2.  **Accountability:** Status changes, assignment changes, and
    important edits should be traceable.
3.  **Low-friction workflow:** Employees should be able to find, claim,
    and update tasks quickly.
4.  **Visibility:** Admins should understand workload and progress
    without asking every employee.
5.  **Scalability:** Keep UI, business logic, and data access separated
    so the prototype can later move to a hosted MySQL database and
    API-based backend.

------------------------------------------------------------------------

## 2. Technology and Project Constraints

First inspect the existing repository before changing anything. Preserve
its working configuration and conventions where reasonable.

### Preferred stack

-   **Framework:** Next.js (use the version already installed).
-   **Routing:** App Router if the project supports it. If the
    repository uses Pages Router, do not migrate it without a clear
    reason.
-   **Language:** TypeScript.
-   **Styling:** Tailwind CSS, using the project's existing setup.
-   **UI components:** Prefer the existing component library. If none
    exists, use shadcn/ui-compatible components and Lucide icons.
-   **Database:** MySQL for the prototype.
-   **ORM:** Prisma is preferred for schema management and type-safe
    database access.
-   **Charts:** Recharts or an already-installed chart library.
-   **Forms/validation:** React Hook Form and Zod if compatible with the
    existing project.
-   **Authentication:** Secure session-based authentication with role
    checks. Use an established Next.js-compatible authentication
    solution if already installed; otherwise implement a well-structured
    authentication layer. Never store plain-text passwords.
-   **Date handling:** Use a consistent date utility/library if needed.

Do not install duplicate libraries or replace existing dependencies
without checking first.

### Prototype and future production migration

The prototype must run against MySQL, preferably through Prisma. Keep
database access behind a repository/service layer so the application can
later use a hosted MySQL database and external API endpoints without
rewriting the UI.

Create environment variable examples, such as: - `DATABASE_URL` -
Authentication/session secrets required by the chosen auth solution.

Never hardcode database credentials, secrets, or production URLs.
Include `.env.example` with placeholders only. Do not commit a real
`.env` file.

------------------------------------------------------------------------

## 3. Roles and Permissions

There are two main roles:

### ADMIN

The admin is the R&D manager or an authorized department administrator.

Admin permissions: - View the department dashboard and all department
tasks. - Create, edit, archive, and delete tasks (prefer archive over
destructive deletion). - Assign a task to a specific employee. - Publish
a task as OPEN/unassigned. - Reassign a task. - Change task priority,
due date, status, tags, and other task details. - View every employee's
task progress and workload. - View department reports and activity
history. - Add comments and updates to tasks. - Manage employee accounts
if user management is included. - Review tasks claimed by employees and
release/reassign them if necessary.

### EMPLOYEE

Employee permissions: - View their own dashboard. - View tasks assigned
to them. - Browse the OPEN task board. - Claim an OPEN task, subject to
the claim rules below. - Update the status and progress of tasks
assigned to them or claimed by them. - Add comments, work updates, and
permitted attachments. - View their own progress charts and task
history. - Not edit another employee's private assignment or admin-only
fields. - Not assign tasks to other employees.

### Authorization requirements

-   Enforce permissions on the server, not only by hiding UI controls.
-   Every protected page, Server Action, Route Handler, and data
    operation must verify the current user and role.
-   Employees must not be able to access another employee's private task
    data by changing an ID in the URL or request.
-   Do not trust role, user ID, or ownership values sent by the browser.

------------------------------------------------------------------------

## 4. Application Navigation and Main Layout

Build a consistent application shell with: - Left sidebar navigation
that can collapse. - Main content area. - Top header with page
title/breadcrumbs, search, notifications, and user profile menu. -
Responsive behavior for desktop, tablet, and mobile. - Clear active
navigation state. - Loading skeletons, empty states, error states, and
confirmation dialogs.

### Suggested sidebar

**Common** - Overview - My Tasks - Task Board - OPEN Tasks - Calendar -
Notifications

**Admin-only** - All Tasks - Team Workload - Employees - Reports &
Analytics - Activity Log - Settings

The employee should not see admin-only navigation items.

### Visual direction

Create a modern, professional SaaS dashboard suitable for an internal
engineering/R&D team: - Clean neutral background with white or subtly
tinted surfaces. - Strong typography and clear information hierarchy. -
A restrained primary accent color, with semantic colors for statuses. -
Consistent spacing, border radii, shadows, and icon sizes. - Dense
enough for productivity, but never visually cluttered. - Use tables for
scanning large task lists and cards for summaries. - Use accessible
color contrast and never communicate status by color alone. - Avoid
excessive gradients, oversized hero sections, and decorative UI that
wastes workspace.

Use ClickUp as a reference for the *ideas* of task organization, views,
filters, and status workflows. Create an original design rather than
reproducing its exact UI.

------------------------------------------------------------------------

## 5. Core Task Model and Workflow

A task is the central entity in the application.

### Required task fields

-   Task ID (unique, human-readable display key such as `RD-001`, plus
    database ID).
-   Title.
-   Description (support formatted text if practical).
-   Status.
-   Priority.
-   Assignee (nullable for OPEN tasks).
-   Created by.
-   Created date/time.
-   Updated date/time.
-   Due date (optional).
-   Start date (optional).
-   Completion date (nullable).
-   Progress percentage (0--100).
-   Tags/labels.
-   Estimated effort (optional).
-   Actual time spent (optional).
-   Attachments (optional).
-   Comments/updates.
-   Activity history.

### Task status values

Use these initial statuses: 1. **NOT_STARTED** 2. **IN_PROGRESS** 3.
**IN_REVIEW** 4. **COMPLETED** 5. **ON_HOLD** 6. **CANCELLED**

Display friendly labels such as "Not Started" and "In Progress" in the
UI.

The **OPEN** concept is an assignment state, not a work status: - An
OPEN task has no assignee and is available for an eligible employee to
claim. - It should be visually marked with an OPEN badge. - Once claimed
or assigned, it is no longer OPEN. - A task can be unassigned by an
admin and returned to OPEN, provided it is not completed or cancelled
(admin may explicitly reopen it if needed).

### Priority values

-   LOW
-   NORMAL
-   HIGH
-   URGENT

Use clear badges and consistent ordering in filters and task lists.

### Task lifecycle

1.  Admin creates a task.
2.  Admin chooses either:
    -   Assign to a specific employee immediately, or
    -   Publish as OPEN.
3.  If assigned, the task appears in that employee's My Tasks list.
4.  If OPEN, eligible employees can view it in the OPEN Tasks page.
5.  An employee claims an OPEN task.
6.  The task becomes assigned to that employee and is removed from the
    OPEN list.
7.  The employee updates status and progress as work proceeds.
8.  The employee marks the task COMPLETED when finished.
9.  Admin can review the completed task and optionally reopen it or
    return it to IN_REVIEW if the workflow requires.
10. The system records each important action in the activity log.

### Important claim behavior

Claiming must be atomic to prevent two employees from claiming the same
task at the same time. - When an employee clicks **Claim Task**, the
server must verify that the task is still OPEN and has no assignee. -
Perform the assignment as a transaction or conditional database
update. - If another employee has already claimed it, show a friendly
message and refresh the task state. - Never rely only on client-side
checks. - After a successful claim, set the assignee to the current
employee, record the claim event, and remove the task from the OPEN
list.

### Releasing and reassigning

-   Employees should not be able to release tasks by default. If this
    feature is enabled, require a reason and log it.
-   Admins can reassign tasks at any time, with an optional reason.
-   When reassigned, notify the previous and new assignees.
-   Admin can return an active task to OPEN with confirmation and an
    activity-log entry.

------------------------------------------------------------------------

## 6. Admin Features

### 6.1 Admin Dashboard

Show a department overview with: - Total active tasks. - OPEN tasks. -
Tasks in progress. - Tasks awaiting review. - Completed tasks. - Overdue
tasks. - Completion rate for the selected date range. - Employee
workload summary. - Recently updated tasks. - Recent activity.

Use real database values, not hardcoded demo numbers.

### 6.2 Create Task

Create a well-designed task creation form or drawer/modal with: - Title
(required). - Description. - Assignee selector with employee search. -
Assignment mode: **Assign to employee** or **Publish as OPEN**. - Status
(default NOT_STARTED). - Priority. - Due date and optional start date. -
Tags. - Estimated effort. - Optional attachment upload.

Validation: - Title is required and has a sensible maximum length. - Due
date must be valid. - If assignment mode is OPEN, assignee must be
null. - If assigned, selected employee must be active and eligible. -
Server must validate all submitted fields.

After successful creation, show a success notification and navigate to
or open the created task.

### 6.3 All Tasks

Provide a powerful task management table/list: - Search by task key or
title. - Filter by status, priority, assignee, tag, and due date. - Sort
by due date, priority, creation date, updated date, or progress. -
Pagination or efficient incremental loading. - Quick status and assignee
changes where appropriate. - Bulk actions only when safe and clearly
confirmed. - Saved filters/views if practical.

### 6.4 Task Detail

A task detail page or side panel should show: - Task key and title. -
Description. - Status and progress. - Priority. - Assignee and
creator. - Dates and estimated/actual effort. - Tags and attachments. -
Comments/work updates. - Activity timeline. - Admin actions: edit,
assign/reassign, return to OPEN, archive, and review/reopen as
applicable.

### 6.5 Employee Management

Admin can: - View employee list, name, email, role, and active status. -
Search employees. - Open an employee profile/workload view. -
Activate/deactivate accounts if user management is in scope. - See each
employee's active, overdue, and completed task counts.

Do not allow deactivating the last active admin account.

### 6.6 Team Workload

Create a team view showing each employee's: - Assigned active tasks. -
OPEN tasks claimed during a selected period, if tracked. - In-progress
tasks. - Overdue tasks. - Completed tasks in the selected date range. -
Completion rate. - Workload distribution.

Make it easy to identify overloaded employees without treating task
count alone as a perfect measure of effort. Show estimated effort when
available.

### 6.7 Reports & Analytics

Provide date-range filters and visualizations: - Tasks created
vs. completed over time. - Tasks by status. - Tasks by priority. -
Completion rate by employee. - Overdue task count/trend. - Workload by
employee. - Average completion time if enough data exists.

Clearly define chart calculations. Do not fabricate values when data is
missing; show an empty state.

------------------------------------------------------------------------

## 7. Employee Features

### 7.1 Employee Dashboard

Show: - My active tasks. - My overdue tasks. - Tasks due soon. - Tasks
completed this week/month. - My completion percentage. - Recent task
updates. - A progress chart. - Quick links to OPEN Tasks and My Tasks.

### 7.2 My Tasks

Provide list, table, and/or board views: - Filter by status, priority,
due date, and tags. - Sort by due date, priority, and recently
updated. - Search by task key/title. - Group by status or priority. -
Show task title, priority, status, due date, and progress. - Make
overdue tasks clearly visible.

### 7.3 OPEN Tasks

Create a discoverable board/list of unassigned tasks published by the
admin.

Each OPEN task card should display: - Task key and title. - Short
description. - Priority. - Due date. - Tags. - Estimated effort if
available. - Created date. - **Claim Task** action.

Provide search, filters, and sorting. Do not show archived, completed,
cancelled, or already-assigned tasks.

Before claiming, show a confirmation dialog with the task title and due
date. After confirmation, execute the atomic server-side claim
operation.

### 7.4 Update Task Status and Progress

Employees can update tasks assigned to them: - NOT_STARTED -
IN_PROGRESS - IN_REVIEW (if the department uses employee-submitted
review) - COMPLETED - ON_HOLD

Provide a simple status selector and progress control. - NOT_STARTED
should normally be 0%. - COMPLETED should set progress to 100% and
completion date. - IN_PROGRESS can use a manually updated percentage. -
IN_REVIEW should preserve the submitted progress (normally 100%,
depending on the chosen workflow). - ON_HOLD should preserve the current
progress.

Keep status and progress consistent. If the user marks a task COMPLETED,
ask for confirmation if useful, then save both status and 100% progress.
If a completed task is reopened, clear completion date and update
status/progress appropriately.

### 7.5 Comments and Work Updates

Allow employees to: - Add comments. - Post progress updates. - Mention
another user if practical. - View the chronological discussion.

Comments must include author and timestamp. Keep comments separate from
the activity log: comments are discussion; activity entries are
system-recorded changes.

### 7.6 Personal Progress Visualization

Every employee should see a clear chart showing how their tasks are
distributed and how much work they have completed.

Recommended dashboard metrics: - **Completion rate:** completed tasks
divided by all tasks assigned to the employee in the selected period,
multiplied by 100. - **Status distribution:** count of tasks in each
status. - **Completed over time:** tasks completed per week/month. -
**Progress overview:** completed vs. active vs. overdue task counts.

Important: - Clearly label the selected date range. - Avoid dividing by
zero; show "No tasks in this period" instead of `NaN`. - Do not confuse
average task progress with completion rate. If both are displayed, label
them separately. - Default to all-time or current month consistently and
let the employee change the period.

------------------------------------------------------------------------

## 8. Task Views and Productivity UX

Implement these views where practical:

### List view

Best for scanning and sorting many tasks. Use compact rows with status,
priority, assignee, due date, and progress.

### Board view

Kanban-style columns grouped by status. Cards should be draggable only
if drag-and-drop is implemented with proper server persistence and
permission checks. Otherwise use a status menu.

### Calendar view

Show tasks by due date. Provide month/week navigation if practical.
Clicking an item opens its task detail.

### Task detail view

Use a focused layout with a clear information panel and
activity/comments section.

All views must use the same underlying task data and permission rules.
Avoid separate inconsistent implementations.

------------------------------------------------------------------------

## 9. Notifications and Activity History

### In-app notifications

Create notifications for: - New task assigned to an employee. - Task
reassigned. - OPEN task claimed. - Due date changed. - Comment or
mention received. - Task submitted for review. - Task completed. - Task
returned to OPEN or reopened.

Notifications should have: - Recipient. - Type. - Message or structured
payload. - Related task. - Read/unread state. - Created timestamp.

Provide a notification menu/page with mark-as-read behavior.

### Activity log

Record important events: - Task created. - Task edited. - Assignee
changed. - Task claimed. - Task returned to OPEN. - Status changed. -
Progress changed. - Priority or due date changed. - Task
completed/reopened/archived. - Comment added (optional activity
reference).

Each entry should include actor, action, task, timestamp, and useful
before/after values where appropriate. Do not allow ordinary users to
edit or delete audit entries.

------------------------------------------------------------------------

## 10. Suggested Database Design

Use Prisma models with MySQL. Adjust names and relations to fit the
existing project, but preserve the concepts.

### User

-   `id`
-   `name`
-   `email` (unique)
-   `passwordHash`
-   `role` (`ADMIN` or `EMPLOYEE`)
-   `isActive`
-   `createdAt`
-   `updatedAt`

### Task

-   `id`
-   `taskKey` (unique, e.g. `RD-001`)
-   `title`
-   `description`
-   `status`
-   `priority`
-   `progress` (integer 0--100)
-   `assigneeId` (nullable relation to User)
-   `createdById` (relation to User)
-   `startDate` (nullable)
-   `dueDate` (nullable)
-   `completedAt` (nullable)
-   `estimatedMinutes` (nullable)
-   `actualMinutes` (nullable)
-   `isArchived`
-   `createdAt`
-   `updatedAt`

### Tag

-   `id`
-   `name`
-   `color` (optional)
-   many-to-many relation with Task

### Comment

-   `id`
-   `taskId`
-   `authorId`
-   `body`
-   `createdAt`
-   `updatedAt`

### ActivityLog

-   `id`
-   `taskId`
-   `actorId`
-   `action`
-   `oldValue` (nullable JSON)
-   `newValue` (nullable JSON)
-   `createdAt`

### Notification

-   `id`
-   `recipientId`
-   `taskId` (nullable)
-   `type`
-   `message`
-   `isRead`
-   `createdAt`

### Attachment (optional for prototype)

-   `id`
-   `taskId`
-   `uploadedById`
-   `fileName`
-   `fileUrl` or storage key
-   `mimeType`
-   `sizeBytes`
-   `createdAt`

### Schema requirements

-   Use enums for role, task status, priority, and notification type
    where appropriate.
-   Add indexes for common filters: task status, assignee, due date,
    priority, archived state, and notification recipient/read state.
-   Use foreign keys and appropriate delete behavior.
-   Prefer archiving tasks instead of deleting task records that have
    activity history.
-   Store timestamps consistently; handle display in the user's local
    timezone.
-   Ensure task keys are generated safely and uniquely. Do not generate
    task keys by simply counting rows without concurrency protection.

------------------------------------------------------------------------

## 11. Architecture and Code Organization

Keep the code modular and maintainable. Adapt to the existing repository
rather than blindly replacing its structure.

Suggested organization for an App Router project:

``` text
src/
  app/
    (auth)/
      login/
    (app)/
      layout.tsx
      dashboard/
      my-tasks/
      open-tasks/
      tasks/
        [taskId]/
      calendar/
      team/
      employees/
      reports/
      settings/
    api/                  # Route Handlers if needed
  components/
    layout/
    navigation/
    dashboard/
    tasks/
    charts/
    forms/
    shared/
    ui/
  features/
    auth/
    tasks/
    employees/
    notifications/
    reports/
  lib/
    auth/
    db/
    permissions/
    validations/
    utils/
  server/
    repositories/
    services/
    actions/
  prisma/
    schema.prisma
    seed.ts
```

If the project does not use `src/`, follow its existing convention.

### Separation of responsibilities

-   **UI components:** Render interface and collect user input.
-   **Server Actions/Route Handlers:** Authenticate, authorize,
    validate, and coordinate operations.
-   **Services:** Implement business rules such as claiming tasks,
    assigning tasks, completing tasks, and calculating metrics.
-   **Repositories/data access:** Encapsulate Prisma queries.
-   **Validation schemas:** Validate input with shared schemas where
    practical.
-   **Database models:** Define persistent entities and relations.

Do not put complex business rules directly inside React components.

### Data flow

1.  User interacts with a page/component.
2.  Server operation identifies the authenticated user.
3.  Server validates the input.
4.  Server checks permissions and ownership.
5.  Service executes business rules and database transaction.
6.  Database is updated.
7.  Activity log and notifications are created as appropriate.
8.  UI revalidates/refetches data and displays success or error
    feedback.

Use Server Components for data-heavy pages where appropriate. Use Client
Components only for interactions that require browser state.

------------------------------------------------------------------------

## 12. Security, Reliability, and Data Integrity

This is an internal company application, so implement sensible security
even in the prototype.

-   Hash passwords using a secure password hashing algorithm/library.
-   Never return password hashes to the client.
-   Use secure, HTTP-only cookies for sessions where applicable.
-   Protect against unauthorized role and ownership changes.
-   Validate all input on the server.
-   Use parameterized ORM queries; never concatenate untrusted SQL.
-   Sanitize/render user-authored rich text safely.
-   Limit upload file types and sizes if attachments are implemented.
-   Do not expose stack traces or secrets in production-facing error
    messages.
-   Add database transactions for multi-step operations.
-   Add rate limiting to login and other sensitive endpoints if
    practical.
-   Use confirmation dialogs for destructive or high-impact actions.
-   Keep an immutable activity history for important task changes.

### Key business rules

-   An OPEN task must have `assigneeId = null`.
-   A task with an assignee must not appear in the OPEN task list.
-   Only admins can assign or reassign tasks.
-   Only the assignee and admins can update a task's work
    status/progress.
-   Employees cannot claim a task that is no longer OPEN.
-   COMPLETED tasks have progress 100 and a completion timestamp.
-   Non-completed tasks should not retain a completion timestamp.
-   Archived tasks should be excluded from normal active task views.
-   Server-side checks are authoritative.

------------------------------------------------------------------------

## 13. Search, Filters, Sorting, and Empty States

Search should support: - Task key. - Task title. - Employee name where
the current role is allowed to see it. - Tags if practical.

Filters: - Status. - Priority. - Assignee. - Due date range. - Created
date range. - Tags. - OPEN/unassigned. - Overdue. - Archived (admin
only).

Sorting: - Due date. - Priority. - Recently created. - Recently
updated. - Progress. - Task key.

Every page should have a useful empty state with a clear next action.
Examples: - "No tasks assigned to you yet." - "There are no OPEN tasks
right now." - "No tasks match these filters." - "No activity during this
period."

Provide a reset-filters action.

------------------------------------------------------------------------

## 14. Responsive and Accessible Design

-   Desktop is the primary work environment, but mobile must remain
    usable.
-   Sidebar should collapse or become a mobile navigation drawer.
-   Tables should adapt to smaller screens using horizontal scrolling or
    compact cards.
-   Dialogs and forms must fit mobile screens.
-   All interactive elements need accessible labels.
-   Support keyboard navigation and visible focus states.
-   Use semantic headings and buttons.
-   Charts should have text summaries or accessible labels.
-   Do not rely on color alone to distinguish status or priority.

------------------------------------------------------------------------

## 15. Seed Data and Demo Accounts

Create a Prisma seed script for local development with: - One admin
account. - At least five sample employee accounts. - A realistic mix of
OPEN, NOT_STARTED, IN_PROGRESS, IN_REVIEW, COMPLETED, and ON_HOLD
tasks. - Different priorities and due dates. - Several comments,
notifications, and activity records.

Use clearly documented demo credentials in the development README only.
Use non-production sample passwords and force users to replace them
before real deployment. Never seed predictable accounts in production.

The dashboard and charts must calculate values from seeded/database
records rather than hardcoded UI constants.

------------------------------------------------------------------------

## 16. Implementation Plan

Implement in phases. At the end of each phase, ensure the project still
builds and the implemented workflow works.

### Phase 1 --- Repository inspection and foundation

-   Inspect the existing Next.js version, routing, styling,
    dependencies, and project structure.
-   Do not overwrite working project configuration unnecessarily.
-   Set up or verify TypeScript, UI conventions, Prisma, and MySQL
    connection.
-   Create `.env.example`.
-   Add Prisma schema and initial migration.
-   Add seed script.

### Phase 2 --- Authentication and authorization

-   Implement login/logout.
-   Implement ADMIN and EMPLOYEE roles.
-   Add protected layouts/routes.
-   Add server-side permission helpers.
-   Add demo users for local development.

### Phase 3 --- Task management core

-   Create task model and task key generation.
-   Implement create, read, edit, archive.
-   Implement assignment and reassignment.
-   Implement OPEN task publishing.
-   Implement atomic claim operation.
-   Add task detail page and activity history.

### Phase 4 --- Employee workflow

-   Implement My Tasks.
-   Implement OPEN Tasks and Claim Task.
-   Implement status and progress updates.
-   Implement completion behavior.
-   Implement comments/work updates.

### Phase 5 --- Dashboards and charts

-   Implement admin dashboard.
-   Implement employee dashboard.
-   Implement progress calculations.
-   Implement team workload and reports.

### Phase 6 --- Views and productivity features

-   Implement list and board views.
-   Implement calendar view if feasible.
-   Add search, filters, sorting, pagination, and saved views if
    practical.

### Phase 7 --- Notifications and polish

-   Implement in-app notifications.
-   Add loading, error, and empty states.
-   Add responsive behavior and accessibility refinements.
-   Add confirmation dialogs and toast feedback.
-   Review UI consistency across every page.

### Phase 8 --- Verification and handoff

-   Run linting and type checks.
-   Run production build.
-   Test role-based access.
-   Test task lifecycle and concurrent claim behavior.
-   Test dashboard calculations.
-   Document setup, migrations, seeding, and demo credentials.

Do not claim a feature is complete unless it is implemented and tested.

------------------------------------------------------------------------

## 17. Acceptance Criteria

The project is considered functionally complete when all of the
following work:

### Authentication and roles

-   [ ] Admin can log in and access admin features.
-   [ ] Employee can log in and access employee features.
-   [ ] Employees cannot access admin pages or admin operations.
-   [ ] Users cannot access tasks they are not authorized to see.

### Admin task workflow

-   [ ] Admin can create a task and assign it to an employee.
-   [ ] Admin can create a task as OPEN with no assignee.
-   [ ] Admin can edit task details and priority.
-   [ ] Admin can change assignee and return an active task to OPEN.
-   [ ] Admin can view all tasks and task details.
-   [ ] Important actions appear in the activity history.

### Employee task workflow

-   [ ] Employee can view their assigned tasks.
-   [ ] Employee can browse OPEN tasks.
-   [ ] Employee can successfully claim an OPEN task.
-   [ ] A task disappears from OPEN after it is claimed.
-   [ ] Two employees cannot claim the same task successfully.
-   [ ] Employee can update status and progress on their own tasks.
-   [ ] Employee can mark a task COMPLETED.
-   [ ] Completion sets progress to 100 and records completion time.

### Dashboards and analytics

-   [ ] Admin sees department task metrics based on database data.
-   [ ] Admin can compare employee workload and progress.
-   [ ] Each employee sees their own task progress visualization.
-   [ ] Completion rate and average progress are calculated and labeled
    correctly.
-   [ ] Empty datasets do not cause chart or calculation errors.

### Quality

-   [ ] UI is responsive and consistent.
-   [ ] Forms show validation errors.
-   [ ] Loading, error, and empty states are implemented.
-   [ ] Database migrations and seed script work.
-   [ ] Lint/type checks and production build pass.
-   [ ] Setup instructions are documented.

------------------------------------------------------------------------

## 18. Instructions to Cursor AI

Work directly in the existing repository.

Before coding: 1. Inspect the repository and summarize its current
structure and stack. 2. Identify existing components and dependencies
that can be reused. 3. State any assumptions or compatibility issues. 4.
Propose a concise implementation sequence based on the phases above.

Then implement the project in the repository, not just describe how it
could be built.

### Important execution rules

-   Do not replace the entire project with a generic starter template.
-   Do not remove existing functionality unless explicitly necessary and
    explained.
-   Do not leave major buttons as nonfunctional placeholders.
-   Do not use hardcoded dashboard metrics as a substitute for database
    queries.
-   Do not fake authentication by trusting a role stored only in
    localStorage.
-   Do not implement task claiming only on the client.
-   Do not expose admin functionality to employees through unprotected
    server operations.
-   Do not create unnecessary abstractions that make the project
    difficult to maintain.
-   Use reusable components and consistent design tokens.
-   Keep TypeScript types accurate; avoid `any` unless there is a
    documented reason.
-   Handle errors gracefully and show clear feedback.
-   If a requirement cannot be implemented because a dependency,
    credential, or external service is unavailable, explain the blocker
    and implement the safest practical local alternative.

### Final handoff

When implementation is complete, provide: - Summary of implemented
features. - Important files/folders created or changed. - Required
environment variables. - Exact commands to install dependencies, run
migrations, seed the database, and start the app. - Demo login
credentials for local development. - Any incomplete features or known
limitations. - Results of lint, type-check, and production build.

**Build this as a cohesive, polished R&D department task management
product with a reliable end-to-end workflow. Prioritize working task
assignment, OPEN task claiming, employee progress updates, and accurate
dashboards before optional enhancements.**
