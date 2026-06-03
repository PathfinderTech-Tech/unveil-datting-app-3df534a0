// Client-side compatibility scoring from Discover Yourself answers.
// Produces an overall score plus 4 sub-scores. Deterministic per pair.
import type { DiscoverAnswers } from "./discover-sections";

export type SubScores = {
  overall: number;
  communication: number;
  lifestyle: number;
  values: number;
  goals: number;
};

const SECTION_KEYS = {
  goals: ["intent", "horizon", "speed"],
  lifestyle: ["weekend", "plans", "social", "home"],
  communication: ["conflict", "expression", "texting"],
  values: ["politics", "spiritual", "money", "priorities"],
} as const;

function scoreField(a: unknown, b: unknown): number {
  if (a == null || b == null) return 60;
  if (Array.isArray(a) && Array.isArray(b)) {
    const sa = new Set(a as string[]);
    const sb = new Set(b as string[]);
    const inter = [...sa].filter((x) => sb.has(x)).length;
    const union = new Set([...sa, ...sb]).size || 1;
    return Math.round(40 + (inter / union) * 60);
  }
  if (typeof a === "number" && typeof b === "number") {
    const diff = Math.abs(a - b);
    return Math.max(20, Math.round(100 - diff * 8));
  }
  return a === b ? 95 : 55;
}

function avg(ns: number[]) {
  if (!ns.length) return 65;
  return Math.round(ns.reduce((s, n) => s + n, 0) / ns.length);
}

export function pairScores(me: DiscoverAnswers, them: DiscoverAnswers): SubScores {
  const sub = (keys: readonly string[]) =>
    avg(keys.map((k) => scoreField(me[k], them[k])));
  const goals = sub(SECTION_KEYS.goals);
  const lifestyle = sub(SECTION_KEYS.lifestyle);
  const communication = sub(SECTION_KEYS.communication);
  const values = sub(SECTION_KEYS.values);
  const overall = Math.round(
    goals * 0.3 + values * 0.28 + communication * 0.22 + lifestyle * 0.2
  );
  return { overall, communication, lifestyle, values, goals };
}

// Self-summary helpers for the Compatibility Profile page.
export function personalitySummary(a: DiscoverAnswers): string {
  const intro = typeof a.introvert === "number" ? a.introvert : 5;
  const structure = typeof a.structure === "number" ? a.structure : 5;
  const optimism = typeof a.optimism === "number" ? a.optimism : 5;
  const parts: string[] = [];
  parts.push(intro <= 4 ? "Introvert at heart" : intro >= 7 ? "Extrovert energy" : "Balanced socially");
  parts.push(structure <= 4 ? "free-flowing" : structure >= 7 ? "structured and planned" : "flexibly organized");
  parts.push(optimism >= 7 ? "with an optimistic outlook" : optimism <= 4 ? "with a realist's eye" : "with an even outlook");
  return parts.join(", ") + ".";
}

export function communicationSummary(a: DiscoverAnswers): string {
  const c = a.conflict as string | undefined;
  const e = a.expression as string | undefined;
  const t = a.texting as string | undefined;
  const cMap: Record<string, string> = {
    talk: "addresses friction directly",
    sleep: "lets emotion settle before talking",
    write: "writes things through first",
    space: "takes space and returns calmer",
  };
  const eMap: Record<string, string> = {
    direct: "speaks plainly",
    careful: "chooses words carefully",
    playful: "uses humor as a bridge",
    actions: "shows it through doing",
  };
  const tMap: Record<string, string> = {
    fast: "replies fast",
    daily: "checks in daily",
    slow: "writes when there's real signal",
  };
  return [c && cMap[c], e && eMap[e], t && tMap[t]].filter(Boolean).join(", ") + ".";
}

export function compatibilityHeadline(a: DiscoverAnswers): number {
  // Heuristic "openness" score — how compatible they likely are with most people.
  const flags = Array.isArray(a.red) ? (a.red as string[]).length : 0;
  const greens = Array.isArray(a.green) ? (a.green as string[]).length : 0;
  return Math.max(55, Math.min(95, 70 + greens * 2 - flags));
}
