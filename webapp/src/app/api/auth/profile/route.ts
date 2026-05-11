import { NextRequest, NextResponse } from "next/server";
import { getSession, signSession, setSessionCookie, normalizeUsername } from "@/lib/auth";

export const runtime = "nodejs";

// POST /api/auth/profile { username, displayName? }
// Re-issues the session JWT with the chosen username + display name.
// Caller must already be authenticated.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  let body: any = {};
  try { body = await req.json(); } catch {}

  const usernameRaw = String(body?.username || "");
  const username = normalizeUsername(usernameRaw);
  if (!username || username.length < 3) {
    return NextResponse.json({ error: "Username must be at least 3 characters (letters, numbers, - or _)" }, { status: 400 });
  }

  const displayName = (body?.displayName ? String(body.displayName).slice(0, 40) : undefined) || session.name;

  const token = await signSession({
    email: session.email,
    name: displayName,
    username,
    joinedAt: session.joinedAt,
  });
  await setSessionCookie(token);

  return NextResponse.json({ user: { email: session.email, name: displayName, username, joinedAt: session.joinedAt } });
}
