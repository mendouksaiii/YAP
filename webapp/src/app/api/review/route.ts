import { NextRequest, NextResponse } from "next/server";
import { reviewApp } from "@/lib/gemini";
import { textToSpeech } from "@/lib/elevenlabs";
import { getPersona } from "@/lib/personas";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const geminiKey = process.env.GEMINI_API_KEY;
    const elevenKey = process.env.ELEVENLABS_API_KEY;
    if (!geminiKey || !elevenKey) {
      return NextResponse.json({ error: "Missing API keys" }, { status: 500 });
    }

    const { personaId, title, html } = await req.json();
    const persona = getPersona(personaId);
    if (!persona) return NextResponse.json({ error: "invalid persona" }, { status: 400 });

    const review = await reviewApp(geminiKey, persona.systemPrompt, title || "App", html || "");
    const audio = await textToSpeech(elevenKey, persona.voiceId, review.spokenReview);
    const audioB64 = Buffer.from(audio).toString("base64");

    return NextResponse.json({
      text: review.spokenReview,
      audio: audioB64,
      persona: persona.name,
      emoji: persona.emoji,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
