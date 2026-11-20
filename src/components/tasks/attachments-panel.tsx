"use client";

import { useRef, useState, useTransition } from "react";
import { Download, FileText, Paperclip, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { ATTACHMENT_ACCEPT, ATTACHMENT_MAX_BYTES } from "@/lib/constants";
import { removeAttachmentAction, uploadAttachmentsAction } from "@/server/actions/task-actions";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { useActionToast } from "@/components/shared/use-action-toast";
import { useFormAction } from "@/components/shared/use-form-action";
import { MultiFileInput } from "./multi-file-input";

type Attachment = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: { id: string; name: string };
  createdAt: string;
};

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function isImage(mime: string) {
  return mime.startsWith("image/");
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
                {isImage(a.mimeType) ? (
                  // eslint-disable-next-line @next/next/no-img-element -- authenticated attachment stream
                  <img
                    src={`/api/attachments/${a.id}?inline=1`}
                    alt=""
                    className="size-10 shrink-0 rounded-md border object-cover bg-slate-50"
                  />
                ) : (
                  <FileText className="size-4 shrink-0 text-slate-400" aria-hidden />
                )}
                <div className="min-w-0 flex-1">
                  <a
                    href={`/api/attachments/${a.id}${isImage(a.mimeType) ? "?inline=1" : ""}`}
                    target={isImage(a.mimeType) ? "_blank" : undefined}
                    rel={isImage(a.mimeType) ? "noreferrer" : undefined}
                    className="block truncate font-medium text-slate-800 hover:underline"
                  >
                    {a.fileName}
                  </a>
                  <p className="text-xs text-slate-500">
                    {formatBytes(a.sizeBytes)}
                    {a.mimeType === "image/avif" ? " · AVIF" : ""} · {a.uploadedBy.name}
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
          <form
            ref={formRef}
            onSubmit={onSubmit}
            className="space-y-3 border-t border-slate-100 pt-3"
          >
            <input type="hidden" name="taskId" value={taskId} />
            <p className="text-xs text-slate-500">
              Add more files (max {ATTACHMENT_MAX_BYTES / 1024 / 1024} MB each). Photos are saved as AVIF.
            </p>
            <MultiFileInput
              name="attachments"
              accept={ATTACHMENT_ACCEPT}
              maxBytes={ATTACHMENT_MAX_BYTES}
              onFilesChange={(files) => setHasFile(files.length > 0)}
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
              onClick={() => {
                if (!toRemove) return;
                startRemove(async () => {
                  const res = await removeAttachmentAction(toRemove.id);
                  if (res.ok) {
                    toast.success("Attachment removed.");
                    setToRemove(null);
                  } else toast.error(res.error);
                });
              }}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
