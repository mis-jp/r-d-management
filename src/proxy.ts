import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  sessionNeedsRefresh,
  signSession,
  verifySession,
} from "@/lib/auth/token";

/**
 * Optimistic gate only: sends visitors without a valid signed session to /login.
 * Every page, Server Action and Route Handler still re-checks the user against the database.
 * Also slides the session cookie forward so users stay signed in until they log out.
 */
export async function proxy(request: NextRequest) {
  const current = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(current);
  if (session) {
    const response = NextResponse.next();
    if (sessionNeedsRefresh(session)) {
      const token = await signSession({ sub: session.sub, ver: session.ver });
      response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    }
    return response;
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const loginUrl = new URL("/login", request.url);
  const next = request.nextUrl.pathname + request.nextUrl.search;
  if (next !== "/") loginUrl.searchParams.set("next", next);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
