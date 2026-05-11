// Client-side persistence layer for Yap.
// Stores: user (email + display name), activity history, cloned voice id.
// Lives in localStorage under "yap:*" keys.

"use client";

import { LEVELS, levelFromXp, progressToNext, XP_PER_BUILD, XP_PER_DUB, XP_PER_DEPLOY, XP_PER_ROAST } from "./levels";

export interface User {
  email: string;
  name?: string;
  username?: string;
  joinedAt: number;
  clonedVoiceId?: string; // their personal cloned voice (for dubbing)
}

const KEY_USERNAME_BY_EMAIL = "yap:username-by-email";

/** Remember username locally so the same email skips onboarding on future magic-link sessions. */
export function rememberUsername(email: string, username: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(KEY_USERNAME_BY_EMAIL);
    const map = raw ? JSON.parse(raw) : {};
    map[email.toLowerCase()] = username;
    localStorage.setItem(KEY_USERNAME_BY_EMAIL, JSON.stringify(map));
  } catch {}
}
export function recallUsername(email: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY_USERNAME_BY_EMAIL);
    if (!raw) return null;
    const map = JSON.parse(raw);
    return map[email.toLowerCase()] || null;
  } catch { return null; }
}

export type ActivityKind = "build" | "deploy" | "roast" | "dub";

export interface Activity {
  id: string;
  kind: ActivityKind;
  ts: number;
  title?: string;
  details?: Record<string, unknown>;
}

const KEY_USER = "yap:user";
const KEY_ACTIVITY = "yap:activity";

function safeGet<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : null; } catch { return null; }
}
function safeSet(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// User cache — populated from /api/auth/me. Authoritative source is the JWT cookie.
export function getUser(): User | null {
  return safeGet<User>(KEY_USER);
}
export function setUser(u: User) {
  safeSet(KEY_USER, u);
  window.dispatchEvent(new CustomEvent("yap:user-changed"));
}
/** Fetch the session from the server (HTTP-only cookie). Updates the local cache. */
export async function fetchUser(): Promise<User | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch("/api/auth/me", { cache: "no-store", credentials: "same-origin" });
    if (!res.ok) {
      if (typeof localStorage !== "undefined") localStorage.removeItem(KEY_USER);
      window.dispatchEvent(new CustomEvent("yap:user-changed"));
      return null;
    }
    const data = await res.json();
    if (!data.user) return null;
    setUser(data.user as User);
    return data.user as User;
  } catch {
    return null;
  }
}
export async function signOut(): Promise<void> {
  if (typeof window === "undefined") return;
  try { await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }); } catch {}
  localStorage.removeItem(KEY_USER);
  window.dispatchEvent(new CustomEvent("yap:user-changed"));
}

export function setClonedVoice(voiceId: string) {
  const u = getUser();
  if (!u) return;
  setUser({ ...u, clonedVoiceId: voiceId });
}

export function getActivity(): Activity[] {
  return safeGet<Activity[]>(KEY_ACTIVITY) || [];
}

export function logActivity(kind: ActivityKind, title?: string, details?: Record<string, unknown>) {
  const list = getActivity();
  const entry: Activity = {
    id: Math.random().toString(36).slice(2, 10),
    kind, ts: Date.now(), title, details,
  };
  list.unshift(entry);
  // Cap at 200 entries
  safeSet(KEY_ACTIVITY, list.slice(0, 200));
  window.dispatchEvent(new CustomEvent("yap:activity-changed"));
  return entry;
}

export interface Stats {
  builds: number;
  deploys: number;
  dubs: number;
  roasts: number;
  xp: number;
  level: typeof LEVELS[number];
  progress: ReturnType<typeof progressToNext>;
}

export function getStats(): Stats {
  const list = getActivity();
  const counts = { builds: 0, deploys: 0, dubs: 0, roasts: 0 };
  for (const a of list) {
    if (a.kind === "build") counts.builds++;
    else if (a.kind === "deploy") counts.deploys++;
    else if (a.kind === "dub") counts.dubs++;
    else if (a.kind === "roast") counts.roasts++;
  }
  const xp =
    counts.builds * XP_PER_BUILD +
    counts.deploys * XP_PER_DEPLOY +
    counts.dubs * XP_PER_DUB +
    counts.roasts * XP_PER_ROAST;
  return {
    ...counts,
    xp,
    level: levelFromXp(xp),
    progress: progressToNext(xp),
  };
}
