// Fallback chain — Gemini's free tier rate-limits each model independently.
// We prefer the "lite" variants (much higher free quota: ~1500 RPD vs 20 RPD on
// the regular 2.5-flash). On a 429 we automatically rotate to the next model.
//
// Order matters: cheaper/higher-quota first, premium last.
const MODEL_CHAIN = [
  "gemini-2.5-flash-lite",   // generous free tier, good enough for our tasks
  "gemini-flash-lite-latest", // alias to the latest lite — different quota bucket
  "gemini-2.5-flash",          // higher quality, only 20 RPD on free tier
  "gemini-flash-latest",       // last resort
];

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}

class GeminiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

interface GenOpts {
  /** Force the model into strict JSON-output mode against this schema. */
  responseSchema?: Record<string, unknown>;
  /** Override default max tokens. Build needs more; reviews need less. */
  maxOutputTokens?: number;
  /** Override default temperature. */
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
      temperature: opts.temperature ?? 0.85,
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

  if (!res.ok) throw new GeminiError(res.status, `${model} failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new GeminiError(500, `${model} returned no text`);
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
      // Only rotate on quota / availability / server errors.
      if (lastErr.status !== 429 && lastErr.status !== 503 && lastErr.status !== 500) break;
    }
  }
  throw new Error(
    lastErr?.message ||
      "All Gemini models exhausted. Free tier hit its daily cap — try again in a few hours.",
  );
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

NAVIGATION — CRITICAL:
- This is ALWAYS a single-page site. There is NO router, no server, no other files.
- For multi-section sites (coffee shops, restaurants, portfolios, landing pages), build EVERY "page" as a section in this same HTML document, stacked top-to-bottom.
- Each section gets an id (e.g. id="home", id="menu", id="about", id="contact").
- Nav links MUST use in-page anchors: <a href="#menu">Menu</a>. NEVER <a href="menu.html"> or <a href="/menu"> — these will 404.
- Add <html style="scroll-behavior: smooth"> so anchor clicks smoothly scroll the user to the section.
- A sticky/fixed top nav is encouraged. Highlight the active section if you can.
- If the user asks for a "wizard" or "multi-step" UI, use sections + JS that toggles visibility (display: none/block) instead of multiple files.

IMAGES — VERY IMPORTANT:
- DO NOT use placeholder.com, via.placeholder.com, dummyimage.com, lorempicsum, or any unreliable hosts.
- DO NOT make up image URLs from random domains — they will 404.
- For any photo/image, use https://picsum.photos/seed/<word>/<width>/<height> — this is the only allowed image host. The seed keyword can be anything (e.g. coffee, nature, food, city).
- For avatars, use https://i.pravatar.cc/150?u=<unique-name> — also allowed.
- For decorative graphics, prefer pure CSS gradients, inline SVG, or emoji. NEVER reference local files like /logo.png — there is no filesystem.
- Every <img> tag MUST have width and height attributes set, plus loading="lazy".

Return your response as JSON with two fields:
- "title": a short catchy title (3-5 words)
- "html": the complete HTML document starting with <!DOCTYPE html>`;

  const raw = await callGemini(apiKey, userPrompt, system, {
    // Force the model into strict JSON mode against this schema. Eliminates the
    // unescaped-quote / truncation issues we'd hit when asking for free-form JSON.
    responseSchema: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING" },
        html: { type: "STRING" },
      },
      required: ["title", "html"],
    },
    maxOutputTokens: 32768,
    temperature: 0.85,
  });

  const parsed = parseAppResponse(raw);
  let html = sanitizeImages(parsed.html);
  html = sanitizeLinks(html);
  return { title: parsed.title, html };
}

/** Rewrite cross-page links (href="menu.html", href="/about") into in-page
 *  anchor links (href="#menu"). Generated apps live in a single HTML file
 *  with no router, so any "other page" link would 404. This is a safety
 *  net for when the model ignores the no-cross-page-links instruction.
 *
 *  Also injects smooth scroll behaviour if the document didn't include it.
 */
function sanitizeLinks(html: string): string {
  // 1. href rewrites
  html = html.replace(/<a\b([^>]*?)\bhref\s*=\s*(["'])([^"']+)\2/gi, (full, before, quote, href) => {
    // Leave alone: anchors, mailto/tel, full URLs, javascript:, data:, blank
    if (
      !href ||
      href.startsWith("#") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:") ||
      href.startsWith("javascript:") ||
      href.startsWith("data:") ||
      href.startsWith("blob:") ||
      /^https?:\/\//i.test(href) ||
      href.startsWith("//")
    ) {
      return full;
    }

    // Rewrite "menu.html" / "menu" / "/menu" / "./menu.html" → "#menu"
    const slug = href
      .replace(/^\.?\/+/, "")              // strip leading ./ or /
      .replace(/\.(html?|php|aspx?)$/i, "") // strip file extension
      .replace(/^index$/i, "home")           // index → home
      .replace(/[^a-z0-9_-]/gi, "-")
      .toLowerCase();
    if (!slug) return full;
    return `<a${before}href="#${slug}"`;
  });

  // 2. inject smooth-scroll if missing
  if (!/scroll-behavior\s*:\s*smooth/i.test(html)) {
    html = html.replace(/<html\b([^>]*)>/i, (m, attrs) => {
      if (/style\s*=/i.test(attrs)) {
        return `<html${attrs.replace(/style\s*=\s*(["'])([^"']*)\1/i, (_m2, q, s) => `style=${q}${s};scroll-behavior:smooth${q}`)}>`;
      }
      return `<html${attrs} style="scroll-behavior:smooth">`;
    });
  }

  return html;
}

/** Robust parser: tries JSON first, falls back to extracting raw HTML if the model
 *  still emits malformed JSON (e.g. unescaped quotes, truncation). Always returns
 *  something usable so the user never sees a JSON parse error.
 */
function parseAppResponse(raw: string): GeneratedApp {
  const cleaned = stripFences(raw);

  // Happy path: valid JSON
  try {
    const parsed = JSON.parse(cleaned) as GeneratedApp;
    if (parsed.html && parsed.title) return parsed;
    if (parsed.html) return { title: "Yap App", html: parsed.html };
  } catch { /* fall through */ }

  // Fallback A: a complete <!DOCTYPE html>…</html> block embedded in the text
  const docMatch = cleaned.match(/<!DOCTYPE\s+html[\s\S]*?<\/html\s*>/i);
  if (docMatch) {
    const html = docMatch[0];
    const titleFromJson = cleaned.match(/"title"\s*:\s*"([^"]{1,80})"/);
    const titleFromTag = html.match(/<title[^>]*>([^<]{1,80})<\/title>/i);
    return { title: titleFromJson?.[1] || titleFromTag?.[1] || "Yap App", html };
  }

  // Fallback B: just the <html>…</html> block, prepend doctype
  const htmlBlock = cleaned.match(/<html[\s\S]*?<\/html\s*>/i);
  if (htmlBlock) return { title: "Yap App", html: `<!DOCTYPE html>${htmlBlock[0]}` };

  // Fallback C: the model gave us truncated JSON that opens with `{ "title": "...", "html": "<!DOCTYPE...`
  // but never closes. Rip the html string out by finding its opening quote and
  // assuming everything after is the (possibly truncated) HTML body.
  const startMarker = cleaned.match(/"html"\s*:\s*"([\s\S]*)$/);
  if (startMarker) {
    let html = startMarker[1];
    // Un-escape JSON string escapes
    html = html
      .replace(/\\"/g, '"')
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\\\/g, "\\");
    // Trim trailing JSON cruft (a closing brace, the trailing quote, etc.)
    html = html.replace(/"\s*\}?\s*$/, "");
    if (html.includes("<")) {
      const titleFromJson = cleaned.match(/"title"\s*:\s*"([^"]{1,80})"/);
      // Make sure it ends with </html> for the iframe to render cleanly
      if (!/<\/html>/i.test(html)) html += "</body></html>";
      return { title: titleFromJson?.[1] || "Yap App", html };
    }
  }

  // Surface a friendly error AND log so we can debug from Vercel logs
  console.error("[generateApp] Unparseable response from Gemini. First 500 chars:", cleaned.slice(0, 500));
  throw new Error(
    "The model returned a response we couldn't parse. Try saying it again with slightly different wording.",
  );
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

Stay in character. 2-3 sentences max. Return JSON with one field "spokenReview" — what you'll say out loud about this app, read aloud in your voice.`;

  const prompt = `App title: "${appTitle}"\n\nHTML preview (first 4000 chars):\n${htmlSnippet.slice(0, 4000)}`;
  const raw = await callGemini(apiKey, prompt, system, {
    responseSchema: {
      type: "OBJECT",
      properties: { spokenReview: { type: "STRING" } },
      required: ["spokenReview"],
    },
    maxOutputTokens: 800,
    temperature: 0.9,
  });
  try {
    return JSON.parse(stripFences(raw)) as AppReview;
  } catch {
    // Last-ditch: take whatever raw text came back and use it directly
    return { spokenReview: stripFences(raw).slice(0, 500).trim() };
  }
}
