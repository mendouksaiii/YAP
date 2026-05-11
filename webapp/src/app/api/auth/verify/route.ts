import { NextRequest, NextResponse } from "next/server";
import { verifyToken, signSession, setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const hdrs = req.headers;
  const proto = hdrs.get("x-forwarded-proto") || url.protocol.replace(":", "");
  const host = hdrs.get("x-forwarded-host") || hdrs.get("host") || url.host;
  const base = process.env.PUBLIC_APP_URL?.trim() || `${proto}://${host}`;

  if (!token) {
    return NextResponse.redirect(`${base}/login?error=missing-token`);
  }

  try {
    const payload = await verifyToken(token);
    if (payload.kind !== "magic" || !payload.email) {
      return NextResponse.redirect(`${base}/login?error=invalid-token`);
    }

    const email = String(payload.email);
    const name = email
      .split("@")[0]
      .replace(/[._-]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

    const sessionToken = await signSession({
      email,
      name,
      joinedAt: Date.now(),
    });
    await setSessionCookie(sessionToken);

    // First land in /onboarding — if the user already has a remembered username
    // (in localStorage from a prior session), that page will silently re-claim it
    // and bounce to /dashboard.
    return NextResponse.redirect(`${base}/onboarding`);
  } catch (e: any) {
    return NextResponse.redirect(`${base}/login?error=expired-or-invalid`);
  }
}
