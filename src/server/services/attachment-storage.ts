import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { ATTACHMENT_ALLOWED_TYPES, ATTACHMENT_MAX_BYTES } from "@/lib/constants";
import { invalid } from "@/lib/errors";

const ALLOWED_EXTENSIONS = new Set([...Object.values(ATTACHMENT_ALLOWED_TYPES), ".jpeg", ".md"]);

function uploadRoot() {
  return path.resolve(process.cwd(), process.env.UPLOAD_DIR || "storage/uploads");
}

function resolveKey(storageKey: string) {
  if (!/^[a-f0-9]{32}\.[a-z0-9]{2,5}$/.test(storageKey)) throw invalid("Invalid attachment reference.");
  return path.join(uploadRoot(), storageKey);
}

export function validateUpload(file: File) {
  if (file.size === 0) throw invalid(`"${file.name}" is empty.`);
  if (file.size > ATTACHMENT_MAX_BYTES) {
    throw invalid(`"${file.name}" is larger than ${ATTACHMENT_MAX_BYTES / 1024 / 1024} MB.`);
  }
  const ext = path.extname(file.name).toLowerCase();
  const typeAllowed = file.type in ATTACHMENT_ALLOWED_TYPES || (file.type === "text/markdown" && ext === ".md");
  if (!typeAllowed || !ALLOWED_EXTENSIONS.has(ext)) {
    throw invalid(`"${file.name}" is not an allowed file type.`);
  }
}

export async function saveUpload(file: File) {
  validateUpload(file);
  const ext = path.extname(file.name).toLowerCase();
  const storageKey = `${randomBytes(16).toString("hex")}${ext}`;
  await mkdir(uploadRoot(), { recursive: true });
  await writeFile(resolveKey(storageKey), Buffer.from(await file.arrayBuffer()));
  return {
    storageKey,
    fileName: path.basename(file.name).slice(0, 255),
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
  };
}

export function readUpload(storageKey: string) {
  return readFile(resolveKey(storageKey));
}

export async function deleteUpload(storageKey: string) {
  await unlink(resolveKey(storageKey)).catch(() => undefined);
}

export function filesFromForm(formData: FormData, field = "attachments"): File[] {
  return formData.getAll(field).filter((v): v is File => v instanceof File && v.size > 0);
}
