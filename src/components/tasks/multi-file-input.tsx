"use client";

import { useId, useRef, useState } from "react";
import { FileIcon, Paperclip, X } from "lucide-react";
import { ATTACHMENT_ACCEPT, ATTACHMENT_MAX_BYTES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Props = {
  name?: string;
  accept?: string;
  maxBytes?: number;
  className?: string;
  /** Called whenever the selection changes (optional). */
  onFilesChange?: (files: File[]) => void;
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

/** Multi-select file picker that lists every chosen file (native input only shows one name). */
export function MultiFileInput({
  name = "attachments",
  accept = ATTACHMENT_ACCEPT,
  maxBytes = ATTACHMENT_MAX_BYTES,
  className,
  onFilesChange,
}: Props) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  function sync(next: File[]) {
    setFiles(next);
    onFilesChange?.(next);
    const dt = new DataTransfer();
    for (const file of next) dt.items.add(file);
    if (inputRef.current) inputRef.current.files = dt.files;
  }

  function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    // Clear so the same file can be chosen again later.
    event.target.value = "";
    if (!picked.length) return;

    const oversized = picked.filter((f) => f.size > maxBytes);
    setError(
      oversized.length
        ? `${oversized[0].name} is over ${maxBytes / 1024 / 1024} MB. Choose smaller files.`
        : null,
    );

    const allowed = picked.filter((f) => f.size <= maxBytes);
    const seen = new Set(files.map(fileKey));
    const merged = [...files];
    for (const file of allowed) {
      const key = fileKey(file);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(file);
    }
    sync(merged);
  }

  function removeAt(index: number) {
    const next = files.filter((_, i) => i !== index);
    setError(null);
    sync(next);
  }

  return (
    <div className={cn("space-y-3", className)}>
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="file"
        multiple
        accept={accept}
        onChange={onPick}
        className="sr-only"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          <Paperclip />
          {files.length ? "Add more files" : "Choose files"}
        </Button>
        <p className="text-xs text-slate-500">
          {files.length === 0
            ? "Select one or more files"
            : `${files.length} file${files.length === 1 ? "" : "s"} selected`}
        </p>
      </div>

      {error && (
        <p className="text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      )}

      {files.length > 0 && (
        <ul className="divide-y overflow-hidden rounded-lg border bg-slate-50/80">
          {files.map((file, index) => (
            <li key={fileKey(file)} className="flex items-center gap-2 px-3 py-2 text-sm">
              <FileIcon className="size-4 shrink-0 text-slate-400" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-800">{file.name}</p>
                <p className="text-[11px] text-slate-500">{formatSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => removeAt(index)}
                className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                aria-label={`Remove ${file.name}`}
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
