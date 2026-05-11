"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Mic, Hammer, Languages, Trophy, Globe, Check, Play, Sparkles, ExternalLink } from "@/components/Icons";
import { Logo } from "@/components/Logo";
import { Reveal } from "@/components/Reveal";
import { AnimatedNumber } from "@/components/AnimatedNumber";

const ROTATING_WORDS = ["app", "tool", "site", "dashboard", "game", "landing page"];
const LANGUAGES_DEMO = [
  { code: "🇪🇸", text: "Hola, soy yo hablando español" },
  { code: "🇫🇷", text: "Bonjour, c'est moi en français" },
  { code: "🇯🇵", text: "こんにちは、日本語で話しています" },
  { code: "🇩🇪", text: "Hallo, ich spreche Deutsch" },
  { code: "🇮🇹", text: "Ciao, sto parlando italiano" },
];

export default function LandingPage() {
  const [wordIndex, setWordIndex] = useState(0);
  const [langIndex, setLangIndex] = useState(0);

  useEffect(() => {
    const w = setInterval(() => setWordIndex((i) => (i + 1) % ROTATING_WORDS.length), 1800);
    const l = setInterval(() => setLangIndex((i) => (i + 1) % LANGUAGES_DEMO.length), 2200);
    return () => { clearInterval(w); clearInterval(l); };
  }, []);

  return (
    <main className="min-h-screen bg-bg text-white overflow-x-hidden">
      {/* NAV */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-bg/70 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 cursor-pointer group">
            <Logo animated className="w-8 h-8 sm:w-9 sm:h-9 drop-shadow-[0_0_18px_rgba(255,94,58,0.4)] group-hover:scale-105 transition-transform" />
            <div className="text-lg sm:text-xl font-extrabold tracking-tight">Yap</div>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm">
            <a href="#features" className="text-muted hover:text-white transition-colors cursor-pointer">Features</a>
            <a href="#how" className="text-muted hover:text-white transition-colors cursor-pointer">How it works</a>
            <a href="#levels" className="text-muted hover:text-white transition-colors cursor-pointer">Levels</a>
            <a href="https://hacks.elevenlabs.io/hackathons/7" target="_blank" rel="noreferrer" className="text-muted hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1">
              #ElevenHacks <ExternalLink className="w-3 h-3" />
            </a>
          </nav>
          <Link
            href="/login"
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-gradient-to-r from-accent to-accent-2 text-white text-xs sm:text-sm font-semibold shadow-[0_4px_20px_rgba(255,94,58,0.35)] hover:shadow-[0_8px_32px_rgba(255,94,58,0.55)] hover:-translate-y-0.5 transition-all cursor-pointer whitespace-nowrap"
          >
            <span className="hidden sm:inline">Start yapping</span><span className="sm:hidden">Start</span> <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="relative pt-16 sm:pt-24 pb-20 sm:pb-32 px-4 sm:px-6 overflow-hidden">
        {/* Background gradients (animated) */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-[radial-gradient(circle,rgba(255,94,58,0.18),transparent_60%)] animate-aurora" />
          <div className="absolute top-40 -left-20 w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.15),transparent_60%)] animate-glow-pan" />
          <div className="absolute top-40 -right-20 w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(6,182,212,0.15),transparent_60%)] animate-glow-pan" style={{ animationDelay: "-7s" }} />
        </div>

        <div className="max-w-5xl mx-auto text-center stagger">
          {/* Logo big */}
          <div className="flex justify-center mb-6">
            <Logo animated className="w-20 h-20 animate-float drop-shadow-[0_0_30px_rgba(255,94,58,0.5)]" />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-blink" />
            <span className="font-mono text-[11px] text-muted uppercase tracking-wider">
              Live · Built for #ElevenHacks
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6">
            Build any{" "}
            <span className="relative inline-block">
              <span
                key={wordIndex}
                className="bg-gradient-to-r from-accent via-accent-2 to-orange-300 bg-clip-text text-transparent inline-block animate-fade"
              >
                {ROTATING_WORDS[wordIndex]}
              </span>
            </span>
            <br />
            by <span className="italic">talking</span>.
          </h1>

          <p className="text-lg md:text-xl text-muted max-w-2xl mx-auto leading-relaxed mb-10">
            Yap describes apps into existence, dubs your voice into 12 languages,
            and tracks how good you're getting at it. <span className="text-white font-semibold">No keyboard required.</span>
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
            <Link
              href="/login"
              className="group flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-accent to-accent-2 text-white font-semibold shadow-[0_8px_32px_rgba(255,94,58,0.4)] hover:shadow-[0_14px_48px_rgba(255,94,58,0.55)] hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              <Mic className="w-5 h-5" />
              Start yapping — free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#features"
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:-translate-y-0.5 transition-all cursor-pointer text-sm font-semibold"
            >
              <Play className="w-4 h-4" /> See how it works
            </a>
          </div>
        </div>

        {/* Hero product mock */}
        <Reveal from="up" delay={300} className="relative max-w-4xl mx-auto">
          <div className="absolute -inset-20 bg-[radial-gradient(circle,rgba(255,94,58,0.15),transparent_60%)] -z-10 animate-aurora" />
          <div className="rounded-2xl border border-white/10 bg-panel shadow-2xl overflow-hidden hover-lift">
            <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500/60" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <span className="w-3 h-3 rounded-full bg-green-500/60" />
              </div>
              <div className="flex-1 px-3 py-1 rounded-md bg-white/[0.03] border border-white/[0.04] font-mono text-xs text-muted text-center">
                yap-pomodoro-7af2.vercel.app
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] divide-y md:divide-y-0 md:divide-x divide-white/5">
              <div className="p-6 bg-gradient-to-b from-white/[0.03] to-transparent">
                <div className="font-mono text-[10px] text-muted uppercase tracking-wider mb-2">you said</div>
                <div className="text-sm italic mb-6">&ldquo;build me a pomodoro timer with a calming gradient&rdquo;</div>
                <div className="flex items-center gap-1.5 font-mono text-xs text-accent">
                  <Sparkles className="w-3 h-3 animate-pulse" /> built in 4.2s
                </div>
              </div>
              <div className="p-8 bg-gradient-to-br from-purple-500/10 to-blue-500/10 flex items-center justify-center min-h-[200px]">
                <div className="text-center">
                  <div className="font-mono text-xs text-purple-300 uppercase tracking-wider mb-2 dot-pulse">focus</div>
                  <div className="text-6xl font-extrabold tabular-nums mb-3">24:59</div>
                  <button className="px-6 py-2 rounded-full bg-purple-500/20 border border-purple-400/40 text-sm font-semibold hover:bg-purple-500/30 transition-colors cursor-pointer">Start</button>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* METRICS STRIP */}
      <section className="border-y border-white/5 py-10 px-6">
        <Reveal>
          <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <Metric label="Voices cloned" value={10} suffix="+" sub="Linus, Carmack, DHH…" />
            <Metric label="Languages" value={12} sub="Spanish, Japanese, Hindi…" />
            <Metric label="Avg build time" value={30} prefix="<" suffix="s" sub="speak to deployed URL" />
            <Metric label="Keyboard hits" value={0} sub="not a single one" />
          </div>
        </Reveal>
      </section>

      {/* THREE FEATURES */}
      <section id="features" className="py-20 sm:py-28 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center mb-12 sm:mb-16">
              <div className="font-mono text-[11px] text-accent uppercase tracking-[0.2em] mb-3">three superpowers</div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
                One mic. Three things you couldn&apos;t do yesterday.
              </h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Reveal delay={0} from="up">
              <FeatureCard
                icon={Hammer}
                gradient="from-orange-500 to-pink-500"
                label="Build"
                title="Yap to Build"
                desc="Describe an app, tool, or website out loud. It writes the code, builds the UI, and ships it to a real Vercel URL — in under 30 seconds."
                bullets={["Voice → app in 30s", "Real deployed URL", "10 famous devs roast your code"]}
              />
            </Reveal>
            <Reveal delay={120} from="up">
              <FeatureCard
                icon={Languages}
                gradient="from-cyan-500 to-blue-500"
                label="Dub"
                title="Voice Dubbing"
                desc="Clone your voice once. Speak in English. Hear yourself fluent in Spanish, Japanese, Hindi, French — 12 languages, your actual voice."
                bullets={["Your voice, 12 languages", "30-second clone", "ElevenLabs multilingual"]}
                extra={
                  <div className="mt-4 rounded-xl bg-white/[0.04] border border-white/[0.06] p-3 flex items-center gap-3">
                    <span className="text-2xl">{LANGUAGES_DEMO[langIndex].code}</span>
                    <div className="font-mono text-xs text-muted truncate animate-fade" key={langIndex}>
                      &ldquo;{LANGUAGES_DEMO[langIndex].text}&rdquo;
                    </div>
                  </div>
                }
              />
            </Reveal>
            <Reveal delay={240} from="up">
              <FeatureCard
                icon={Trophy}
                gradient="from-purple-500 to-fuchsia-500"
                label="Level up"
                title="Yapper Levels"
                desc="Every build, every dub, every roast earns XP. Climb from Level 1 Yapper to Level 10 Legend. Your full history, one beautiful profile."
                bullets={["10 levels of mastery", "XP for every action", "Full activity history"]}
              />
            </Reveal>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-20 sm:py-28 px-4 sm:px-6 bg-gradient-to-b from-transparent via-white/[0.015] to-transparent">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-12 sm:mb-16">
              <div className="font-mono text-[11px] text-accent uppercase tracking-[0.2em] mb-3">how it works</div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">Speak. Watch. Ship.</h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Reveal delay={0} from="up"><Step n="01" title="Open your mouth" desc="Hit the mic. Describe what you want. Whether it's an app or a sentence to dub — start with words." /></Reveal>
            <Reveal delay={120} from="up"><Step n="02" title="Watch the magic" desc="ElevenLabs transcribes. Gemini generates the code or translation. Live shimmer preview as it builds." /></Reveal>
            <Reveal delay={240} from="up"><Step n="03" title="Get it back" desc="A real shareable URL or your voice in another language — read or played back to you. Then it shows up in your history." /></Reveal>
          </div>
        </div>
      </section>

      {/* LEVELS PREVIEW */}
      <section id="levels" className="py-20 sm:py-28 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-10 sm:mb-12">
              <div className="font-mono text-[11px] text-accent uppercase tracking-[0.2em] mb-3">your journey</div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
                From <span className="bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-transparent">Level 1 Yapper</span> to <span className="bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">Level 10 Legend</span>
              </h2>
              <p className="text-muted max-w-2xl mx-auto px-2">Every action earns XP. Levels unlock as you go. Wear your title proudly.</p>
            </div>
          </Reveal>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { lvl: 1, emoji: "🐣", name: "Yapper" },
              { lvl: 3, emoji: "🎤", name: "Vocalist" },
              { lvl: 5, emoji: "🔨", name: "Builder" },
              { lvl: 8, emoji: "🌍", name: "Polyglot" },
              { lvl: 10, emoji: "👑", name: "Legend" },
            ].map((l, i) => (
              <Reveal key={l.lvl} delay={i * 100} from="scale">
                <div className="rounded-xl border border-white/5 bg-gradient-to-br from-white/[0.04] to-transparent p-4 text-center hover:border-white/15 hover-lift cursor-default">
                  <div className="text-3xl mb-2 animate-bob" style={{ animationDelay: `${i * 200}ms` }}>{l.emoji}</div>
                  <div className="font-mono text-[10px] text-muted uppercase tracking-wider">Level {l.lvl}</div>
                  <div className="text-sm font-bold mt-1">{l.name}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-32 px-4 sm:px-6">
        <Reveal>
          <div className="max-w-3xl mx-auto text-center relative">
            <div className="absolute -inset-x-20 -inset-y-10 bg-[radial-gradient(circle,rgba(255,94,58,0.18),transparent_60%)] -z-10 animate-aurora" />
            <div className="flex justify-center mb-6">
              <Logo animated className="w-16 h-16 animate-float" />
            </div>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight mb-6">
              Stop typing.<br />
              <span className="bg-gradient-to-r from-accent via-accent-2 to-orange-300 bg-clip-text text-transparent animate-text-shine">Start yapping.</span>
            </h2>
            <p className="text-lg text-muted mb-10 max-w-xl mx-auto">
              Free during the hackathon. No credit card. Just your voice and a few minutes.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-accent to-accent-2 text-white font-bold text-lg shadow-[0_10px_40px_rgba(255,94,58,0.4)] hover:shadow-[0_16px_56px_rgba(255,94,58,0.55)] hover:-translate-y-1 transition-all cursor-pointer"
            >
              <Mic className="w-5 h-5" /> Start yapping — free
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-white/5 px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Logo className="w-6 h-6" />
            <div className="text-sm font-bold">Yap</div>
            <span className="font-mono text-[10px] text-muted ml-2">v0.3</span>
          </div>
          <div className="font-mono text-[10px] text-muted">
            built with cursor + elevenlabs · without ever touching a keyboard
          </div>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({ icon: Icon, gradient, label, title, desc, bullets, extra }: any) {
  return (
    <div className="group relative rounded-2xl border border-white/5 bg-gradient-to-br from-white/[0.04] to-transparent p-7 hover:border-white/15 transition-all overflow-hidden hover-lift cursor-default">
      <div className={`absolute -top-20 -right-20 w-48 h-48 rounded-full bg-gradient-to-br ${gradient} opacity-10 blur-3xl group-hover:opacity-25 transition-opacity duration-500`} />
      <div className="relative">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="font-mono text-[10px] text-muted uppercase tracking-wider mb-1">{label}</div>
        <h3 className="text-xl font-extrabold mb-2">{title}</h3>
        <p className="text-sm text-muted leading-relaxed mb-5">{desc}</p>
        <ul className="space-y-1.5">
          {bullets.map((b: string) => (
            <li key={b} className="flex items-start gap-2 text-sm">
              <Check className="w-4 h-4 mt-0.5 text-accent shrink-0" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
        {extra}
      </div>
    </div>
  );
}

function Step({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div className="relative rounded-2xl border border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent p-6 hover-lift cursor-default">
      <div className="font-mono text-5xl font-extrabold text-transparent bg-gradient-to-br from-accent/40 to-accent-2/30 bg-clip-text mb-3">{n}</div>
      <div className="text-lg font-bold mb-2">{title}</div>
      <p className="text-sm text-muted leading-relaxed">{desc}</p>
    </div>
  );
}

function Metric({ label, value, sub, prefix, suffix }: { label: string; value: number; sub: string; prefix?: string; suffix?: string }) {
  return (
    <Reveal from="scale">
      <div>
        <div className="text-3xl md:text-4xl font-extrabold tracking-tight mb-1">
          {prefix}<AnimatedNumber value={value} />{suffix}
        </div>
        <div className="font-mono text-[10px] text-muted uppercase tracking-wider">{label}</div>
        <div className="text-xs text-muted mt-1">{sub}</div>
      </div>
    </Reveal>
  );
}
