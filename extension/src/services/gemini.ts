// Gemini API wrapper for the Yap Cursor extension.
//
// Mirrors the webapp's hardened implementation:
//   - Model fallback chain to dodge per-model free-tier rate limits
//   - Structured JSON output (responseMimeType + responseSchema)
//   - Safe-parse fallback when the model still emits malformed JSON

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

const MODEL_CHAIN = [
  "gemini-2.5-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-2.5-flash",
  "gemini-flash-latest",
];

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}

class GeminiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

interface GenOpts {
  responseSchema?: Record<string, unknown>;
  maxOutputTokens?: number;
  temperature?: number;
}

async function callGeminiOnce(
  apiKey: string,
  model: string,
  prompt: string,
  systemInstruction?: string,
  opts: GenOpts = {},
): Promise<string> {
  const body: Record<string, unknown> = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.7,
      maxOutputTokens: opts.maxOutputTokens ?? 16384,
      ...(opts.responseSchema
        ? { responseMimeType: "application/json", responseSchema: opts.responseSchema }
        : {}),
    },
  };
  if (systemInstruction) body.systemInstruction = { parts: [{ text: systemInstruction }] };

  const res = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new GeminiError(res.status, `${model}: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new GeminiError(500, `${model}: empty response`);
  return text;
}

async function callGemini(
  apiKey: string,
  prompt: string,
  systemInstruction?: string,
  opts: GenOpts = {},
): Promise<string> {
  let lastErr: GeminiError | null = null;
  for (const model of MODEL_CHAIN) {
    try {
      return await callGeminiOnce(apiKey, model, prompt, systemInstruction, opts);
    } catch (err) {
      lastErr = err instanceof GeminiError ? err : new GeminiError(500, String(err));
      if (lastErr.status !== 429 && lastErr.status !== 503 && lastErr.status !== 500) break;
    }
  }
  throw new Error(
    lastErr?.message ||
      "All Gemini models exhausted. Free tier hit its daily cap — try again in a few hours.",
  );
}

function stripFences(s: string): string {
  return s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}

export interface GeneratedFile {
  path: string;
  content: string;
}

// BUILD MODE: turn user speech into a set of files
export async function generateApp(apiKey: string, userPrompt: string): Promise<GeneratedFile[]> {
  const system = `You are a code generator. The user describes an app or website by voice. Generate a complete, runnable single-page web app using HTML, CSS, and vanilla JavaScript (or Tailwind via CDN).

Make it visually polished — modern, clean design. Use Tailwind via CDN for fast styling. The app must actually work end to end. Keep all files self-contained.

For images: only use https://picsum.photos/seed/<word>/<width>/<height> or https://i.pravatar.cc/150?u=<name>. Never invent random image URLs.

Return your response as JSON with a "files" array. Each file has a "path" (relative, e.g. "index.html", "style.css", "script.js") and a "content" string.`;

  const raw = await callGemini(apiKey, userPrompt, system, {
    responseSchema: {
      type: "OBJECT",
      properties: {
        files: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              path: { type: "STRING" },
              content: { type: "STRING" },
            },
            required: ["path", "content"],
          },
        },
      },
      required: ["files"],
    },
    maxOutputTokens: 32768,
  });

  return parseAppFiles(raw);
}

function parseAppFiles(raw: string): GeneratedFile[] {
  const cleaned = stripFences(raw);

  // Happy path
  try {
    const parsed = JSON.parse(cleaned) as { files: GeneratedFile[] };
    if (parsed.files && Array.isArray(parsed.files) && parsed.files.length > 0) {
      return parsed.files.filter((f) => f.path && typeof f.content === "string");
    }
  } catch { /* fall through */ }

  // Fallback: extract a complete HTML doc and synthesize a single index.html
  const docMatch = cleaned.match(/<!DOCTYPE\s+html[\s\S]*?<\/html\s*>/i) || cleaned.match(/<html[\s\S]*?<\/html\s*>/i);
  if (docMatch) {
    const html = docMatch[0].startsWith("<!DOCTYPE") ? docMatch[0] : `<!DOCTYPE html>${docMatch[0]}`;
    return [{ path: "index.html", content: html }];
  }

  console.error("[generateApp] Unparseable response. First 400 chars:", cleaned.slice(0, 400));
  throw new Error("Couldn't parse the model's response. Try saying it again with different wording.");
}

// REVIEW MODE: get a persona-flavored review of a code file
export interface ReviewResult {
  spokenReview: string;
  suggestedEdits?: { original: string; replacement: string; explanation: string }[];
}

export async function reviewCode(
  apiKey: string,
  personaSystemPrompt: string,
  filename: string,
  code: string,
): Promise<ReviewResult> {
  const system = `${personaSystemPrompt}

Stay in character. 2-4 sentences max for the spoken review.

Suggest 0-3 concrete edits. Each edit's "original" must be an exact substring of the file so it can be found and replaced.`;

  const prompt = `File: ${filename}\n\n\`\`\`\n${code.slice(0, 8000)}\n\`\`\``;
  const raw = await callGemini(apiKey, prompt, system, {
    responseSchema: {
      type: "OBJECT",
      properties: {
        spokenReview: { type: "STRING" },
        suggestedEdits: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              original: { type: "STRING" },
              replacement: { type: "STRING" },
              explanation: { type: "STRING" },
            },
            required: ["original", "replacement", "explanation"],
          },
        },
      },
      required: ["spokenReview"],
    },
    maxOutputTokens: 2048,
    temperature: 0.85,
  });

  try {
    return JSON.parse(stripFences(raw)) as ReviewResult;
  } catch {
    return { spokenReview: stripFences(raw).slice(0, 500).trim() };
  }
}
