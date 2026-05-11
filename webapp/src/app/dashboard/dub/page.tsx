"use client";

import { useEffect, useRef, useState } from "react";
import { getUser, setClonedVoice, logActivity } from "@/lib/store";
import { Mic, Stop, Loader, Languages, Play, Check, Volume, Globe, Sparkles } from "@/components/Icons";

const LANGUAGES = [
  { code: "es", name: "Spanish", flag: "🇪🇸", sample: "Hola, soy yo hablando español." },
  { code: "fr", name: "French", flag: "🇫🇷", sample: "Bonjour, c'est moi qui parle français." },
  { code: "de", name: "German", flag: "🇩🇪", sample: "Hallo, das bin ich auf Deutsch." },
  { code: "it", name: "Italian", flag: "🇮🇹", sample: "Ciao, sono io che parlo italiano." },
  { code: "pt", name: "Portuguese", flag: "🇵🇹", sample: "Olá, sou eu falando português." },
  { code: "ja", name: "Japanese", flag: "🇯🇵", sample: "こんにちは、日本語で話しています。" },
  { code: "ko", name: "Korean", flag: "🇰🇷", sample: "안녕하세요, 한국어로 말하고 있어요." },
  { code: "zh", name: "Chinese", flag: "🇨🇳", sample: "你好，我在说中文。" },
  { code: "hi", name: "Hindi", flag: "🇮🇳", sample: "नमस्ते, मैं हिंदी में बोल रहा हूँ।" },
  { code: "ar", name: "Arabic", flag: "🇸🇦", sample: "مرحبا، أنا أتحدث العربية." },
  { code: "ru", name: "Russian", flag: "🇷🇺", sample: "Привет, я говорю по-русски." },
  { code: "tr", name: "Turkish", flag: "🇹🇷", sample: "Merhaba, Türkçe konuşuyorum." },
];

type Phase = "needs-clone" | "ready" | "recording" | "transcribing" | "dubbing" | "playing" | "error";

interface Dub {
  language: string;
  flag: string;
  original: string;
  translated: string;
  audioUrl: string;
}

export default function DubPage() {
  const [voiceId, setVoiceId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("needs-clone");
  const [statusText, setStatusText] = useState("Clone your voice first — record 30 seconds of you talking.");
  const [transcript, setTranscript] = useState("");
  const [selectedLang, setSelectedLang] = useState("es");
  const [dub, setDub] = useState<Dub | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [recordingFor, setRecordingFor] = useState<"clone" | "dub" | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const u = getUser();
    if (u?.clonedVoiceId) {
      setVoiceId(u.clonedVoiceId);
      setPhase("ready");
      setStatusText("Your voice is cloned. Pick a language, then speak.");
    }
  }, []);

  const startRecording = async (purpose: "clone" | "dub") => {
    try {
      setErrorMsg("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      mediaRecorderRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mime });
        if (purpose === "clone") await handleCloneSample(blob);
        else await handleDubSample(blob);
      };
      rec.start();
      setRecordingFor(purpose);
      setPhase("recording");
      setStatusText(purpose === "clone" ? "Recording your voice sample…" : "Recording what you want dubbed…");
    } catch {
      setErrorMsg("Microphone permission denied.");
      setPhase("error");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecordingFor(null);
    setPhase("transcribing");
    setStatusText("Processing…");
  };

  const handleCloneSample = async (blob: Blob) => {
    try {
      setStatusText("Cloning your voice…");
      const form = new FormData();
      form.append("file", blob, "sample.webm");
      form.append("name", "yap-" + (getUser()?.email || "user"));
      const r = await fetch("/api/clone-voice", { method: "POST", body: form });
      if (!r.ok) throw new Error((await r.json()).error || "Clone failed");
      const { voiceId: vid } = await r.json();
      setVoiceId(vid);
      setClonedVoice(vid);
      setPhase("ready");
      setStatusText("Voice cloned. Pick a language and speak.");
    } catch (e: any) {
      setErrorMsg(e.message);
      setPhase("error");
    }
  };

  const handleDubSample = async (blob: Blob) => {
    if (!voiceId) return;
    try {
      // STT to get the source text
      const form = new FormData();
      form.append("file", blob, "audio.webm");
      const sttRes = await fetch("/api/stt", { method: "POST", body: form });
      if (!sttRes.ok) throw new Error("STT failed");
      const { text } = await sttRes.json();
      setTranscript(text);

      setPhase("dubbing");
      const lang = LANGUAGES.find((l) => l.code === selectedLang)!;
      setStatusText(`Dubbing into ${lang.name}…`);
      const dubRes = await fetch("/api/dub", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceId, text, targetLanguage: lang.name }),
      });
      if (!dubRes.ok) throw new Error((await dubRes.json()).error || "Dub failed");
      const { translated, audio } = await dubRes.json();

      const audioBlob = new Blob([Uint8Array.from(atob(audio), (c) => c.charCodeAt(0))], { type: "audio/mpeg" });
      const audioUrl = URL.createObjectURL(audioBlob);
      const newDub: Dub = { language: lang.name, flag: lang.flag, original: text, translated, audioUrl };
      setDub(newDub);
      logActivity("dub", `${lang.name}: ${translated.slice(0, 60)}`, { language: lang.name });

      setPhase("playing");
      setStatusText(`Playing in ${lang.name}…`);
      const audioEl = new Audio(audioUrl);
      audioEl.play();
      audioEl.onended = () => {
        setPhase("ready");
        setStatusText("Try another language, or record something new.");
      };
    } catch (e: any) {
      setErrorMsg(e.message);
      setPhase("error");
    }
  };

  const replay = () => {
    if (!dub) return;
    new Audio(dub.audioUrl).play();
  };

  const recording = phase === "recording";
  const busy = ["transcribing", "dubbing"].includes(phase);
  const cloned = !!voiceId;

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <div className="font-mono text-[11px] text-muted uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5">
          <Languages className="w-3.5 h-3.5" /> voice dubbing
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          Speak any language <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">in your voice</span>
        </h1>
        <p className="text-muted mt-2 text-sm">Clone your voice once. Speak English. Hear yourself fluent in 12 languages.</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-3">
        <Step n={1} active={!cloned} done={cloned} label="Clone your voice" />
        <div className="flex-1 h-px bg-white/10" />
        <Step n={2} active={cloned && !dub} done={!!dub} label="Pick a language" />
        <div className="flex-1 h-px bg-white/10" />
        <Step n={3} active={!!dub} done={false} label="Speak & hear" />
      </div>

      {!cloned ? (
        // CLONE STEP
        <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-cyan-500/[0.05] to-blue-500/[0.03] p-10 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center mb-5 shadow-[0_0_30px_rgba(6,182,212,0.35)]">
            <Mic className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Clone your voice</h2>
          <p className="text-sm text-muted max-w-md mx-auto mb-6">
            Record 30 seconds of you speaking naturally. We'll create a digital twin of your voice you can use in any language.
          </p>

          <button
            onClick={recording ? stopRecording : busy ? undefined : () => startRecording("clone")}
            disabled={busy}
            className={`group relative mx-auto block w-28 h-28 rounded-full transition-transform duration-200 ${busy ? "opacity-60 cursor-wait" : "cursor-pointer hover:scale-[1.04] active:scale-95"}`}
          >
            {recording && <span className="absolute inset-[-12px] rounded-full border-2 border-cyan-400/60 animate-pulse-ring" />}
            <span className={`absolute inset-0 rounded-full transition-colors duration-200 ${recording ? "bg-gradient-to-br from-red-500 to-orange-500" : "bg-gradient-to-br from-cyan-500 to-blue-500"} shadow-[0_8px_40px_rgba(6,182,212,0.4)]`} />
            <span className="relative flex items-center justify-center w-full h-full text-white">
              {recording ? <Stop className="w-10 h-10" /> : busy ? <Loader className="w-10 h-10" /> : <Mic className="w-12 h-12" />}
            </span>
          </button>

          <div className="mt-5 text-sm font-medium">{recording ? "Listening…" : busy ? statusText : "Tap and speak naturally"}</div>
          <div className="font-mono text-xs text-muted mt-1">{recording ? "Say anything you want, in any language" : "30 seconds is the sweet spot"}</div>

          {errorMsg && <div className="mt-6 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-300 max-w-md mx-auto">{errorMsg}</div>}
        </div>
      ) : (
        <>
          {/* LANG PICKER + RECORD */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
            <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-cyan-500/[0.04] to-blue-500/[0.02] p-8">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-blink" />
                <div className="font-mono text-[10px] text-green-400 uppercase tracking-wider">voice cloned</div>
              </div>
              <h2 className="text-xl font-bold mb-4">Speak something to dub</h2>

              <button
                onClick={recording ? stopRecording : busy ? undefined : () => startRecording("dub")}
                disabled={busy}
                className={`group relative mx-auto block w-24 h-24 rounded-full transition-transform duration-200 ${busy ? "opacity-60 cursor-wait" : "cursor-pointer hover:scale-[1.04] active:scale-95"}`}
              >
                {recording && <span className="absolute inset-[-10px] rounded-full border-2 border-cyan-400/60 animate-pulse-ring" />}
                <span className={`absolute inset-0 rounded-full transition-colors duration-200 ${recording ? "bg-gradient-to-br from-red-500 to-orange-500" : "bg-gradient-to-br from-cyan-500 to-blue-500"} shadow-[0_8px_36px_rgba(6,182,212,0.4)]`} />
                <span className="relative flex items-center justify-center w-full h-full text-white">
                  {recording ? <Stop className="w-8 h-8" /> : busy ? <Loader className="w-8 h-8" /> : <Mic className="w-10 h-10" />}
                </span>
              </button>

              <div className="mt-5 text-center">
                <div className="text-sm font-medium">{recording ? "Listening…" : busy ? statusText : "Tap to record"}</div>
                <div className="font-mono text-xs text-muted mt-1">{recording ? "Tap again to dub" : statusText}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
              <div className="font-mono text-[10px] text-muted uppercase tracking-[0.15em] mb-3 flex items-center gap-1.5">
                <Globe className="w-3 h-3" /> Target language
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1 stagger">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => setSelectedLang(l.code)}
                    className={`flex items-center gap-2 rounded-lg border p-2 text-left transition-all cursor-pointer hover:-translate-y-0.5 ${
                      selectedLang === l.code
                        ? "border-cyan-400/60 bg-cyan-500/10 shadow-[0_4px_20px_rgba(6,182,212,0.2)]"
                        : "border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/15"
                    }`}
                  >
                    <span className={`text-xl transition-transform duration-300 ${selectedLang === l.code ? "scale-110" : ""}`}>{l.flag}</span>
                    <span className="text-xs font-semibold">{l.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Result */}
          {transcript && (
            <div className="rounded-xl bg-white/[0.03] border-l-2 border-cyan-400 p-4">
              <div className="font-mono text-[10px] text-muted uppercase tracking-[0.15em] mb-1.5 flex items-center gap-1.5">
                <Volume className="w-3 h-3" /> You said
              </div>
              <div className="text-sm">{transcript}</div>
            </div>
          )}

          {dub && (
            <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-blue-500/5 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-3xl">{dub.flag}</div>
                <div>
                  <div className="font-mono text-[10px] text-cyan-400 uppercase tracking-wider mb-0.5">dubbed in {dub.language}</div>
                  <div className="text-xs text-muted">in your cloned voice</div>
                </div>
                <button
                  onClick={replay}
                  className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-semibold shadow-[0_4px_24px_rgba(6,182,212,0.35)] hover:shadow-[0_6px_32px_rgba(6,182,212,0.45)] cursor-pointer transition-all"
                >
                  <Play className="w-4 h-4" /> Play again
                </button>
              </div>
              <div className="text-lg leading-relaxed">{dub.translated}</div>
            </div>
          )}
        </>
      )}

      {errorMsg && cloned && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-sm text-red-300">{errorMsg}</div>
      )}
    </div>
  );
}

function Step({ n, active, done, label }: { n: number; active: boolean; done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
        done ? "bg-green-500/20 border border-green-500/50 text-green-400"
        : active ? "bg-cyan-500/20 border border-cyan-400/60 text-cyan-300"
        : "bg-white/5 border border-white/10 text-muted"
      }`}>
        {done ? <Check className="w-3.5 h-3.5" /> : n}
      </div>
      <div className={`text-xs font-medium hidden sm:block ${active || done ? "text-white" : "text-muted"}`}>{label}</div>
    </div>
  );
}
