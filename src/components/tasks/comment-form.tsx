"use client";

import { useRef, useState } from "react";
import { Send } from "lucide-react";
import { addCommentAction } from "@/server/actions/task-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form-controls";
import { cn } from "@/lib/utils";
import { fieldError, useActionToast } from "@/components/shared/use-action-toast";
import { useFormAction } from "@/components/shared/use-form-action";

export function CommentForm({ taskId }: { taskId: string }) {
  const { state, onSubmit, pending } = useFormAction(addCommentAction);
  const [kind, setKind] = useState<"COMMENT" | "PROGRESS_UPDATE">("COMMENT");
  const [body, setBody] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  useActionToast(state, () => setBody(""));
  const error = fieldError(state, "body");

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-2" noValidate>
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="kind" value={kind} />
      <div role="tablist" aria-label="Post type" className="inline-flex rounded-lg border bg-slate-50 p-0.5 text-xs">
        {(
          [
            ["COMMENT", "Comment"],
            ["PROGRESS_UPDATE", "Progress update"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={kind === value}
            onClick={() => setKind(value)}
            className={cn("rounded-md px-2.5 py-1 font-medium", kind === value ? "bg-surface text-slate-900 shadow-xs" : "text-slate-500")}
          >
            {label}
          </button>
        ))}
      </div>
      <label htmlFor="comment-body" className="sr-only">
        {kind === "COMMENT" ? "Write a comment" : "Write a progress update"}
      </label>
      <Textarea
        id="comment-body"
        name="body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        maxLength={5000}
        aria-invalid={!!error}
        placeholder={
          kind === "COMMENT" ? "Write a comment… mention someone with @their.email-handle" : "What did you get done? What's next? Any blockers?"
        }
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) formRef.current?.requestSubmit();
        }}
      />
      {error && (
        <p className="text-xs font-medium text-red-600" role="alert">
          {error[0]}
        </p>
      )}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">Ctrl/⌘ + Enter to post</p>
        <Button type="submit" size="sm" loading={pending} disabled={!body.trim()}>
          <Send /> Post
        </Button>
      </div>
    </form>
  );
}
