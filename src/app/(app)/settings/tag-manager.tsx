"use client";

import { useRef, useState, useTransition } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { TAG_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { createTagAction, deleteTagAction, updateTagAction } from "@/server/actions/user-actions";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/form-controls";
import { fieldError, useActionToast } from "@/components/shared/use-action-toast";
import { useFormAction } from "@/components/shared/use-form-action";

type Tag = { id: string; name: string; color: string | null; count: number };

function ColorSwatches({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex gap-1.5" role="radiogroup" aria-label="Tag color">
      {TAG_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          aria-label={c}
          onClick={() => onChange(c)}
          className={cn("size-5 rounded-full ring-offset-1", value === c && "ring-2 ring-slate-900")}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}

export function TagManager({ tags }: { tags: Tag[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const { state, onSubmit, pending } = useFormAction(createTagAction);
  const [color, setColor] = useState(TAG_COLORS[0]!);
  const [editing, setEditing] = useState<{ id: string; name: string; color: string } | null>(null);
  const [deleting, setDeleting] = useState<Tag | null>(null);
  const [busy, startTransition] = useTransition();
  useActionToast(state, () => formRef.current?.reset());

  return (
    <Card>
      <CardHeader title="Tags" description="Labels for organizing and filtering tasks." />
      <CardBody className="space-y-4">
        <form ref={formRef} onSubmit={onSubmit} className="flex flex-wrap items-end gap-3" noValidate>
          <div className="min-w-48 flex-1">
            <label htmlFor="tag-name" className="text-sm font-medium text-slate-700">
              New tag
            </label>
            <Input id="tag-name" name="name" maxLength={50} placeholder="e.g. Prototype" className="mt-1.5" />
            {fieldError(state, "name") && <p className="mt-1 text-xs text-red-600">{fieldError(state, "name")![0]}</p>}
          </div>
          <input type="hidden" name="color" value={color} />
          <ColorSwatches value={color} onChange={setColor} />
          <Button type="submit" loading={pending}>
            <Plus /> Add tag
          </Button>
        </form>

        {tags.length === 0 ? (
          <p className="text-sm text-slate-500">No tags yet.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {tags.map((t) =>
              editing?.id === t.id ? (
                <li key={t.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
                  <Input
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    className="h-8 max-w-56"
                    aria-label="Tag name"
                    autoFocus
                  />
                  <ColorSwatches value={editing.color} onChange={(c) => setEditing({ ...editing, color: c })} />
                  <div className="ml-auto flex gap-1">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Save tag"
                      loading={busy}
                      onClick={() =>
                        startTransition(async () => {
                          const res = await updateTagAction(editing);
                          if (res.ok) {
                            toast.success(res.message ?? "Saved.");
                            setEditing(null);
                          } else toast.error(res.error);
                        })
                      }
                    >
                      {!busy && <Check />}
                    </Button>
                    <Button size="icon-sm" variant="ghost" aria-label="Cancel editing" onClick={() => setEditing(null)}>
                      <X />
                    </Button>
                  </div>
                </li>
              ) : (
                <li key={t.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <span className="size-3 rounded-full" style={{ backgroundColor: t.color ?? "#94a3b8" }} aria-hidden />
                  <span className="font-medium text-slate-800">{t.name}</span>
                  <span className="text-xs text-slate-500">
                    {t.count} task{t.count === 1 ? "" : "s"}
                  </span>
                  <div className="ml-auto flex gap-1">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Edit ${t.name}`}
                      onClick={() => setEditing({ id: t.id, name: t.name, color: t.color ?? TAG_COLORS[0]! })}
                    >
                      <Pencil />
                    </Button>
                    <Button size="icon-sm" variant="ghost" aria-label={`Delete ${t.name}`} onClick={() => setDeleting(t)}>
                      <Trash2 />
                    </Button>
                  </div>
                </li>
              ),
            )}
          </ul>
        )}
      </CardBody>

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent
          title={`Delete tag "${deleting?.name}"?`}
          description={`It will be removed from ${deleting?.count ?? 0} task(s). The tasks themselves are not affected.`}
        >
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={() =>
                startTransition(async () => {
                  if (!deleting) return;
                  const res = await deleteTagAction(deleting.id);
                  if (res.ok) toast.success(res.message ?? "Deleted.");
                  else toast.error(res.error);
                  setDeleting(null);
                })
              }
            >
              Delete tag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
