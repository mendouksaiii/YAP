// Cross-browser microphone recorder.
//
// Why this exists:
//   iOS Safari rejects `audio/webm` and `audio/ogg` — passing either to
//   `new MediaRecorder(stream, { mimeType })` throws with the cryptic message
//   "The string did not match the expected pattern." On iOS the only widely
//   supported type is `audio/mp4`. On older Android browsers MediaRecorder
//   may not exist at all.
//
// We try a prioritized list of mime types and fall back to letting the browser
// pick its own default (no mimeType option). The picked type is exposed so
// callers can use it as the Blob type and the multipart filename hint.

export interface ActiveRecording {
  /** Stop and return the recorded audio blob. */
  stop(): Promise<{ blob: Blob; mimeType: string }>;
  /** Cancel without producing a result. */
  cancel(): void;
  /** The mime type the recorder ended up using. */
  mimeType: string;
}

const PREFERRED_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4;codecs=mp4a.40.2",
  "audio/mp4",
  "audio/ogg;codecs=opus",
  "audio/ogg",
  "audio/wav",
];

function pickSupportedMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  for (const m of PREFERRED_MIME_TYPES) {
    try {
      if (MediaRecorder.isTypeSupported(m)) return m;
    } catch {
      /* some engines throw on unrecognized types */
    }
  }
  return ""; // empty = let the browser pick its default
}

export function isRecordingSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

export async function startRecording(): Promise<ActiveRecording> {
  if (!isRecordingSupported()) {
    throw new Error(
      "Your browser doesn't support voice recording. Try Chrome, Safari (iOS 14.3+), or Firefox.",
    );
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mime = pickSupportedMime();

  let recorder: MediaRecorder;
  try {
    recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
  } catch (e) {
    // Last-ditch retry without any mimeType
    try {
      recorder = new MediaRecorder(stream);
    } catch (inner) {
      stream.getTracks().forEach((t) => t.stop());
      throw new Error(
        "Couldn't start the recorder. Try a different browser (Chrome/Safari).",
      );
    }
  }

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  // Start with a small timeslice so we get data even if the recorder
  // is stopped quickly on slow devices.
  recorder.start(250);

  const actualMime = recorder.mimeType || mime || "audio/webm";

  return {
    mimeType: actualMime,
    stop(): Promise<{ blob: Blob; mimeType: string }> {
      return new Promise((resolve) => {
        recorder.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          const blob = new Blob(chunks, { type: actualMime });
          resolve({ blob, mimeType: actualMime });
        };
        try { recorder.stop(); } catch {}
      });
    },
    cancel() {
      try { recorder.stop(); } catch {}
      stream.getTracks().forEach((t) => t.stop());
    },
  };
}

/** Map a recording mime type to a sensible filename for the multipart upload. */
export function filenameFor(mime: string): string {
  if (mime.includes("mp4")) return "audio.mp4";
  if (mime.includes("ogg")) return "audio.ogg";
  if (mime.includes("wav")) return "audio.wav";
  return "audio.webm";
}
