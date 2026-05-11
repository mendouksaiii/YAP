const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}

async function callGemini(
  apiKey: string,
  prompt: string,
  systemInstruction?: string,
): Promise<string> {
  const body: Record<string, unknown> = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.85,
      maxOutputTokens: 16384,
    },
  };
  if (systemInstruction) body.systemInstruction = { parts: [{ text: systemInstruction }] };

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Gemini failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no text");
  return text;
}

function stripFences(s: string): string {
  return s
    .replace(/^```(?:json|html)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

export interface GeneratedApp {
  title: string;
  html: string; // single self-contained HTML doc
}

export async function generateApp(
  apiKey: string,
  userPrompt: string,
): Promise<GeneratedApp> {
  const system = `You are a world-class web developer. The user describes an app or website by voice. Build it as a SINGLE self-contained HTML document.

REQUIREMENTS:
- Pure HTML/CSS/JavaScript inline in one file. No external scripts except Tailwind CDN and Google Fonts.
- Use Tailwind CDN: <script src="https://cdn.tailwindcss.com"></script>
- Modern, beautiful, polished design. Dark mode by default unless user says otherwise.
- Functional and interactive — actual working features, not just static pages.
- Include realistic placeholder content (not "Lorem ipsum" — actual relevant copy).
- Use emoji or unicode for icons (no external icon libraries).

Output STRICT JSON (no markdown, no commentary):
{
  "title": "Short catchy title (3-5 words)",
  "html": "<!DOCTYPE html>...</html>"
}`;

  const raw = await callGemini(apiKey, userPrompt, system);
  const parsed = JSON.parse(stripFences(raw)) as GeneratedApp;
  return parsed;
}

export interface AppReview {
  spokenReview: string;
}

export async function translateText(
  apiKey: string,
  text: string,
  targetLanguage: string,
  sourceLanguage?: string,
): Promise<string> {
  const system = `You are a professional translator. Translate the user's text into ${targetLanguage}${sourceLanguage ? ` from ${sourceLanguage}` : ""}. Preserve tone, register, and any proper nouns. Return ONLY the translated text — no quotes, no commentary, no source language repeated.`;
  const raw = await callGemini(apiKey, text, system);
  return raw.trim().replace(/^["']|["']$/g, "");
}

export async function reviewApp(
  apiKey: string,
  personaSystemPrompt: string,
  appTitle: string,
  htmlSnippet: string,
): Promise<AppReview> {
  const system = `${personaSystemPrompt}

Output STRICT JSON only — no markdown:
{ "spokenReview": "What you say out loud about this app (will be read in your voice). Stay in character. 2-3 sentences." }`;

  const prompt = `App title: "${appTitle}"\n\nHTML preview (first 4000 chars):\n${htmlSnippet.slice(0, 4000)}`;
  const raw = await callGemini(apiKey, prompt, system);
  return JSON.parse(stripFences(raw)) as AppReview;
}
