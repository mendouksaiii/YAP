"use client";

import { useEffect, useState } from "react";
import { getUser, getStats, getActivity, type User, type Stats, type Activity } from "@/lib/store";
import { LEVELS } from "@/lib/levels";
import { Trophy, Hammer, Languages, Flame, Globe, Mail, Zap, History as HistoryIcon, Check } from "@/components/Icons";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { Reveal } from "@/components/Reveal";

function relTime(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const META: Record<string, { icon: any; color: string; verb: string }> = {
  build: { icon: Hammer, color: "#ff5e3a", verb: "Built" },
  deploy: { icon: Globe, color: "#4ade80", verb: "Shipped" },
  dub: { icon: Languages, color: "#06b6d4", verb: "Dubbed" },
  roast: { icon: Flame, color: "#a855f7", verb: "Roasted on" },
};

export default function ProfilePage() {
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

  const joinedDays = Math.max(1, Math.floor((Date.now() - user.joinedAt) / 86400000));

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Profile header */}
      <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-accent/[0.08] via-purple-500/[0.04] to-transparent p-5 sm:p-8 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-accent/10 blur-3xl animate-aurora" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent/40 to-accent-2/40 border-2 border-accent/60 flex items-center justify-center text-5xl shadow-[0_0_40px_rgba(255,94,58,0.3)] shrink-0 animate-bob">
            {stats.level.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-mono text-[10px] text-accent uppercase tracking-[0.2em] mb-1.5 flex items-center gap-1.5">
              <Trophy className="w-3 h-3" /> {stats.level.title}
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight mb-1">{user.name || user.username || user.email.split("@")[0]}</h1>
            <div className="flex items-center gap-3 text-sm text-muted mb-3 flex-wrap">
              {user.username && (
                <span className="font-mono text-accent">@{user.username}</span>
              )}
              <span className="inline-flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {user.email}</span>
            </div>
            <p className="text-sm text-muted italic">{stats.level.description}</p>
          </div>
          <div className="flex sm:flex-col gap-4 sm:gap-2 text-left sm:text-right">
            <div>
              <div className="text-2xl font-extrabold text-accent"><AnimatedNumber value={stats.xp} /></div>
              <div className="font-mono text-[10px] text-muted uppercase tracking-wider">total xp</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold"><AnimatedNumber value={joinedDays} />d</div>
              <div className="font-mono text-[10px] text-muted uppercase tracking-wider">yapping</div>
            </div>
          </div>
        </div>

        {/* Level progress bar */}
        {stats.progress.next && (
          <div className="relative mt-7">
            <div className="flex items-baseline justify-between mb-2">
              <div className="font-mono text-[10px] text-muted uppercase tracking-wider">
                {stats.progress.pct}% to {stats.progress.next.title}
              </div>
              <div className="font-mono text-[10px] text-muted">
                {stats.xp} / {stats.progress.next.minXp} xp
              </div>
            </div>
            <div className="h-2.5 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-accent to-accent-2 transition-all duration-700 relative" style={{ width: `${stats.progress.pct}%` }}>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent shimmer-bg" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger">
        <Tile icon={Hammer} color="#ff5e3a" label="Builds" value={stats.builds} />
        <Tile icon={Globe} color="#4ade80" label="Deploys" value={stats.deploys} />
        <Tile icon={Languages} color="#06b6d4" label="Dubs" value={stats.dubs} />
        <Tile icon={Flame} color="#a855f7" label="Roasts received" value={stats.roasts} />
      </div>

      {/* Level ladder */}
      <div>
        <div className="font-mono text-[10px] text-muted uppercase tracking-[0.15em] mb-3 flex items-center gap-1.5">
          <Trophy className="w-3 h-3" /> Level ladder
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] divide-y divide-white/5">
          {LEVELS.map((l, i) => {
            const achieved = stats.xp >= l.minXp;
            const isCurrent = stats.level.level === l.level;
            return (
              <Reveal key={l.level} delay={i * 50} from="left">
                <div className={`flex items-center gap-4 px-5 py-3 transition-colors ${isCurrent ? "bg-accent/5" : ""} hover:bg-white/[0.03]`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0 transition-all ${
                    achieved ? "bg-gradient-to-br from-accent/30 to-accent-2/30 border border-accent/40" : "bg-white/5 border border-white/10 grayscale opacity-50"
                  } ${isCurrent ? "animate-bob" : ""}`}>{l.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-bold ${achieved ? "" : "text-muted"}`}>
                      {l.title}
                      {isCurrent && <span className="ml-2 font-mono text-[9px] text-accent uppercase tracking-wider animate-blink">current</span>}
                    </div>
                    <div className="text-xs text-muted">{l.description}</div>
                  </div>
                  <div className="font-mono text-[10px] text-muted whitespace-nowrap">
                    {l.minXp} xp
                  </div>
                  {achieved && <Check className="w-4 h-4 text-green-400 shrink-0" />}
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>

      {/* Full history */}
      <div>
        <div className="font-mono text-[10px] text-muted uppercase tracking-[0.15em] mb-3 flex items-center gap-1.5">
          <HistoryIcon className="w-3 h-3" /> History ({activity.length})
        </div>
        {activity.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 p-8 text-center">
            <div className="text-muted text-sm">No history yet. Your activity will show up here as you yap.</div>
          </div>
        ) : (
          <div className="rounded-xl border border-white/5 bg-white/[0.02] divide-y divide-white/5">
            {activity.map((a) => {
              const meta = META[a.kind];
              const Icon = meta?.icon || Zap;
              return (
                <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: `${meta?.color}22`, color: meta?.color }}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">
                      <span className="text-muted">{meta?.verb} </span>
                      <span className="font-medium">{a.title || a.kind}</span>
                    </div>
                    <div className="font-mono text-[10px] text-muted">{new Date(a.ts).toLocaleString()}</div>
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

function Tile({ icon: Icon, color, label, value }: { icon: any; color: string; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 flex items-center gap-3 hover-lift cursor-default group">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300" style={{ background: `${color}22`, color }}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <div className="text-xl font-extrabold"><AnimatedNumber value={value} /></div>
        <div className="font-mono text-[10px] text-muted uppercase tracking-wider">{label}</div>
      </div>
    </div>
  );
}
