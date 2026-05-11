# Yap — Build apps by talking

> Built for [#ElevenHacks](https://hacks.elevenlabs.io/hackathons/7) — Cursor + ElevenLabs hackathon.

Yap is a voice-first development studio. **No keyboard required.**

## Three superpowers

| Tool | What it does |
|---|---|
| 🛠️ **Yap to Build** | Describe an app out loud → Gemini generates code → deployed to a real Vercel URL in under 30 seconds. Pick from 10 famous-dev personas (Linus, Carmack, DHH, etc.) to roast your code in their actual cloned voice. |
| 🌍 **Voice Dubbing** | Clone your voice once. Speak in English. Hear yourself fluent in Spanish, Japanese, Hindi, French — 12 languages, your real voice. |
| 🏆 **Yapper Levels** | 10-level XP system. From 🐣 Level 1 Yapper to 👑 Level 10 Legend. Full history, animated profile. |

## What's in here

- `webapp/` — Next.js 15 + Tailwind. The main product.
- `extension/` — Cursor / VS Code extension. Bonus deliverable.
- `voices/` — 90-second audio clips used to clone the 10 famous-dev voices (gitignored).
- `voice_ids.json` — the resulting ElevenLabs voice IDs.

## Built with

- **ElevenLabs** — STT (scribe_v1), TTS (eleven_turbo_v2_5 + multilingual_v2), Instant Voice Cloning
- **Cursor** — built the whole thing in Cursor, integrated as an editor extension too
- **Gemini 2.5 Flash** — code generation, translation, persona reviews
- **Vercel** — deploys generated apps in real-time
- **Resend** — passwordless email magic-link auth
- **Next.js 15** + Tailwind + TypeScript

## Running locally

```bash
cd webapp
npm install
cp .env.local.example .env.local  # fill in keys
npm run dev
```

Required env:

```
ELEVENLABS_API_KEY=...
GEMINI_API_KEY=...
VERCEL_TOKEN=...
RESEND_API_KEY=...
JWT_SECRET=<openssl rand -hex 32>
AUTH_FROM_EMAIL=Yap <onboarding@resend.dev>
```

## License

Hackathon submission. MIT after the event.
