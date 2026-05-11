const STT_URL = "https://api.elevenlabs.io/v1/speech-to-text";
const TTS_URL = "https://api.elevenlabs.io/v1/text-to-speech";

export async function speechToText(
  apiKey: string,
  blob: Blob | ArrayBuffer,
  mimeType = "audio/webm",
): Promise<string> {
  const form = new FormData();
  const part = blob instanceof Blob ? blob : new Blob([blob], { type: mimeType });
  form.append("file", part, "audio.webm");
  form.append("model_id", "scribe_v1");

  const res = await fetch(STT_URL, {
    method: "POST",
    headers: { "xi-api-key": apiKey },
    body: form,
  });

  if (!res.ok) throw new Error(`STT failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { text: string };
  return data.text;
}

export async function textToSpeechMultilingual(
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
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.55,
        similarity_boost: 0.85,
        style: 0.3,
        use_speaker_boost: true,
      },
    }),
  });
  if (!res.ok) throw new Error(`Multilingual TTS failed: ${res.status} ${await res.text()}`);
  return await res.arrayBuffer();
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

  if (!res.ok) throw new Error(`TTS failed: ${res.status} ${await res.text()}`);
  return await res.arrayBuffer();
}
