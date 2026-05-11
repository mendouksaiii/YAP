// 10-level Yapper progression system
// XP comes from activities tracked in localStorage.

export interface LevelDef {
  level: number;
  title: string;
  minXp: number;
  emoji: string;
  description: string;
}

export const LEVELS: LevelDef[] = [
  { level: 1,  title: "Level 1 Yapper",        minXp: 0,     emoji: "🐣", description: "Just hatched. Start yapping." },
  { level: 2,  title: "Level 2 Chatterbox",    minXp: 30,    emoji: "🗣️", description: "Finding your voice." },
  { level: 3,  title: "Level 3 Vocalist",      minXp: 80,    emoji: "🎤", description: "Confident on the mic." },
  { level: 4,  title: "Level 4 Linguist",      minXp: 160,   emoji: "🌐", description: "Going global." },
  { level: 5,  title: "Level 5 Builder",       minXp: 280,   emoji: "🔨", description: "Shipping in your sleep." },
  { level: 6,  title: "Level 6 Architect",     minXp: 450,   emoji: "🏗️", description: "Designing universes." },
  { level: 7,  title: "Level 7 Maestro",       minXp: 700,   emoji: "🎼", description: "Voice as instrument." },
  { level: 8,  title: "Level 8 Polyglot",      minXp: 1100,  emoji: "🌍", description: "Speaks every language." },
  { level: 9,  title: "Level 9 Virtuoso",      minXp: 1700,  emoji: "🌟", description: "Mastery, refined." },
  { level: 10, title: "Level 10 Legend",       minXp: 2500,  emoji: "👑", description: "Yap royalty." },
];

export const XP_PER_BUILD = 25;
export const XP_PER_DUB = 15;
export const XP_PER_DEPLOY = 10;
export const XP_PER_ROAST = 5;

export function levelFromXp(xp: number): LevelDef {
  let current = LEVELS[0];
  for (const l of LEVELS) {
    if (xp >= l.minXp) current = l;
  }
  return current;
}

export function nextLevel(currentLevel: number): LevelDef | null {
  return LEVELS.find((l) => l.level === currentLevel + 1) || null;
}

export function progressToNext(xp: number): { current: LevelDef; next: LevelDef | null; pct: number } {
  const current = levelFromXp(xp);
  const next = nextLevel(current.level);
  if (!next) return { current, next: null, pct: 100 };
  const span = next.minXp - current.minXp;
  const into = xp - current.minXp;
  return { current, next, pct: Math.min(100, Math.max(0, Math.round((into / span) * 100))) };
}
