import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { quickSearch } from "@/server/services/search-service";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = new URL(request.url).searchParams.get("q") ?? "";
  const result = await quickSearch(user, q);
  return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
}
