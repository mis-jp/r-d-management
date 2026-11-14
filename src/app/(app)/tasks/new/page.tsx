import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { listTags } from "@/server/repositories/task-repository";
import { listAssignableEmployees } from "@/server/repositories/user-repository";
import { PageHeader } from "@/components/ui/misc";
import { TaskForm } from "@/components/tasks/task-form";

export const metadata: Metadata = { title: "New Task" };

export default async function NewTaskPage() {
  await requireAdmin();
  const [employees, tags] = await Promise.all([listAssignableEmployees(), listTags()]);
  return (
    <>
      <PageHeader title="Create a task" description="Define the work, then assign it or publish it as OPEN." />
      <TaskForm mode="create" employees={employees} tags={tags} />
    </>
  );
}
