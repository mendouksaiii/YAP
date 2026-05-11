import { NextRequest, NextResponse } from "next/server";
import { textToSpeechMultilingual } from "@/lib/elevenlabs";
import { translateText } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

// Body: { voiceId, text, targetLanguage, sourceLanguage? }
// Returns: { translated, audio (base64 mp3) }
export async function POST(req: NextRequest) {
  try {
    const geminiKey = process.env.GEMINI_API_KEY;
    const elevenKey = process.env.ELEVENLABS_API_KEY;
    if (!geminiKey || !elevenKey) return NextResponse.json({ error: "missing api keys" }, { status: 500 });

    const { voiceId, text, targetLanguage, sourceLanguage } = await req.json();
    if (!voiceId || !text || !targetLanguage) {
      return NextResponse.json({ error: "voiceId, text, targetLanguage required" }, { status: 400 });
    }

    const translated = await translateText(geminiKey, text, targetLanguage, sourceLanguage);
    const audio = await textToSpeechMultilingual(elevenKey, voiceId, translated);
    return NextResponse.json({
      translated,
      audio: Buffer.from(audio).toString("base64"),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
