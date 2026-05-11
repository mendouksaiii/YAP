import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// Instant Voice Cloning via ElevenLabs.
// Receives a wav/webm sample from the user, returns the new voice_id.
export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "ELEVENLABS_API_KEY not set" }, { status: 500 });

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const name = (form.get("name") as string) || "yap-user-voice";
    if (!file) return NextResponse.json({ error: "no file" }, { status: 400 });

    const upstream = new FormData();
    upstream.append("name", name);
    upstream.append("description", "Yap user voice for multilingual dubbing");
    upstream.append("files", file, "sample.webm");

    const res = await fetch("https://api.elevenlabs.io/v1/voices/add", {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: upstream,
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Clone failed: ${err}` }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json({ voiceId: data.voice_id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
