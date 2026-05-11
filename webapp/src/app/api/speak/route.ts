import { NextRequest, NextResponse } from "next/server";
import { textToSpeech } from "@/lib/elevenlabs";
import { getPersona } from "@/lib/personas";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "ELEVENLABS_API_KEY not set" }, { status: 500 });

    const { personaId, voiceId, text } = await req.json();
    if (!text) return NextResponse.json({ error: "missing text" }, { status: 400 });

    let resolvedVoiceId = voiceId;
    if (!resolvedVoiceId && personaId) {
      const p = getPersona(personaId);
      if (p) resolvedVoiceId = p.voiceId;
    }
    if (!resolvedVoiceId) return NextResponse.json({ error: "no voice id" }, { status: 400 });

    const audio = await textToSpeech(apiKey, resolvedVoiceId, text);
    return new NextResponse(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
