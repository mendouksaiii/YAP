// Server-side auth: signed JWT in HTTP-only cookies.
// Two token types:
//   - magic   (5 min TTL, single-use-ish) embedded in the email link
//   - session (30 day TTL) set as cookie after verification
//
// No database needed — JWTs are stateless.

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "yap_session";
const SESSION_TTL = "30d";
const MAGIC_TTL = "10m";

function getSecret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET not set");
  return new TextEncoder().encode(s);
}

export interface SessionPayload {
  email: string;
  name?: string;
  /** Chosen during onboarding. Absent means the user hasn't completed onboarding yet. */
  username?: string;
  joinedAt: number;
}

/** Slug a free-form username into something URL/UI safe. */
export function normalizeUsername(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]/g, "")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ ...payload, kind: "session" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(getSecret());
}

export async function signMagicLink(email: string): Promise<string> {
  return await new SignJWT({ email, kind: "magic" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(MAGIC_TTL)
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<any> {
  const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
  return payload;
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const payload = await verifyToken(token);
    if (payload.kind !== "session" || !payload.email) return null;
    return {
      email: payload.email as string,
      name: payload.name as string | undefined,
      username: payload.username as string | undefined,
      joinedAt: (payload.joinedAt as number) || Date.now(),
    };
  } catch {
    return null;
  }
}
