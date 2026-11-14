"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Priority, TaskStatus } from "@prisma/client";
import { Hand, UserRound } from "lucide-react";
import { ATTACHMENT_MAX_BYTES, PRIORITIES, PRIORITY_LABELS, STATUS_LABELS, TASK_STATUSES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { createTaskAction, updateTaskAction } from "@/server/actions/task-actions";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, FormAlert, Input, Select, Textarea } from "@/components/ui/form-controls";
import { fieldError, useActionToast } from "@/components/shared/use-action-toast";
import { useFormAction } from "@/components/shared/use-form-action";

type Employee = { id: string; name: string; jobTitle: string | null };
type Tag = { id: string; name: string; color: string | null };

export type TaskFormValues = {
  taskId?: string;
  taskKey?: string;
  title: string;
  description: string;
  priority: Priority;
  status: TaskStatus;
  startDate: string;
  dueDate: string;
  estimatedHours: string;
  tagIds: string[];
};

type Props = {
  mode: "create" | "edit";
  employees: Employee[];
  tags: Tag[];
  initial?: Partial<TaskFormValues>;
};

const EMPTY: TaskFormValues = {
  title: "",
  description: "",
  priority: "NORMAL",
  status: "NOT_STARTED",
  startDate: "",
  dueDate: "",
  estimatedHours: "",
  tagIds: [],
};

export function TaskForm({ mode, employees, tags, initial }: Props) {
  const action = mode === "create" ? createTaskAction : updateTaskAction;
  const { state, onSubmit, pending } = useFormAction(action);
  useActionToast(state);

  const [values, setValues] = useState<TaskFormValues>({ ...EMPTY, ...initial });
  const [assignmentMode, setAssignmentMode] = useState<"ASSIGN" | "OPEN">("ASSIGN");
  const [assigneeId, setAssigneeId] = useState("");
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [newTags, setNewTags] = useState("");

  const filteredEmployees = useMemo(() => {
    const q = employeeQuery.trim().toLowerCase();
    return q
      ? employees.filter(
          (e) => e.id === assigneeId || e.name.toLowerCase().includes(q) || e.jobTitle?.toLowerCase().includes(q),
        )
      : employees;
  }, [employees, employeeQuery, assigneeId]);

  const set = <K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));
  const err = (name: string) => fieldError(state, name);

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6 lg:grid-cols-3">
      {values.taskId && <input type="hidden" name="taskId" value={values.taskId} />}

      <div className="space-y-6 lg:col-span-2">
        {state && !state.ok && <FormAlert message={state.error} />}
        <Card>
          <CardHeader title="Task details" />
          <CardBody className="space-y-4">
            <Field label="Title" htmlFor="title" required error={err("title")}>
              <Input
                id="title"
                name="title"
                value={values.title}
                onChange={(e) => set("title", e.target.value)}
                maxLength={200}
                placeholder="e.g. Validate thermal sensor calibration"
                aria-invalid={!!err("title")}
                autoFocus={mode === "create"}
              />
            </Field>
            <Field
              label="Description"
              htmlFor="description"
              error={err("description")}
              hint="Plain text. Line breaks are preserved."
            >
              <Textarea
                id="description"
                name="description"
                value={values.description}
                onChange={(e) => set("description", e.target.value)}
                rows={7}
                placeholder="Goal, scope, acceptance criteria, links…"
              />
            </Field>
          </CardBody>
        </Card>

        {mode === "create" && (
          <Card>
            <CardHeader title="Assignment" description="Assign to someone now, or publish as OPEN so an employee can claim it." />
            <CardBody className="space-y-4">
              <input type="hidden" name="assignmentMode" value={assignmentMode} />
              <div role="radiogroup" aria-label="Assignment mode" className="grid gap-3 sm:grid-cols-2">
                <ModeOption
                  checked={assignmentMode === "ASSIGN"}
                  onSelect={() => setAssignmentMode("ASSIGN")}
                  icon={<UserRound />}
                  title="Assign to employee"
                  text="The task goes straight to their My Tasks list."
                />
                <ModeOption
                  checked={assignmentMode === "OPEN"}
                  onSelect={() => setAssignmentMode("OPEN")}
                  icon={<Hand />}
                  title="Publish as OPEN"
                  text="Visible on the OPEN board for any employee to claim."
                />
              </div>
              {assignmentMode === "ASSIGN" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Find employee" htmlFor="employee-search">
                    <Input
                      id="employee-search"
                      value={employeeQuery}
                      onChange={(e) => setEmployeeQuery(e.target.value)}
                      placeholder="Type a name or title…"
                    />
                  </Field>
                  <Field label="Assignee" htmlFor="assigneeId" required error={err("assigneeId")}>
                    <Select
                      id="assigneeId"
                      name="assigneeId"
                      value={assigneeId}
                      onChange={(e) => setAssigneeId(e.target.value)}
                      aria-invalid={!!err("assigneeId")}
                    >
                      <option value="">Select an employee…</option>
                      {filteredEmployees.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name}
                          {e.jobTitle ? ` — ${e.jobTitle}` : ""}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  {employees.length === 0 && (
                    <p className="text-xs text-amber-700 sm:col-span-2">
                      There are no active employees yet.{" "}
                      <Link href="/employees/new" className="underline">
                        Add one
                      </Link>{" "}
                      or publish the task as OPEN.
                    </p>
                  )}
                </div>
              )}
            </CardBody>
          </Card>
        )}
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader title="Properties" />
          <CardBody className="space-y-4">
            {mode === "create" && (
              <Field label="Status" htmlFor="status" error={err("status")}>
                <Select id="status" name="status" value={values.status} onChange={(e) => set("status", e.target.value as TaskStatus)}>
                  {TASK_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <Field label="Priority" htmlFor="priority" error={err("priority")}>
              <Select
                id="priority"
                name="priority"
                value={values.priority}
                onChange={(e) => set("priority", e.target.value as Priority)}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start date" htmlFor="startDate" error={err("startDate")}>
                <Input id="startDate" name="startDate" type="date" value={values.startDate} onChange={(e) => set("startDate", e.target.value)} />
              </Field>
              <Field label="Due date" htmlFor="dueDate" error={err("dueDate")}>
                <Input
                  id="dueDate"
                  name="dueDate"
                  type="date"
                  value={values.dueDate}
                  min={values.startDate || undefined}
                  onChange={(e) => set("dueDate", e.target.value)}
                  aria-invalid={!!err("dueDate")}
                />
              </Field>
            </div>
            <Field label="Estimated effort (hours)" htmlFor="estimatedMinutes" error={err("estimatedMinutes")}>
              <Input
                id="estimatedMinutes"
                name="estimatedMinutes"
                type="number"
                min={0}
                step={0.5}
                value={values.estimatedHours}
                onChange={(e) => set("estimatedHours", e.target.value)}
                placeholder="e.g. 6"
              />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Tags" />
          <CardBody className="space-y-3">
            {tags.length > 0 ? (
              <fieldset>
                <legend className="sr-only">Existing tags</legend>
                <div className="flex flex-wrap gap-2">
                  {tags.map((t) => {
                    const checked = values.tagIds.includes(t.id);
                    return (
                      <label
                        key={t.id}
                        className={cn(
                          "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors has-focus-visible:ring-2 has-focus-visible:ring-brand-500/40",
                          checked ? "border-brand-300 bg-brand-50 text-brand-700" : "bg-surface text-slate-600 hover:bg-slate-50",
                        )}
                      >
                        <input
                          type="checkbox"
                          name="tagIds[]"
                          value={t.id}
                          checked={checked}
                          onChange={() =>
                            set("tagIds", checked ? values.tagIds.filter((id) => id !== t.id) : [...values.tagIds, t.id])
                          }
                          className="sr-only"
                        />
                        <span className="size-2 rounded-full" style={{ backgroundColor: t.color ?? "#94a3b8" }} aria-hidden />
                        {t.name}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ) : (
              <p className="text-xs text-slate-500">No tags yet — create some below.</p>
            )}
            <Field label="New tags" htmlFor="newTags" hint="Comma-separated, e.g. firmware, prototype" error={err("newTags")}>
              <Input id="newTags" name="newTags" value={newTags} onChange={(e) => setNewTags(e.target.value)} />
            </Field>
          </CardBody>
        </Card>

        {mode === "create" && (
          <Card>
            <CardHeader title="Attachments" description={`Optional. Up to ${ATTACHMENT_MAX_BYTES / 1024 / 1024} MB each.`} />
            <CardBody>
              <label htmlFor="attachments" className="sr-only">
                Attachments
              </label>
              <input
                id="attachments"
                name="attachments"
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.txt,.csv,.md,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-slate-200"
              />
            </CardBody>
          </Card>
        )}

        <div className="flex gap-2">
          <Button type="submit" loading={pending} className="flex-1">
            {mode === "create" ? (assignmentMode === "OPEN" ? "Publish OPEN task" : "Create task") : "Save changes"}
          </Button>
          <Button asChild variant="outline">
            <Link href={values.taskKey ? `/tasks/${values.taskKey}` : "/tasks"}>Cancel</Link>
          </Button>
        </div>
      </div>
    </form>
  );
}

function ModeOption({
  checked,
  onSelect,
  icon,
  title,
  text,
}: {
  checked: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors [&_svg]:size-4",
        checked ? "border-brand-400 bg-brand-50/60 ring-1 ring-brand-400" : "bg-surface hover:bg-slate-50",
      )}
    >
      <span className={cn("mt-0.5 rounded-md p-1.5", checked ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500")}>{icon}</span>
      <span>
        <span className="block text-sm font-semibold text-slate-900">{title}</span>
        <span className="block text-xs text-slate-500">{text}</span>
      </span>
    </button>
  );
}
