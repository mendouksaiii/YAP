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

IMAGES — VERY IMPORTANT:
- DO NOT use placeholder.com, via.placeholder.com, dummyimage.com, lorempicsum, or any unreliable hosts.
- DO NOT make up image URLs from random domains — they will 404.
- For any photo/image, use https://picsum.photos/seed/<word>/<width>/<height> — this is the only allowed image host. The seed keyword can be anything (e.g. coffee, nature, food, city).
- For avatars, use https://i.pravatar.cc/150?u=<unique-name> — also allowed.
- For decorative graphics, prefer pure CSS gradients, inline SVG, or emoji. NEVER reference local files like /logo.png — there is no filesystem.
- Every <img> tag MUST have width and height attributes set, plus loading="lazy".

Output STRICT JSON (no markdown, no commentary):
{
  "title": "Short catchy title (3-5 words)",
  "html": "<!DOCTYPE html>...</html>"
}`;

  const raw = await callGemini(apiKey, userPrompt, system);
  const parsed = JSON.parse(stripFences(raw)) as GeneratedApp;
  return { title: parsed.title, html: sanitizeImages(parsed.html) };
}

/** Replace <img src="..."> URLs that point at known-broken or local-only sources
 *  with safe picsum.photos fallbacks. Also rewrites obviously made-up paths.
 */
function sanitizeImages(html: string): string {
  const ALLOWED_HOSTS = ["picsum.photos", "i.pravatar.cc", "fastly.picsum.photos"];
  let pic = 0;
  return html.replace(/<img\b([^>]*?)>/gi, (full, attrs) => {
    const srcMatch = attrs.match(/\bsrc\s*=\s*"([^"]*)"/i) || attrs.match(/\bsrc\s*=\s*'([^']*)'/i);
    if (!srcMatch) return full;
    const src = srcMatch[1].trim();

    // Already safe (data URI, allowed CDN, valid SVG)?
    if (src.startsWith("data:")) return full;
    if (src.startsWith("blob:")) return full;
    let host = "";
    try { host = new URL(src, "https://x.invalid").hostname; } catch {}
    if (ALLOWED_HOSTS.some((h) => host === h || host.endsWith("." + h))) return full;

    // Replace with picsum.photos fallback. Pick dimensions that match the existing width/height when present.
    const wMatch = attrs.match(/\bwidth\s*=\s*"?(\d+)"?/i);
    const hMatch = attrs.match(/\bheight\s*=\s*"?(\d+)"?/i);
    const w = wMatch ? Math.max(80, Math.min(1600, +wMatch[1])) : 600;
    const h = hMatch ? Math.max(80, Math.min(1600, +hMatch[1])) : 400;
    pic += 1;
    const replaced = `https://picsum.photos/seed/yap${pic}/${w}/${h}`;
    const newAttrs = attrs.replace(/\bsrc\s*=\s*"[^"]*"/i, `src="${replaced}"`).replace(/\bsrc\s*=\s*'[^']*'/i, `src="${replaced}"`);
    return `<img${newAttrs}>`;
  });
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
