# Yap — Voice-First Coding for Cursor

> Built for [#ElevenHacks](https://hacks.elevenlabs.io/hackathons/7) — Cursor + ElevenLabs.

Voice-first coding inside your editor. **Build apps, get roasted, code along** — all by talking.

## Three modes

### 🛠️ Build
Tap the mic, describe what you want — *"a tic-tac-toe game with neon styling"* — and Yap writes the code into your workspace. Files appear, ready to run.

### 🔥 Review
Open any file. Pick a famous dev (Linus, Carmack, DHH, Uncle Bob, Rich Hickey, Bjarne, Guido, ThePrimeagen, Theo, Kelsey). Tap mic. They read your code and roast it **in their actual cloned voice**. Suggested edits get applied live.

### 👁️ Live Roast Mode
The killer feature. Toggle it on and pick a watcher. Now **every time you (or Cursor's AI agent) edits a file, that dev reacts in real time, in their voice.** Linus screams when you use `var`. Carmack whispers when you allocate in a hot loop. Theo asks why this isn't TypeScript.

Implemented via Cursor's `afterFileEdit` hook system.

## Setup

1. Install the extension (`Ctrl+Shift+P` → *Install from VSIX*).
2. Open Settings (`Ctrl+,`), search "yap", and paste:
   - `yap.elevenlabsApiKey` — get one free at [elevenlabs.io](https://elevenlabs.io)
   - `yap.geminiApiKey` — get one free at [aistudio.google.com](https://aistudio.google.com)
   - *Optional:* `yap.cursorApiKey` from [cursor.com/dashboard/integrations](https://cursor.com/dashboard/integrations) — when set, Build Mode uses the actual Cursor agent SDK instead of Gemini.
3. Click the Yap icon in the activity bar (left side).

## How the famous-dev voices work

Each persona is a real cloned voice from ElevenLabs Instant Voice Cloning, built from 90 seconds of public conference-talk audio. The Gemini-generated review text is fed through ElevenLabs Turbo TTS in that voice — so when you hear "Linus", it actually sounds like him.

## Want it without installing the extension?

Yap is also a full web app at **[yap-flame.vercel.app](https://yap-flame.vercel.app)** — same three modes plus voice-dubbing into 12 languages and a leveling system.

## Tech

- **ElevenLabs** STT (`scribe_v1`) + TTS (`eleven_turbo_v2_5`) + Voice Cloning
- **Gemini 2.5 Flash** with model fallback chain (rate-limit resilient)
- **Cursor SDK** for Build Mode (optional)
- **Cursor Hooks** (`afterFileEdit`) for Live Roast Mode

## License

MIT after the hackathon.
