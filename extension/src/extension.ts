import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { PERSONAS, getPersona } from "./personas";
import { speechToText, textToSpeech } from "./services/elevenlabs";
import { generateApp, reviewCode } from "./services/gemini";
import { buildWithCursor } from "./services/cursorSdk";
import { HookServer, EditEvent } from "./services/hookServer";

const CONFIG_NS = "yap";

interface Keys {
  eleven: string;
  gemini: string;
  cursor: string;
}

function getKeys(): Keys {
  const cfg = vscode.workspace.getConfiguration(CONFIG_NS);
  return {
    eleven: cfg.get<string>("elevenlabsApiKey") || "",
    gemini: cfg.get<string>("geminiApiKey") || "",
    cursor: cfg.get<string>("cursorApiKey") || "",
  };
}

let hookServer: HookServer | null = null;
let hookPort = 0;
let activePersonaId = "linus";
let roastEnabled = false;
const roastCooldown = new Map<string, number>(); // file_path -> last fire ts
const ROAST_MIN_INTERVAL_MS = 4000;

function workspaceRoot(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

/** Write the hook configuration into the active workspace (and ~/.cursor as user-global). */
async function installHook(extensionPath: string, port: number) {
  const hookSrc = path.join(extensionPath, "resources", "yap-hook.cjs");
  if (!fs.existsSync(hookSrc)) return;

  const installInDir = (dir: string) => {
    try {
      fs.mkdirSync(dir, { recursive: true });
      const dest = path.join(dir, "yap-hook.cjs");
      fs.copyFileSync(hookSrc, dest);
      fs.writeFileSync(path.join(dir, "yap-port"), String(port), "utf8");

      const hooksPath = path.join(dir, "hooks.json");
      let existing: any = { version: 1, hooks: {} };
      if (fs.existsSync(hooksPath)) {
        try { existing = JSON.parse(fs.readFileSync(hooksPath, "utf8")); } catch {}
      }
      existing.version ??= 1;
      existing.hooks ??= {};
      existing.hooks.afterFileEdit ??= [];
      const command = `node "${dest}"`;
      const arr = existing.hooks.afterFileEdit as Array<{ command: string }>;
      if (!arr.some((h) => h.command === command)) {
        arr.push({ command });
      }
      fs.writeFileSync(hooksPath, JSON.stringify(existing, null, 2), "utf8");
    } catch (e) {
      console.error("Yap: failed to install hook in", dir, e);
    }
  };

  // User-global so the hook works regardless of which folder is open
  const userCursorDir = path.join(os.homedir(), ".cursor");
  installInDir(userCursorDir);

  // Workspace-local for explicit visibility
  const ws = workspaceRoot();
  if (ws) installInDir(path.join(ws, ".cursor"));
}

class YapPanelProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "yap.panel";
  public view?: vscode.WebviewView;

  constructor(private readonly extensionUri: vscode.Uri) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };
    webviewView.webview.html = this.getHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (msg) => {
      try {
        switch (msg.type) {
          case "transcribe":
            await this.handleTranscribe(msg.audio, msg.mimeType, msg.mode);
            break;
          case "build":
            await this.handleBuild(msg.prompt);
            break;
          case "review":
            await this.handleReview(msg.personaId);
            break;
          case "set-persona":
            activePersonaId = msg.personaId;
            await vscode.workspace.getConfiguration(CONFIG_NS).update("activePersona", msg.personaId, vscode.ConfigurationTarget.Global);
            break;
          case "set-roast":
            roastEnabled = !!msg.enabled;
            await vscode.workspace.getConfiguration(CONFIG_NS).update("roastEnabled", roastEnabled, vscode.ConfigurationTarget.Global);
            this.post({ type: "roast-state", enabled: roastEnabled });
            break;
          case "ready":
            this.post({ type: "init", port: hookPort, persona: activePersonaId, roast: roastEnabled });
            break;
          case "speak":
            await this.handleSpeak(msg.personaId, msg.text);
            break;
          case "open-settings":
            await vscode.commands.executeCommand("workbench.action.openSettings", "@ext:yap.yap");
            break;
          case "open-external":
            if (typeof msg.url === "string") {
              await vscode.env.openExternal(vscode.Uri.parse(msg.url));
            }
            break;
        }
      } catch (err: any) {
        this.post({ type: "error", message: err.message || String(err) });
      }
    });
  }

  post(message: any) {
    this.view?.webview.postMessage(message);
  }

  private async handleTranscribe(base64: string, mimeType: string, mode: string) {
    const keys = getKeys();
    if (!keys.eleven) {
      this.post({ type: "error", message: "Set yap.elevenlabsApiKey in settings." });
      return;
    }
    this.post({ type: "status", message: "Transcribing..." });
    const audio = Buffer.from(base64, "base64");
    const text = await speechToText(keys.eleven, new Uint8Array(audio), mimeType);
    this.post({ type: "transcript", text, mode });
  }

  private async handleBuild(prompt: string) {
    const keys = getKeys();
    const ws = workspaceRoot();
    if (!ws) {
      this.post({ type: "error", message: "Open a folder first — Yap needs somewhere to write the app." });
      return;
    }

    if (keys.cursor) {
      this.post({ type: "status", message: "Cursor is building your app..." });
      try {
        await buildWithCursor(keys.cursor, ws, prompt, (chunk) => {
          this.post({ type: "build-stream", text: chunk });
        });
        this.post({ type: "build-done", folder: "yap-app", engine: "cursor" });
        return;
      } catch (e: any) {
        this.post({ type: "status", message: `Cursor SDK failed (${e.message}). Falling back to Gemini...` });
      }
    }

    if (!keys.gemini) {
      this.post({ type: "error", message: "Set yap.geminiApiKey (or yap.cursorApiKey) in settings." });
      return;
    }

    this.post({ type: "status", message: "Building with Gemini..." });
    const files = await generateApp(keys.gemini, prompt);
    const folderUri = vscode.Uri.joinPath(vscode.Uri.file(ws), "yap-app");
    await vscode.workspace.fs.createDirectory(folderUri);
    for (const f of files) {
      const fileUri = vscode.Uri.joinPath(folderUri, f.path);
      await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(fileUri, ".."));
      await vscode.workspace.fs.writeFile(fileUri, Buffer.from(f.content, "utf8"));
    }
    const entry = files.find((f) => /index\.html$/i.test(f.path)) ?? files[0];
    if (entry) {
      const entryUri = vscode.Uri.joinPath(folderUri, entry.path);
      const doc = await vscode.workspace.openTextDocument(entryUri);
      await vscode.window.showTextDocument(doc, { preview: false });
    }
    this.post({ type: "build-done", folder: "yap-app", engine: "gemini", files: files.map((f) => f.path) });
  }

  private async handleReview(personaId: string) {
    const keys = getKeys();
    if (!keys.gemini || !keys.eleven) {
      this.post({ type: "error", message: "Need yap.geminiApiKey + yap.elevenlabsApiKey." });
      return;
    }
    const persona = getPersona(personaId);
    if (!persona) return;
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      this.post({ type: "error", message: "Open a file first." });
      return;
    }
    const filename = path.basename(editor.document.fileName);
    const code = editor.document.getText();

    this.post({ type: "status", message: `${persona.name} is reading your code...` });
    const review = await reviewCode(keys.gemini, persona.systemPrompt, filename, code);
    this.post({ type: "review-text", text: review.spokenReview, persona: persona.name, personaId, emoji: persona.emoji });

    const audio = await textToSpeech(keys.eleven, persona.voiceId, review.spokenReview);
    this.post({ type: "play-audio", audio: Buffer.from(audio).toString("base64"), mime: "audio/mpeg" });

    if (review.suggestedEdits?.length) {
      const doc = editor.document;
      const edit = new vscode.WorkspaceEdit();
      for (const e of review.suggestedEdits) {
        const idx = doc.getText().indexOf(e.original);
        if (idx === -1) continue;
        edit.replace(doc.uri, new vscode.Range(doc.positionAt(idx), doc.positionAt(idx + e.original.length)), e.replacement);
      }
      await vscode.workspace.applyEdit(edit);
      this.post({ type: "edits-applied", count: review.suggestedEdits.length });
    }
  }

  private async handleSpeak(personaId: string, text: string) {
    const keys = getKeys();
    if (!keys.eleven) return;
    const persona = getPersona(personaId);
    if (!persona) return;
    const audio = await textToSpeech(keys.eleven, persona.voiceId, text);
    this.post({ type: "play-audio", audio: Buffer.from(audio).toString("base64"), mime: "audio/mpeg" });
  }

  private getHtml(webview: vscode.Webview): string {
    const personasJson = JSON.stringify(
      PERSONAS.map((p) => ({ id: p.id, name: p.name, emoji: p.emoji })),
    );
    const cfg = vscode.workspace.getConfiguration(CONFIG_NS);
    const needsSetup = !cfg.get<string>("elevenlabsApiKey") || !cfg.get<string>("geminiApiKey");
    const nonce = randomNonce();
    return /* html */ `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy"
      content="default-src 'none'; img-src ${webview.cspSource} https: data:; media-src blob: data:; style-src ${webview.cspSource} 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'nonce-${nonce}'; connect-src http://127.0.0.1:* ws://127.0.0.1:*;">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&family=Geist:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
:root {
  --bg: var(--vscode-sideBar-background, #0a0a0b);
  --panel: rgba(255,255,255,0.025);
  --panel-2: rgba(255,255,255,0.05);
  --border: rgba(255,255,255,0.08);
  --text: var(--vscode-foreground, #ededf0);
  --muted: rgba(255,255,255,0.5);
  --accent: #ff5e3a;
  --accent-2: #ff8a3a;
  --green: #4ade80;
}
* { box-sizing: border-box; }
body { margin: 0; padding: 14px 12px; background: var(--bg); color: var(--text);
  font-family: 'Geist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  font-feature-settings: "ss01"; -webkit-font-smoothing: antialiased; }

.header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.logo { display: flex; align-items: center; gap: 8px; }
.logo svg { width: 28px; height: 28px;
  filter: drop-shadow(0 0 14px rgba(255, 94, 58, 0.4));
  animation: float 6s ease-in-out infinite; }
.logo-text { font-size: 18px; font-weight: 800; letter-spacing: -0.5px; }
.logo-tag { font-family: 'Geist Mono', monospace; font-size: 9px; color: var(--muted); margin-left: 3px; }
@keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
.yap-eyes { animation: yapBlink 5.5s infinite; transform-origin: center 48px; }
@keyframes yapBlink { 0%,92%,100% { transform: scaleY(1); } 94%,98% { transform: scaleY(0.1); } }
.live-pill { font-size: 9px; font-weight: 600; padding: 3px 7px; border-radius: 999px;
  background: rgba(74,222,128,0.12); color: var(--green); border: 1px solid rgba(74,222,128,0.25);
  display: flex; align-items: center; gap: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
.live-pill::before { content: ''; width: 5px; height: 5px; border-radius: 50%; background: var(--green); animation: blink 1.4s ease-in-out infinite; }
@keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }

.modes { display: flex; gap: 3px; background: var(--panel); padding: 3px; border-radius: 9px;
  border: 1px solid var(--border); margin-bottom: 14px; }
.mode { flex: 1; padding: 7px 4px; text-align: center; cursor: pointer;
  background: transparent; color: var(--muted); border: none; border-radius: 6px;
  font-family: inherit; font-size: 11px; font-weight: 600; transition: all 0.15s;
  display: flex; align-items: center; justify-content: center; gap: 3px; }
.mode:hover { color: var(--text); }
.mode.active { background: var(--panel-2); color: var(--text); box-shadow: 0 1px 2px rgba(0,0,0,0.3); }

.watcher { display: flex; align-items: center; gap: 8px; padding: 10px;
  background: var(--panel); border: 1px solid var(--border); border-radius: 10px; margin-bottom: 10px; }
.watcher-avatar { width: 30px; height: 30px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; }
.watcher-info { flex: 1; min-width: 0; }
.watcher-label { font-size: 9px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.7px; }
.watcher-name { font-size: 13px; font-weight: 700; color: var(--text); margin-top: 1px; }
.watcher-toggle { font-size: 10px; padding: 4px 8px; border-radius: 5px; cursor: pointer; border: 1px solid var(--border);
  background: transparent; color: var(--muted); font-family: inherit; font-weight: 600; }
.watcher-toggle.on { background: var(--green); color: #062; border-color: transparent; }

.mic-card { background: var(--panel); border: 1px solid var(--border); border-radius: 12px;
  padding: 20px 14px; text-align: center; margin-bottom: 12px; }
.mic-button { width: 76px; height: 76px; border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  display: flex; align-items: center; justify-content: center; margin: 0 auto 10px;
  cursor: pointer; transition: transform 0.15s; box-shadow: 0 6px 28px rgba(255,94,58,0.35); position: relative; }
.mic-button:hover { transform: scale(1.04); }
.mic-button.recording { background: linear-gradient(135deg, #ef4444, #f97316); }
.mic-button.recording::before { content: ''; position: absolute; inset: -7px; border-radius: 50%;
  border: 2px solid var(--accent); animation: pulse-ring 1.4s ease-out infinite; }
@keyframes pulse-ring { 0% { transform: scale(0.95); opacity: 1; } 100% { transform: scale(1.4); opacity: 0; } }
.mic-button svg { width: 32px; height: 32px; color: #fff; }
.mic-label { font-size: 12px; color: var(--text); font-weight: 500; }
.mic-hint { font-family: 'Geist Mono', monospace; font-size: 10px; color: var(--muted); margin-top: 3px; }

.section-label { font-size: 9px; font-weight: 600; color: var(--muted); text-transform: uppercase;
  letter-spacing: 0.7px; margin: 12px 4px 7px; }
.personas { display: grid; grid-template-columns: repeat(2, 1fr); gap: 5px; margin-bottom: 12px; }
.persona { background: var(--panel); border: 1px solid var(--border); border-radius: 8px;
  padding: 8px 6px; cursor: pointer; transition: all 0.12s; display: flex; align-items: center; gap: 6px; }
.persona:hover { background: var(--panel-2); }
.persona.selected { border-color: var(--accent); background: rgba(255,94,58,0.08); }
.persona-avatar { width: 24px; height: 24px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0; }
.persona-info { flex: 1; min-width: 0; overflow: hidden; }
.persona-name { font-size: 11px; font-weight: 600; color: var(--text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.persona-tag { font-family: 'Geist Mono', monospace; font-size: 8px; color: var(--muted);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.review-bubble { background: linear-gradient(135deg, rgba(67,56,202,0.08), rgba(126,34,206,0.08));
  border: 1px solid rgba(126,34,206,0.2); border-radius: 10px; padding: 12px; margin-bottom: 10px; }
.review-bubble.speaking { border-color: var(--accent); box-shadow: 0 0 0 1px rgba(255,94,58,0.3); }
.review-header { display: flex; align-items: center; gap: 7px; margin-bottom: 7px; }
.review-name { font-size: 11px; font-weight: 700; color: var(--text); }
.review-status { font-family: 'Geist Mono', monospace; font-size: 9px; color: var(--accent);
  margin-left: auto; display: flex; align-items: center; gap: 4px; }
.speaker-bars { display: inline-flex; gap: 2px; align-items: center; height: 11px; }
.speaker-bars span { display: block; width: 2px; background: var(--accent); animation: bar 0.8s ease-in-out infinite; }
.speaker-bars span:nth-child(1) { height: 5px; animation-delay: -0.4s; }
.speaker-bars span:nth-child(2) { height: 9px; animation-delay: -0.2s; }
.speaker-bars span:nth-child(3) { height: 4px; animation-delay: 0s; }
.speaker-bars span:nth-child(4) { height: 7px; animation-delay: -0.3s; }
@keyframes bar { 0%,100% { transform: scaleY(0.4); } 50% { transform: scaleY(1); } }
.review-text { font-size: 12px; line-height: 1.5; color: var(--text); }

.transcript { background: rgba(255,255,255,0.04); border-radius: 7px; padding: 8px 10px;
  font-size: 11px; font-style: italic; margin-bottom: 8px; border-left: 2px solid var(--accent); }
.status { font-family: 'Geist Mono', monospace; font-size: 10px; color: var(--muted);
  padding: 6px 4px; min-height: 14px; word-break: break-word; }
.status.error { color: #f87171; }

.setup-card { background: linear-gradient(135deg, rgba(255,94,58,0.08), rgba(255,138,58,0.04));
  border: 1px solid rgba(255,94,58,0.25); border-radius: 10px; padding: 12px;
  margin-bottom: 12px; }
.setup-card .label { font-mono text-[9px]; font-size: 9px; font-weight: 700;
  color: var(--accent); text-transform: uppercase; letter-spacing: 1px;
  margin-bottom: 4px; display: flex; align-items: center; gap: 4px; font-family: 'Geist Mono', monospace; }
.setup-card .title { font-size: 13px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
.setup-card .body { font-size: 11px; color: var(--muted); line-height: 1.5; margin-bottom: 8px; }
.setup-card .ol { margin: 0 0 8px 14px; padding: 0; font-size: 11px; color: var(--muted); }
.setup-card .ol li { margin-bottom: 3px; }
.setup-card .ol code { font-family: 'Geist Mono', monospace; font-size: 10px;
  background: rgba(255,255,255,0.06); padding: 1px 5px; border-radius: 3px; color: var(--text); }
.setup-card .open-settings { display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 10px; border-radius: 6px;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  color: #fff; font-size: 11px; font-weight: 600; cursor: pointer;
  border: none; font-family: inherit;
  box-shadow: 0 2px 12px rgba(255,94,58,0.35); }
.setup-card .open-settings:hover { box-shadow: 0 4px 18px rgba(255,94,58,0.5); }

.footer { margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border);
  display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.footer-link { font-family: 'Geist Mono', monospace; font-size: 9px; color: var(--muted);
  text-decoration: none; cursor: pointer; transition: color 0.15s; }
.footer-link:hover { color: var(--accent); }
.footer-link svg { display: inline-block; width: 9px; height: 9px; vertical-align: middle; margin-left: 3px; }

audio { display: none; }
</style>
</head>
<body>
<div class="header">
  <div class="logo">
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-label="Yap">
      <defs>
        <linearGradient id="yap-bubble" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffb380"/>
          <stop offset="35%" stop-color="#ff8a3a"/>
          <stop offset="70%" stop-color="#ff5e3a"/>
          <stop offset="100%" stop-color="#cc2e1a"/>
        </linearGradient>
        <linearGradient id="yap-blob" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#ffd9b8" stop-opacity="0.95"/>
          <stop offset="100%" stop-color="#ff8a3a" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="M52 6 C76 6 92 24 92 46 C92 63 81 78 65 84 L52 96 L46 84 C24 82 8 64 8 46 C8 24 28 6 52 6 Z"
            fill="url(#yap-bubble)" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>
      <path d="M30 35 C30 25 42 18 55 22 C50 38 42 50 32 56 C26 50 28 42 30 35 Z" fill="url(#yap-blob)"/>
      <g class="yap-eyes">
        <circle cx="42" cy="48" r="5" fill="#fff"/>
        <circle cx="60" cy="48" r="5" fill="#fff"/>
      </g>
    </svg>
    <div class="logo-text">Yap</div>
    <span class="logo-tag">v0.3</span>
  </div>
  <div class="live-pill">Live</div>
</div>

${needsSetup ? `<div class="setup-card">
  <div class="label">⚠ first-run setup</div>
  <div class="title">Add your API keys to get started</div>
  <div class="body">Yap needs two free API keys to work:</div>
  <ol class="ol">
    <li><code>yap.elevenlabsApiKey</code> from <span style="color:var(--text)">elevenlabs.io</span></li>
    <li><code>yap.geminiApiKey</code> from <span style="color:var(--text)">aistudio.google.com</span></li>
  </ol>
  <button class="open-settings" id="openSettings">Open Settings →</button>
</div>` : ""}

<div class="modes">
  <button class="mode active" data-mode="build">🛠️ Build</button>
  <button class="mode" data-mode="review">🔥 Review</button>
  <button class="mode" data-mode="roast">👁️ Roast</button>
</div>

<div class="watcher" id="watcher" style="display:none;">
  <div class="watcher-avatar" id="watcherAvatar">🐧</div>
  <div class="watcher-info">
    <div class="watcher-label">Watching your code</div>
    <div class="watcher-name" id="watcherName">Linus Torvalds</div>
  </div>
  <button class="watcher-toggle" id="roastToggle">OFF</button>
</div>

<div class="mic-card">
  <div class="mic-button" id="mic">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="22"/>
    </svg>
  </div>
  <div class="mic-label" id="micLabel">Tap to talk</div>
  <div class="mic-hint" id="micHint">Describe what you want to build</div>
</div>

<div id="reviewArea"></div>
<div class="status" id="status">Ready.</div>

<div class="section-label" id="personaLabel">Pick your reviewer</div>
<div class="personas" id="personas"></div>

<div class="footer">
  <a href="https://yap-flame.vercel.app" class="footer-link" id="openWebapp">
    yap-flame.vercel.app
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M15 3h6v6"/><path d="M10 14L21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    </svg>
  </a>
  <span class="footer-link" style="cursor:default;">cursor + elevenlabs</span>
</div>

<audio id="player"></audio>

<script nonce="${nonce}">
const vscode = acquireVsCodeApi();
const PERSONAS = ${personasJson};
const COLORS = { linus:'#1f6feb', carmack:'#7c3aed', dhh:'#cc0000', uncle_bob:'#4ade80',
  rich_hickey:'#a855f7', bjarne:'#f59e0b', guido:'#3b82f6', prime:'#ef4444',
  theo:'#06b6d4', kelsey:'#0ea5e9' };
const TAGS = { linus:'brutal', carmack:'analytical', dhh:'opinionated', uncle_bob:'SOLID',
  rich_hickey:'philosophical', bjarne:'C++', guido:'pythonic', prime:'BLAZINGLY FAST',
  theo:'TypeScript', kelsey:'k8s' };

let mode = 'build';
let selectedPersona = 'linus';
let roastEnabled = false;
let mediaRecorder = null;
let chunks = [];
let recording = false;
let bridgePort = 0;
let evtSource = null;

const $ = (id) => document.getElementById(id);
const $personas = $('personas'), $watcher = $('watcher'), $mic = $('mic');
const $micLabel = $('micLabel'), $micHint = $('micHint');
const $personaLabel = $('personaLabel'), $reviewArea = $('reviewArea');
const $status = $('status'), $player = $('player');
const $watcherAvatar = $('watcherAvatar'), $watcherName = $('watcherName');
const $roastToggle = $('roastToggle');

function renderPersonas() {
  $personas.innerHTML = '';
  PERSONAS.forEach(p => {
    const el = document.createElement('div');
    el.className = 'persona' + (p.id === selectedPersona ? ' selected' : '');
    const color = COLORS[p.id] || '#888';
    el.innerHTML = '<div class="persona-avatar" style="background: linear-gradient(135deg, '+color+', '+color+'88)">'+p.emoji+'</div>'
      + '<div class="persona-info"><div class="persona-name">'+p.name+'</div><div class="persona-tag">'+(TAGS[p.id]||'')+'</div></div>';
    el.onclick = () => {
      selectedPersona = p.id;
      vscode.postMessage({ type: 'set-persona', personaId: p.id });
      renderPersonas();
      updateWatcher();
    };
    $personas.appendChild(el);
  });
}

function updateWatcher() {
  const p = PERSONAS.find(x => x.id === selectedPersona);
  if (!p) return;
  const color = COLORS[p.id] || '#888';
  $watcherAvatar.textContent = p.emoji;
  $watcherAvatar.style.background = 'linear-gradient(135deg, '+color+', '+color+'88)';
  $watcherName.textContent = p.name;
}

function setMode(m) {
  mode = m;
  document.querySelectorAll('.mode').forEach(x => x.classList.toggle('active', x.dataset.mode === m));
  if (m === 'build') {
    $watcher.style.display = 'none';
    $micLabel.textContent = 'Tap to talk';
    $micHint.textContent = 'Describe what you want to build';
    $personaLabel.textContent = 'Pick your reviewer';
  } else if (m === 'review') {
    $watcher.style.display = 'none';
    $micLabel.textContent = 'Tap to review';
    $micHint.textContent = 'Open a file, then tap to review';
    $personaLabel.textContent = 'Pick your reviewer';
  } else {
    $watcher.style.display = 'flex';
    updateWatcher();
    $micLabel.textContent = roastEnabled ? 'Roast: ON' : 'Roast: OFF';
    $micHint.textContent = 'They react to every edit you make';
    $personaLabel.textContent = 'Pick who watches';
  }
}

function updateRoastToggle() {
  $roastToggle.textContent = roastEnabled ? 'ON' : 'OFF';
  $roastToggle.classList.toggle('on', roastEnabled);
  if (mode === 'roast') $micLabel.textContent = roastEnabled ? 'Roast: ON' : 'Roast: OFF';
}

document.querySelectorAll('.mode').forEach(b => b.onclick = () => setMode(b.dataset.mode));
$roastToggle.onclick = () => {
  roastEnabled = !roastEnabled;
  vscode.postMessage({ type: 'set-roast', enabled: roastEnabled });
  updateRoastToggle();
};

$mic.onclick = async () => {
  if (mode === 'review') {
    // Review doesn't need transcription — just trigger the review.
    vscode.postMessage({ type: 'review', personaId: selectedPersona });
    return;
  }
  if (recording) { mediaRecorder.stop(); return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
    mediaRecorder = new MediaRecorder(stream, { mimeType: mime });
    chunks = [];
    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      recording = false;
      $mic.classList.remove('recording');
      setMode(mode);
      const blob = new Blob(chunks, { type: mime });
      const buf = await blob.arrayBuffer();
      const u8 = new Uint8Array(buf);
      let bin = ''; for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
      vscode.postMessage({ type: 'transcribe', audio: btoa(bin), mimeType: mime, mode });
    };
    mediaRecorder.start();
    recording = true;
    $mic.classList.add('recording');
    $micLabel.textContent = 'Listening...';
    $micHint.textContent = 'Tap to stop';
  } catch (e) {
    $status.textContent = 'Mic permission denied.';
  }
};

function showReview(name, emoji, personaId, text) {
  const color = COLORS[personaId] || '#888';
  $reviewArea.innerHTML = '<div class="review-bubble speaking">'
    + '<div class="review-header">'
    + '<div class="persona-avatar" style="width:22px;height:22px;font-size:12px;background:linear-gradient(135deg,'+color+','+color+'88)">'+emoji+'</div>'
    + '<div class="review-name">'+name+'</div>'
    + '<div class="review-status"><div class="speaker-bars"><span></span><span></span><span></span><span></span></div>speaking</div>'
    + '</div>'
    + '<div class="review-text">'+text+'</div></div>';
}

window.addEventListener('message', (e) => {
  const m = e.data;
  switch (m.type) {
    case 'init':
      bridgePort = m.port; selectedPersona = m.persona || 'linus'; roastEnabled = !!m.roast;
      renderPersonas(); updateRoastToggle();
      if (bridgePort) connectBridge(bridgePort);
      break;
    case 'roast-state':
      roastEnabled = m.enabled; updateRoastToggle(); break;
    case 'status':
      $status.textContent = m.message;
      $status.classList.remove('error');
      break;
    case 'error':
      $status.textContent = '⚠ ' + m.message;
      $status.classList.add('error');
      break;
    case 'transcript':
      $reviewArea.innerHTML = '<div class="transcript">"' + m.text + '"</div>';
      if (m.mode === 'build') vscode.postMessage({ type: 'build', prompt: m.text });
      break;
    case 'build-done':
      $status.textContent = '✓ Built in /' + m.folder + ' (' + (m.engine || 'cursor') + ')';
      break;
    case 'build-stream':
      $status.textContent = m.text.slice(-80); break;
    case 'review-text':
      showReview(m.persona, m.emoji, m.personaId, m.text); break;
    case 'edits-applied':
      $status.textContent = '✓ Applied ' + m.count + ' edits'; break;
    case 'play-audio':
      const blob = new Blob([Uint8Array.from(atob(m.audio), c => c.charCodeAt(0))], { type: m.mime });
      $player.src = URL.createObjectURL(blob); $player.play(); break;
  }
});

function connectBridge(port) {
  try {
    if (evtSource) evtSource.close();
    evtSource = new EventSource('http://127.0.0.1:' + port + '/events');
    evtSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'roast') {
          showReview(data.persona, data.emoji, data.personaId, data.text);
          if (data.audio) {
            const blob = new Blob([Uint8Array.from(atob(data.audio), c => c.charCodeAt(0))], { type: 'audio/mpeg' });
            $player.src = URL.createObjectURL(blob); $player.play();
          }
        }
      } catch {}
    };
    evtSource.onerror = () => { /* will auto-reconnect */ };
  } catch (e) {}
}

// Setup card button
const $setupBtn = document.getElementById('openSettings');
if ($setupBtn) $setupBtn.onclick = () => vscode.postMessage({ type: 'open-settings' });

// Footer webapp link
const $webappBtn = document.getElementById('openWebapp');
if ($webappBtn) $webappBtn.onclick = (e) => { e.preventDefault(); vscode.postMessage({ type: 'open-external', url: 'https://yap-flame.vercel.app' }); };

vscode.postMessage({ type: 'ready' });
</script>
</body>
</html>`;
  }
}

function randomNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < 32; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

let panelProvider: YapPanelProvider | null = null;

async function handleEdit(event: EditEvent) {
  if (!roastEnabled) return;
  const keys = getKeys();
  if (!keys.gemini || !keys.eleven) return;

  // Skip noisy/system edits
  if (!event.file_path || /node_modules|\.git\/|\.cursor\//.test(event.file_path)) return;
  if (!event.edits || event.edits.length === 0) return;

  // Cooldown per file
  const now = Date.now();
  const last = roastCooldown.get(event.file_path) || 0;
  if (now - last < ROAST_MIN_INTERVAL_MS) return;
  roastCooldown.set(event.file_path, now);

  const persona = getPersona(activePersonaId);
  if (!persona) return;

  // Construct a quick "diff" view for the model
  const diff = event.edits
    .map((e) => `--- ${e.old_string?.slice(0, 200) ?? ""}\n+++ ${e.new_string?.slice(0, 200) ?? ""}`)
    .join("\n");
  const filename = path.basename(event.file_path);

  try {
    const review = await reviewCode(keys.gemini, persona.systemPrompt, filename, diff);
    const audio = await textToSpeech(keys.eleven, persona.voiceId, review.spokenReview);
    hookServer?.push({
      type: "roast",
      persona: persona.name,
      personaId: persona.id,
      emoji: persona.emoji,
      text: review.spokenReview,
      audio: Buffer.from(audio).toString("base64"),
    });
  } catch (err) {
    console.error("Yap roast failed:", err);
  }
}

export async function activate(context: vscode.ExtensionContext) {
  // Init persisted state
  const cfg = vscode.workspace.getConfiguration(CONFIG_NS);
  activePersonaId = cfg.get<string>("activePersona") || "linus";
  roastEnabled = cfg.get<boolean>("roastEnabled") || false;

  // Start the local hook bridge
  hookServer = new HookServer();
  hookServer.setEditHandler(handleEdit);
  try {
    hookPort = await hookServer.start();
  } catch (e) {
    console.error("Yap hook server failed to start:", e);
  }

  // Install hook into Cursor's hook system
  if (hookPort) {
    await installHook(context.extensionPath, hookPort);
  }

  panelProvider = new YapPanelProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(YapPanelProvider.viewType, panelProvider),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("yap.open", () => {
      vscode.commands.executeCommand("workbench.view.extension.yap-sidebar");
    }),
  );
  context.subscriptions.push({
    dispose: () => hookServer?.stop(),
  });
}

export function deactivate() {
  hookServer?.stop();
}
