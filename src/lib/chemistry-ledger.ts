// Chemistry Points Economy — client-side ledger for the Playful Prototypes
// session. Persisted to localStorage to stay consistent with synapse-store.
import { useEffect, useState } from "react";

export type GameId =
  | "would-you-rather"
  | "red-green"
  | "two-truths"
  | "desert-island"
  | "memory-match";

export type GameMeta = { id: GameId; name: string; emoji: string; base: number };

export const GAMES: GameMeta[] = [
  { id: "would-you-rather", name: "Would You Rather — Battle", emoji: "⚔️", base: 20 },
  { id: "red-green",        name: "Red Flag / Green Flag",     emoji: "🚩", base: 25 },
  { id: "two-truths",       name: "Two Truths & a Lie",        emoji: "🎭", base: 30 },
  { id: "desert-island",    name: "Desert Island",             emoji: "🏝️", base: 25 },
  { id: "memory-match",     name: "Memory Match",              emoji: "🧠", base: 20 },
];

export const SESSION_BASE_MAX = 120;
export const SESSION_BONUS_CAP = 40;
export const SESSION_MAX = SESSION_BASE_MAX + SESSION_BONUS_CAP; // 160

export type Bonus = { label: string; points: number };
export type GameResult = {
  id: GameId;
  skipped: boolean;
  base: number;       // 0 if skipped
  bonuses: Bonus[];   // empty if skipped
};

export type Tier = "Magnetic" | "Resonant" | "Emerging" | "Curious" | "Incomplete";

export const TIER_META: Record<Tier, { color: string; emoji: string; desc: string }> = {
  Magnetic:   { color: "#A78BFA",         emoji: "⚡", desc: "You led with instinct and depth. Your Passport just got more powerful." },
  Resonant:   { color: "#E2C896",         emoji: "✦",  desc: "Strong chemistry signals. You showed up honestly." },
  Emerging:   { color: "rgb(52,211,153)", emoji: "🌱", desc: "Chemistry is forming. More sessions will sharpen your signal." },
  Curious:    { color: "#7A7876",         emoji: "🔍", desc: "Your signals are quiet but present. Keep exploring." },
  Incomplete: { color: "#2A2A2E",         emoji: "—",  desc: "Finish all 5 games to unlock your chemistry tier." },
};

export function computeTier(results: GameResult[], totalPoints: number): Tier {
  const skips = results.filter((r) => r.skipped).length;
  if (skips >= 2) return "Incomplete";
  if (totalPoints >= 130) return "Magnetic";
  if (totalPoints >= 100) return "Resonant";
  if (totalPoints >= 70)  return "Emerging";
  if (totalPoints >= 40)  return "Curious";
  return "Incomplete";
}

export function sumGame(r: GameResult): number {
  if (r.skipped) return 0;
  return r.base + r.bonuses.reduce((s, b) => s + b.points, 0);
}

export function sumSession(results: GameResult[]): { total: number; bonusTotal: number } {
  let total = 0;
  let bonusTotal = 0;
  for (const r of results) {
    if (r.skipped) continue;
    total += r.base;
    for (const b of r.bonuses) {
      bonusTotal += b.points;
    }
  }
  // Apply session-wide bonus cap
  const cappedBonus = Math.min(bonusTotal, SESSION_BONUS_CAP);
  return { total: Math.max(0, total + cappedBonus), bonusTotal: cappedBonus };
}

/* ---------- Persistent cumulative chemistry score ---------- */

export type SessionRecord = {
  id: string;
  date: string; // ISO
  score: number;
  tier: Tier;
  results: GameResult[];
};

export type ChemistryScoreData = {
  cumulativeScore: number;
  sessionCount: number;
  lastSessionScore: number;
  lastSessionTier: Tier;
  lastSessionDate: string; // ISO
  sessions?: SessionRecord[];
};

const KEY = "unveil-chemistry-v1";

export function loadChemistry(): ChemistryScoreData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ChemistryScoreData) : null;
  } catch {
    return null;
  }
}

function saveChemistry(d: ChemistryScoreData) {
  try { window.localStorage.setItem(KEY, JSON.stringify(d)); } catch {/* ignore */}
  window.dispatchEvent(new CustomEvent("unveil-chemistry-updated"));
}

export function recordSession(sessionScore: number, tier: Tier, results: GameResult[] = []): ChemistryScoreData {
  const prev = loadChemistry();
  const newSession: SessionRecord = {
    id: `s_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    date: new Date().toISOString(),
    score: sessionScore,
    tier,
    results,
  };
  const next: ChemistryScoreData = {
    cumulativeScore: (prev?.cumulativeScore ?? 0) + sessionScore,
    sessionCount: (prev?.sessionCount ?? 0) + 1,
    lastSessionScore: sessionScore,
    lastSessionTier: tier,
    lastSessionDate: newSession.date,
    sessions: [newSession, ...(prev?.sessions ?? [])].slice(0, 50),
  };
  saveChemistry(next);
  return next;
}

export function useChemistry(): ChemistryScoreData | null {
  const [data, setData] = useState<ChemistryScoreData | null>(() => loadChemistry());
  useEffect(() => {
    const refresh = () => setData(loadChemistry());
    window.addEventListener("storage", refresh);
    window.addEventListener("unveil-chemistry-updated", refresh as EventListener);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("unveil-chemistry-updated", refresh as EventListener);
    };
  }, []);
  return data;
}

export function relativeDate(iso: string): string {
  const then = new Date(iso).getTime();
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}
