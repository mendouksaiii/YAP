// Gemini API wrapper — code generation + persona-based reviews.
// Uses Gemini 2.0 Flash (free tier).

const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
}

async function callGemini(apiKey: string, prompt: string, systemInstruction?: string): Promise<string> {
  const body: Record<string, unknown> = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192,
    },
  };
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Gemini failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no text");
  return text;
}

export interface GeneratedFile {
  path: string;
  content: string;
}

// BUILD MODE: turn user speech into a set of files
export async function generateApp(apiKey: string, userPrompt: string): Promise<GeneratedFile[]> {
  const system = `You are a code generator. The user describes an app or website by voice. Generate a complete, runnable single-page web app using HTML, CSS, and vanilla JavaScript (or Tailwind via CDN).

Output STRICT JSON only — no markdown, no commentary. Format:
{
  "files": [
    { "path": "index.html", "content": "..." },
    { "path": "style.css", "content": "..." },
    { "path": "script.js", "content": "..." }
  ]
}

Make it visually polished — modern, clean design. Use Tailwind CDN for fast styling. Make sure the app actually works end to end. Keep all files self-contained.`;

  const raw = await callGemini(apiKey, userPrompt, system);
  // Strip ```json fences if present
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const parsed = JSON.parse(cleaned) as { files: GeneratedFile[] };
  return parsed.files;
}

// REVIEW MODE: get a persona-flavored review of a code file
export interface ReviewResult {
  spokenReview: string; // what the persona says out loud
  suggestedEdits?: { original: string; replacement: string; explanation: string }[];
}

export async function reviewCode(
  apiKey: string,
  personaSystemPrompt: string,
  filename: string,
  code: string,
): Promise<ReviewResult> {
  const system = `${personaSystemPrompt}

Output STRICT JSON only — no markdown:
{
  "spokenReview": "What you say out loud about this code (will be read in your voice). Stay in character. 2-4 sentences.",
  "suggestedEdits": [
    { "original": "exact text to find", "replacement": "what to replace it with", "explanation": "brief reason" }
  ]
}

Suggest 0-3 concrete edits. Make sure 'original' is an exact substring of the file so it can be found and replaced. If you have no edits, return an empty array.`;

  const prompt = `File: ${filename}\n\n\`\`\`\n${code}\n\`\`\``;
  const raw = await callGemini(apiKey, prompt, system);
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  return JSON.parse(cleaned) as ReviewResult;
}
