import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { toDateInputValue } from "@/lib/utils";
import { getTaskByKey, listTags } from "@/server/repositories/task-repository";
import { PageHeader } from "@/components/ui/misc";
import { TaskForm } from "@/components/tasks/task-form";

export const metadata: Metadata = { title: "Edit Task" };

export default async function EditTaskPage({ params }: { params: Promise<{ taskKey: string }> }) {
  await requireAdmin();
  const { taskKey } = await params;
  const [task, tags] = await Promise.all([getTaskByKey(decodeURIComponent(taskKey)), listTags()]);
  if (!task) notFound();

  return (
    <>
      <PageHeader
        title={`Edit ${task.taskKey}`}
        description="Assignment, status and progress are managed from the task page."
      />
      <TaskForm
        mode="edit"
        employees={[]}
        tags={tags}
        initial={{
          taskId: task.id,
          taskKey: task.taskKey,
          title: task.title,
          description: task.description ?? "",
          priority: task.priority,
          status: task.status,
          startDate: toDateInputValue(task.startDate),
          dueDate: toDateInputValue(task.dueDate),
          estimatedHours: task.estimatedMinutes ? String(Math.round((task.estimatedMinutes / 60) * 100) / 100) : "",
          tagIds: task.tags.map((t) => t.id),
        }}
      />
    </>
  );
}
