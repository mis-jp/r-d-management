import "server-only";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { TAG_COLORS } from "@/lib/constants";
import { conflict, forbidden, notFound } from "@/lib/errors";

function requireAdmin(actor: SessionUser) {
  if (actor.role !== "ADMIN") throw forbidden("Only admins can manage tags.");
}

export async function createTag(actor: SessionUser, name: string, color?: string) {
  requireAdmin(actor);
  const existing = await db.tag.findUnique({ where: { name } });
  if (existing) throw conflict("A tag with that name already exists.");
  const count = await db.tag.count();
  return db.tag.create({ data: { name, color: color ?? TAG_COLORS[count % TAG_COLORS.length] } });
}

export async function updateTag(actor: SessionUser, id: string, name: string, color?: string) {
  requireAdmin(actor);
  const tag = await db.tag.findUnique({ where: { id } });
  if (!tag) throw notFound("Tag not found.");
  const clash = await db.tag.findUnique({ where: { name } });
  if (clash && clash.id !== id) throw conflict("A tag with that name already exists.");
  return db.tag.update({ where: { id }, data: { name, color: color ?? tag.color } });
}

/** Removing a tag only detaches it from tasks; the tasks themselves are untouched. */
export async function deleteTag(actor: SessionUser, id: string) {
  requireAdmin(actor);
  await db.tag.delete({ where: { id } });
}
