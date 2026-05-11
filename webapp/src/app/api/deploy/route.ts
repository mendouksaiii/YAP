import { NextRequest, NextResponse } from "next/server";
import { deployToVercel } from "@/lib/vercel";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const token = process.env.VERCEL_TOKEN;
    if (!token) return NextResponse.json({ error: "VERCEL_TOKEN not set" }, { status: 500 });

    const { title, html } = await req.json();
    if (!html) return NextResponse.json({ error: "missing html" }, { status: 400 });

    const result = await deployToVercel(token, title || "yap-app", html);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
