import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { readUpload } from "@/server/services/attachment-storage";
import { getAttachmentForViewer } from "@/server/services/task-service";

const INLINE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp", "application/pdf"]);

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const attachment = await getAttachmentForViewer(user, id);
  if (!attachment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: Buffer;
  try {
    body = await readUpload(attachment.storageKey);
  } catch {
    return NextResponse.json({ error: "File is missing from storage" }, { status: 404 });
  }

  const inline = new URL(request.url).searchParams.get("inline") === "1" && INLINE_TYPES.has(attachment.mimeType);
  const disposition = `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(attachment.fileName)}`;
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Length": String(body.length),
      "Content-Disposition": disposition,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
