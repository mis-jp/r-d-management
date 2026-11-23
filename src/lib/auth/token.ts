import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "rd_session";

/**
 * Browsers cap persistent cookies (~400 days). Combined with sliding refresh in
 * `proxy.ts`, active users stay signed in indefinitely until they log out.
 */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 400;

/** Re-issue the cookie when the token is older than this so expiry never catches up. */
export const SESSION_REFRESH_AFTER_SECONDS = 60 * 60 * 24;

export type SessionPayload = {
  sub: string;
  /** Must match `User.sessionVersion`; bumping it revokes every existing session. */
  ver: number;
  /** Unix seconds when the token was issued (from JWT `iat`). */
  iat?: number;
};

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set to at least 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

export function sessionCookieOptions(maxAge = SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ver: payload.ver })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || typeof payload.ver !== "number") return null;
    return {
      sub: payload.sub,
      ver: payload.ver,
      iat: typeof payload.iat === "number" ? payload.iat : undefined,
    };
  } catch {
    return null;
  }
}

export function sessionNeedsRefresh(session: SessionPayload, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
  if (typeof session.iat !== "number") return true;
  return nowSeconds - session.iat >= SESSION_REFRESH_AFTER_SECONDS;
}
