import { NextRequest, NextResponse } from "next/server";
import { signSession, setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

// POST /api/auth/sign-in { email, name? }
// Issues a session JWT immediately — no email verification.
// This is intentional for the hackathon demo; swap for magic-link or OAuth later.
export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json();
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName =
      (typeof name === "string" && name.trim()) ||
      cleanEmail
        .split("@")[0]
        .replace(/[._-]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

    const token = await signSession({
      email: cleanEmail,
      name: cleanName.slice(0, 60),
      joinedAt: Date.now(),
    });
    await setSessionCookie(token);

    return NextResponse.json({
      user: { email: cleanEmail, name: cleanName, joinedAt: Date.now() },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
