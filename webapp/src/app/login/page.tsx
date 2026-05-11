"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, ArrowRight, Check, Loader } from "@/components/Icons";
import { Logo } from "@/components/Logo";

function LoginInner() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [devLink, setDevLink] = useState<string | null>(null);

  useEffect(() => {
    const err = params.get("error");
    if (err === "expired-or-invalid") setErrorMsg("That link expired or was invalid. Send a fresh one.");
    else if (err === "missing-token") setErrorMsg("That link was missing the token.");
    else if (err === "invalid-token") setErrorMsg("That link was invalid.");
  }, [params]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    setPhase("sending");
    setErrorMsg("");
    setDevLink(null);

    try {
      const res = await fetch("/api/auth/send-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setPhase("sent");
      } else {
        // Even on Resend failure (e.g. unverified domain), show the dev link so demo works
        if (data.devLink) {
          setDevLink(data.devLink);
          setPhase("sent");
          setErrorMsg(`Email send failed (${data.emailError || "unknown"}), but here's the dev link.`);
        } else {
          setErrorMsg(data.error || "Failed to send magic link.");
          setPhase("error");
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Network error");
      setPhase("error");
    }
  };

  return (
    <main className="min-h-screen bg-bg text-white flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,94,58,0.18),transparent_50%)] pointer-events-none animate-aurora" />

      <div className="relative w-full max-w-md page-enter">
        <Link href="/" className="flex items-center gap-2.5 mb-10 justify-center cursor-pointer">
          <Logo animated className="w-12 h-12 animate-float drop-shadow-[0_0_24px_rgba(255,94,58,0.5)]" />
          <div className="text-2xl font-extrabold tracking-tight">Yap</div>
        </Link>

        <div className="rounded-2xl border border-white/5 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-8">
          {phase !== "sent" ? (
            <>
              <h1 className="text-2xl font-extrabold mb-1 tracking-tight">Welcome back</h1>
              <p className="text-sm text-muted mb-7">Enter your email — we'll send you a magic link.</p>

              <form onSubmit={send} className="space-y-3">
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="email"
                    autoFocus
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@yapper.com"
                    className="w-full pl-10 pr-3 py-3 rounded-lg bg-white/[0.04] border border-white/10 focus:border-accent focus:bg-white/[0.06] outline-none text-sm transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={phase === "sending"}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-accent to-accent-2 text-white font-semibold text-sm shadow-[0_4px_24px_rgba(255,94,58,0.35)] hover:shadow-[0_6px_32px_rgba(255,94,58,0.45)] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                >
                  {phase === "sending" ? <><Loader className="w-4 h-4" /> Sending…</> : <>Send magic link <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>

              {errorMsg && (
                <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-300">
                  {errorMsg}
                </div>
              )}

              <p className="font-mono text-[10px] text-muted text-center mt-6">By signing in you agree to be a Yapper.</p>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="mx-auto w-14 h-14 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center mb-4">
                <Check className="w-6 h-6 text-green-400" />
              </div>
              <h1 className="text-xl font-extrabold mb-2">Check your inbox</h1>
              <p className="text-sm text-muted mb-6">We sent a magic link to <span className="text-white font-semibold">{email}</span>. Click it to sign in. Link expires in 10 minutes.</p>

              {devLink && (
                <div className="mt-4 mb-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-3 text-left">
                  <div className="font-mono text-[10px] text-yellow-300 uppercase tracking-wider mb-2">dev fallback link</div>
                  <a
                    href={devLink}
                    className="font-mono text-[10px] text-yellow-200 break-all hover:underline cursor-pointer"
                  >
                    {devLink}
                  </a>
                </div>
              )}

              {errorMsg && (
                <div className="mt-3 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-300">
                  {errorMsg}
                </div>
              )}

              <button
                onClick={() => { setPhase("idle"); setErrorMsg(""); setDevLink(null); }}
                className="font-mono text-[10px] text-muted hover:text-white transition-colors mt-4 cursor-pointer"
              >
                Use a different email
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg" />}>
      <LoginInner />
    </Suspense>
  );
}
