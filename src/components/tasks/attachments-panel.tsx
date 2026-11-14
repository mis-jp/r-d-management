"use client";

import { useRef, useState, useTransition } from "react";
import { Download, FileText, Paperclip, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { ATTACHMENT_MAX_BYTES } from "@/lib/constants";
import { removeAttachmentAction, uploadAttachmentsAction } from "@/server/actions/task-actions";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { useActionToast } from "@/components/shared/use-action-toast";
import { useFormAction } from "@/components/shared/use-form-action";

type Attachment = {
  id: string;
  fileName: string;
  sizeBytes: number;
  uploadedBy: { id: string; name: string };
  createdAt: string;
};

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function AttachmentsPanel({
  taskId,
  attachments,
  canUpload,
  viewerId,
  isAdmin,
}: {
  taskId: string;
  attachments: Attachment[];
  canUpload: boolean;
  viewerId: string;
  isAdmin: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const { state, onSubmit, pending } = useFormAction(uploadAttachmentsAction);
  const [hasFile, setHasFile] = useState(false);
  const [toRemove, setToRemove] = useState<Attachment | null>(null);
  const [removing, startRemove] = useTransition();
  useActionToast(state, () => {
    formRef.current?.reset();
    setHasFile(false);
  });

  return (
    <Card>
      <CardHeader title={`Attachments (${attachments.length})`} />
      <CardBody className="space-y-3">
        {attachments.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <Paperclip className="size-4" aria-hidden /> No files attached.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {attachments.map((a) => (
              <li key={a.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                <FileText className="size-4 shrink-0 text-slate-400" aria-hidden />
                <div className="min-w-0 flex-1">
                  <a href={`/api/attachments/${a.id}`} className="block truncate font-medium text-slate-800 hover:underline">
                    {a.fileName}
                  </a>
                  <p className="text-xs text-slate-500">
                    {formatBytes(a.sizeBytes)} · {a.uploadedBy.name}
                  </p>
                </div>
                <a
                  href={`/api/attachments/${a.id}`}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
                  aria-label={`Download ${a.fileName}`}
                >
                  <Download className="size-4" />
                </a>
                {canUpload && (isAdmin || a.uploadedBy.id === viewerId) && (
                  <button
                    type="button"
                    onClick={() => setToRemove(a)}
                    className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                    aria-label={`Remove ${a.fileName}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {canUpload && (
          <form ref={formRef} onSubmit={onSubmit} className="space-y-2">
            <input type="hidden" name="taskId" value={taskId} />
            <label htmlFor="upload-files" className="text-xs font-medium text-slate-600">
              Add files (max {ATTACHMENT_MAX_BYTES / 1024 / 1024} MB each)
            </label>
            <input
              id="upload-files"
              name="attachments"
              type="file"
              multiple
              onChange={(e) => setHasFile(!!e.target.files?.length)}
              accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.txt,.csv,.md,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
              className="block w-full text-xs text-slate-600 file:mr-2 file:rounded-md file:border-0 file:bg-slate-100 file:px-2.5 file:py-1.5 file:text-xs file:font-medium hover:file:bg-slate-200"
            />
            <Button type="submit" size="sm" variant="outline" loading={pending} disabled={!hasFile}>
              <Upload /> Upload
            </Button>
          </form>
        )}
      </CardBody>

      <Dialog open={!!toRemove} onOpenChange={(o) => !o && setToRemove(null)}>
        <DialogContent title="Remove attachment?" description={toRemove ? `"${toRemove.fileName}" will be deleted permanently.` : undefined}>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToRemove(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={removing}
              onClick={() =>
                startRemove(async () => {
                  if (!toRemove) return;
                  const res = await removeAttachmentAction(toRemove.id);
                  if (res.ok) toast.success(res.message ?? "Removed.");
                  else toast.error(res.error);
                  setToRemove(null);
                })
              }
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
