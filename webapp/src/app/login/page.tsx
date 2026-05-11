"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, ArrowRight, Loader, User as UserIcon } from "@/components/Icons";
import { Logo } from "@/components/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) {
      setErrorMsg("Enter a valid email.");
      return;
    }
    setErrorMsg("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: name || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sign in failed");
      router.replace("/onboarding");
    } catch (err: any) {
      setErrorMsg(err.message || "Sign in failed");
      setBusy(false);
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
          <h1 className="text-2xl font-extrabold mb-1 tracking-tight">Welcome to Yap</h1>
          <p className="text-sm text-muted mb-7">Tell us who you are. We'll get you yapping in seconds.</p>

          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="font-mono text-[10px] text-muted uppercase tracking-wider block mb-1.5">Your name</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ada Lovelace"
                  maxLength={60}
                  className="w-full pl-10 pr-3 py-3 rounded-lg bg-white/[0.04] border border-white/10 focus:border-accent focus:bg-white/[0.06] outline-none text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <label className="font-mono text-[10px] text-muted uppercase tracking-wider block mb-1.5">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@yapper.com"
                  className="w-full pl-10 pr-3 py-3 rounded-lg bg-white/[0.04] border border-white/10 focus:border-accent focus:bg-white/[0.06] outline-none text-sm transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-accent to-accent-2 text-white font-semibold text-sm shadow-[0_4px_24px_rgba(255,94,58,0.35)] hover:shadow-[0_8px_36px_rgba(255,94,58,0.5)] hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-wait disabled:hover:translate-y-0"
            >
              {busy ? <><Loader className="w-4 h-4" /> Signing in…</> : <>Sign in <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          {errorMsg && (
            <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-300">
              {errorMsg}
            </div>
          )}

          <p className="font-mono text-[10px] text-muted text-center mt-6">By signing in you agree to be a Yapper.</p>
        </div>
      </div>
    </main>
  );
}
