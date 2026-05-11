// ElevenLabs API wrapper — STT + TTS
// All requests are made via Node fetch (Node 18+).

const STT_URL = "https://api.elevenlabs.io/v1/speech-to-text";
const TTS_URL = "https://api.elevenlabs.io/v1/text-to-speech";

export interface STTResult {
  text: string;
  language_code?: string;
}

export async function speechToText(
  apiKey: string,
  audioBuffer: Uint8Array,
  mimeType: string = "audio/webm",
): Promise<string> {
  const form = new FormData();
  const ab = audioBuffer.buffer.slice(
    audioBuffer.byteOffset,
    audioBuffer.byteOffset + audioBuffer.byteLength,
  ) as ArrayBuffer;
  const blob = new Blob([ab], { type: mimeType });
  form.append("file", blob, "audio.webm");
  form.append("model_id", "scribe_v1");

  const res = await fetch(STT_URL, {
    method: "POST",
    headers: { "xi-api-key": apiKey },
    body: form,
  });

  if (!res.ok) {
    throw new Error(`STT failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as STTResult;
  return data.text;
}

export async function textToSpeech(
  apiKey: string,
  voiceId: string,
  text: string,
): Promise<ArrayBuffer> {
  const res = await fetch(`${TTS_URL}/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_turbo_v2_5",
      voice_settings: {
        stability: 0.45,
        similarity_boost: 0.85,
        style: 0.6,
        use_speaker_boost: true,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`TTS failed: ${res.status} ${await res.text()}`);
  }

  return await res.arrayBuffer();
}
