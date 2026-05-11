"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getUser, getStats, getActivity, type User, type Stats, type Activity } from "@/lib/store";
import { Hammer, Languages, Trophy, Sparkles, ArrowRight, Globe, Flame, Zap, History as HistoryIcon } from "@/components/Icons";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { Reveal } from "@/components/Reveal";

function relTime(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const ACTIVITY_META: Record<string, { icon: any; color: string; verb: string }> = {
  build: { icon: Hammer, color: "#ff5e3a", verb: "built" },
  deploy: { icon: Globe, color: "#4ade80", verb: "shipped" },
  dub: { icon: Languages, color: "#06b6d4", verb: "dubbed" },
  roast: { icon: Flame, color: "#a855f7", verb: "got roasted on" },
};

export default function DashboardHome() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);

  useEffect(() => {
    const sync = () => { setUser(getUser()); setStats(getStats()); setActivity(getActivity()); };
    sync();
    window.addEventListener("yap:activity-changed", sync);
    return () => window.removeEventListener("yap:activity-changed", sync);
  }, []);

  if (!user || !stats) return null;

  const firstName = (user.name || user.username || user.email.split("@")[0]).split(" ")[0];
  const handle = user.username ? `@${user.username}` : user.email;

  const features = [
    {
      href: "/dashboard/build",
      icon: Hammer,
      title: "Yap to Build",
      desc: "Describe an app. Watch it ship to a real URL.",
      tag: "Create",
      color: "from-orange-500 to-pink-500",
      stat: `${stats.builds} built`,
    },
    {
      href: "/dashboard/dub",
      icon: Languages,
      title: "Voice Dubbing",
      desc: "Clone your voice. Speak any language in your voice.",
      tag: "Translate",
      color: "from-cyan-500 to-blue-500",
      stat: `${stats.dubs} dubbed`,
    },
    {
      href: "/dashboard/profile",
      icon: Trophy,
      title: "Your Journey",
      desc: "Track your progress. Level up. See your history.",
      tag: "Profile",
      color: "from-purple-500 to-fuchsia-500",
      stat: stats.level.title,
    },
  ];

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Greeting */}
      <div>
        <div className="font-mono text-[11px] text-muted uppercase tracking-[0.2em] mb-2">
          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
          Welcome back, <span className="bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-transparent">{firstName}</span>.
        </h1>
        <p className="text-muted mt-2 text-sm sm:text-base">Signed in as <span className="font-mono text-white/80 break-all">{handle}</span> · Pick a tool.</p>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger">
        <StatTile label="XP" value={stats.xp} accent="text-accent" />
        <StatTile label="Builds" value={stats.builds} />
        <StatTile label="Dubs" value={stats.dubs} />
        <StatTile label="Roasts" value={stats.roasts} />
      </div>

      {/* Feature cards */}
      <div>
        <div className="font-mono text-[10px] text-muted uppercase tracking-[0.15em] mb-3 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" /> Tools
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <Link
                key={f.href}
                href={f.href}
                className="group relative rounded-2xl border border-white/5 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-6 hover:border-white/15 transition-all cursor-pointer overflow-hidden hover-lift"
              >
                <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${f.color} opacity-10 blur-2xl group-hover:opacity-30 transition-opacity duration-500`} />
                <div className="relative">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="font-mono text-[9px] text-muted uppercase tracking-wider mb-1">{f.tag}</div>
                  <div className="text-lg font-bold mb-1">{f.title}</div>
                  <p className="text-sm text-muted leading-relaxed mb-4">{f.desc}</p>
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-[10px] text-muted">{f.stat}</div>
                    <ArrowRight className="w-4 h-4 text-muted group-hover:text-white group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Level progress */}
      {stats.progress.next && (
        <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-accent/[0.05] to-transparent p-6 flex flex-col md:flex-row items-start md:items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent/30 to-accent-2/30 border border-accent/40 flex items-center justify-center text-2xl shrink-0">
            {stats.level.emoji}
          </div>
          <div className="flex-1 min-w-0 w-full">
            <div className="flex items-baseline gap-3 mb-1 flex-wrap">
              <div className="font-bold text-lg">{stats.level.title}</div>
              <div className="font-mono text-[10px] text-muted uppercase tracking-wider">
                {stats.progress.next.minXp - stats.xp} xp to {stats.progress.next.title.split(" ").slice(-1)[0]}
              </div>
            </div>
            <div className="text-sm text-muted mb-3">{stats.level.description}</div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-accent to-accent-2 transition-all duration-700" style={{ width: `${stats.progress.pct}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Recent activity */}
      <div>
        <div className="font-mono text-[10px] text-muted uppercase tracking-[0.15em] mb-3 flex items-center gap-1.5">
          <HistoryIcon className="w-3 h-3" /> Recent activity
        </div>
        {activity.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 p-8 text-center">
            <div className="text-muted text-sm">No activity yet. Go yap.</div>
            <Link href="/dashboard/build" className="inline-flex items-center gap-1.5 text-accent text-sm font-semibold mt-3 hover:underline cursor-pointer">
              Start your first build <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border border-white/5 bg-white/[0.02] divide-y divide-white/5">
            {activity.slice(0, 6).map((a) => {
              const meta = ACTIVITY_META[a.kind];
              const Icon = meta?.icon || Zap;
              return (
                <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: `${meta?.color}22`, color: meta?.color }}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">
                      <span className="text-muted">You {meta?.verb} </span>
                      <span className="font-medium">{a.title || a.kind}</span>
                    </div>
                  </div>
                  <div className="font-mono text-[10px] text-muted whitespace-nowrap">{relTime(a.ts)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 hover-lift cursor-default">
      <div className="font-mono text-[10px] text-muted uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-2xl font-extrabold ${accent ?? ""}`}>
        <AnimatedNumber value={value} />
      </div>
    </div>
  );
}
