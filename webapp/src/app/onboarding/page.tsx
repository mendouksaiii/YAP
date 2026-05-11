"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Check, Loader, Sparkles, User as UserIcon } from "@/components/Icons";
import { Logo } from "@/components/Logo";
import { fetchUser, rememberUsername, recallUsername, type User } from "@/lib/store";

const SUGGESTIONS = [
  (e: string) => e.split("@")[0].replace(/[._]/g, "-"),
  (e: string) => "yap-" + e.split("@")[0].replace(/[._]/g, "-"),
  () => "the-loudest-yapper",
  () => "voice-only-coder",
];

function slug(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9_-]/g, "").replace(/^-+|-+$/g, "").slice(0, 24);
}

export default function OnboardingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phase, setPhase] = useState<"loading" | "ready" | "saving" | "error" | "done">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [picks, setPicks] = useState<string[]>([]);
  const autoClaimedRef = useRef(false);

  // Fetch the session on mount. If the user already has a username embedded
  // in the JWT, bounce them to /dashboard. If we have a local memory of their
  // username from a previous session, silently re-claim it server-side.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const u = await fetchUser();
      if (cancelled) return;
      if (!u) {
        router.replace("/login");
        return;
      }
      setUser(u);

      // Already has username in JWT? Skip onboarding entirely.
      if (u.username) {
        router.replace("/dashboard");
        return;
      }

      // Remembered locally? Silently re-claim and skip.
      const remembered = recallUsername(u.email);
      if (remembered && !autoClaimedRef.current) {
        autoClaimedRef.current = true;
        try {
          const res = await fetch("/api/auth/profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: remembered, displayName: u.name }),
          });
          if (res.ok) {
            router.replace("/dashboard");
            return;
          }
        } catch {}
      }

      // First-time onboarding. Pre-fill some suggestions.
      const baseName = u.name || u.email.split("@")[0];
      setDisplayName(baseName);
      setUsername(slug(baseName));
      setPicks(SUGGESTIONS.map((fn) => slug(fn(u.email))).filter(Boolean));
      setPhase("ready");
    })();
    return () => { cancelled = true; };
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const cleaned = slug(username);
    if (cleaned.length < 3) {
      setErrorMsg("Username must be at least 3 characters (letters, numbers, - or _).");
      return;
    }
    setErrorMsg("");
    setPhase("saving");
    try {
      const res = await fetch("/api/auth/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: cleaned, displayName: displayName || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save profile");
      rememberUsername(user.email, cleaned);
      setPhase("done");
      // Brief celebratory pause before bouncing
      setTimeout(() => router.replace("/dashboard"), 700);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save profile");
      setPhase("error");
    }
  };

  if (phase === "loading") {
    return (
      <main className="min-h-screen bg-bg text-white flex items-center justify-center">
        <Loader className="w-6 h-6 text-muted" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bg text-white flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,94,58,0.18),transparent_50%)] pointer-events-none animate-aurora" />

      <div className="relative w-full max-w-md page-enter">
        <Link href="/" className="flex items-center gap-2.5 mb-10 justify-center cursor-pointer">
          <Logo animated className="w-12 h-12 animate-float drop-shadow-[0_0_24px_rgba(255,94,58,0.5)]" />
          <div className="text-2xl font-extrabold tracking-tight">Yap</div>
        </Link>

        {phase === "done" ? (
          <div className="rounded-2xl border border-white/5 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-8 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center mb-4 animate-bob">
              <Check className="w-6 h-6 text-green-400" />
            </div>
            <h1 className="text-xl font-extrabold mb-2">Welcome, @{slug(username)}</h1>
            <p className="text-sm text-muted">Taking you in…</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/5 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-8">
            <div className="font-mono text-[11px] text-accent uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" /> last step
            </div>
            <h1 className="text-2xl font-extrabold mb-1 tracking-tight">Pick your handle</h1>
            <p className="text-sm text-muted mb-6">
              Signed in as <span className="text-white font-semibold">{user?.email}</span>. Choose a username — this is how everyone will know you.
            </p>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="font-mono text-[10px] text-muted uppercase tracking-wider block mb-1.5">Username</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted font-mono text-sm">@</span>
                  <input
                    type="text"
                    autoFocus
                    value={username}
                    onChange={(e) => setUsername(slug(e.target.value))}
                    placeholder="your-handle"
                    maxLength={24}
                    className="w-full pl-8 pr-3 py-3 rounded-lg bg-white/[0.04] border border-white/10 focus:border-accent focus:bg-white/[0.06] outline-none text-sm font-mono transition-all"
                  />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  <span className="font-mono text-[10px] text-muted uppercase tracking-wider">try:</span>
                  {picks.map((p) => (
                    <button
                      type="button"
                      key={p}
                      onClick={() => setUsername(p)}
                      className="font-mono text-[10px] px-2 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.12] transition-all cursor-pointer"
                    >
                      @{p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-mono text-[10px] text-muted uppercase tracking-wider block mb-1.5">Display name (optional)</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="What should we call you?"
                    maxLength={40}
                    className="w-full pl-10 pr-3 py-3 rounded-lg bg-white/[0.04] border border-white/10 focus:border-accent focus:bg-white/[0.06] outline-none text-sm transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={phase === "saving" || !username || username.length < 3}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-accent to-accent-2 text-white font-semibold text-sm shadow-[0_4px_24px_rgba(255,94,58,0.35)] hover:shadow-[0_8px_36px_rgba(255,94,58,0.5)] hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-wait disabled:hover:translate-y-0"
              >
                {phase === "saving" ? <><Loader className="w-4 h-4" /> Setting up…</> : <>Enter Yap <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>

            {errorMsg && (
              <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-300">
                {errorMsg}
              </div>
            )}

            <p className="font-mono text-[10px] text-muted text-center mt-6">
              You can change this later in your profile.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
