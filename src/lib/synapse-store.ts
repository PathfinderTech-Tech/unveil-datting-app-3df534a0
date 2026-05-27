// Lightweight client-side store (localStorage) for the SYNAPSE prototype.
import { useEffect, useState } from "react";

export type Profession =
  | "analytical"
  | "creative"
  | "caregiving"
  | "entrepreneurial"
  | "craft"
  | "academic";

export type CharacterDNA = {
  warmth: number;
  curiosity: number;
  adventure: number;
  loyalty: number;
  humor: number;
  ambition: number;
};

export type SynapseProfile = {
  name: string;
  age: number;
  city: string;
  profession: Profession;
  professionLabel: string;
  faceHarmony: number; // 0-100
  mindScore: number; // 0-100 from game
  character: CharacterDNA;
  composite: number; // weighted ELO-like score
  bio?: string;
  avatar?: string; // gradient seed
};

const KEY = "synapse-profile-v1";

export function loadProfile(): SynapseProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SynapseProfile) : null;
  } catch {
    return null;
  }
}

export function saveProfile(p: SynapseProfile) {
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function clearProfile() {
  localStorage.removeItem(KEY);
}

export function useProfile() {
  const [profile, setProfile] = useState<SynapseProfile | null>(null);
  useEffect(() => setProfile(loadProfile()), []);
  return [profile, (p: SynapseProfile | null) => {
    if (p) { saveProfile(p); setProfile(p); }
    else { clearProfile(); setProfile(null); }
  }] as const;
}

export function computeComposite(p: Omit<SynapseProfile, "composite">): number {
  const charAvg =
    (p.character.warmth + p.character.curiosity + p.character.adventure +
      p.character.loyalty + p.character.humor + p.character.ambition) / 6;
  // Weighted: Mind 45%, Character 35%, Face Harmony 20%
  return Math.round(p.mindScore * 0.45 + charAvg * 0.35 + p.faceHarmony * 0.2);
}

export const PROFESSIONS: { id: Profession; label: string; icon: string; hue: string }[] = [
  { id: "analytical", label: "Analytical", icon: "⚙️", hue: "var(--cyan)" },
  { id: "creative", label: "Creative", icon: "🎨", hue: "var(--magenta)" },
  { id: "caregiving", label: "Caregiving", icon: "🌿", hue: "var(--neon)" },
  { id: "entrepreneurial", label: "Entrepreneurial", icon: "⚡", hue: "var(--amber)" },
  { id: "craft", label: "Craft & Trade", icon: "🔨", hue: "var(--primary)" },
  { id: "academic", label: "Academic", icon: "📚", hue: "var(--accent)" },
];

// ---- Mock match pool ----
const NAMES = ["Lior", "Noa", "Ava", "Kai", "Mira", "Theo", "Zara", "Jude", "Elif", "Soren", "Yuki", "Nia"];
const CITIES = ["Lisbon", "Berlin", "Tokyo", "Brooklyn", "Mexico City", "Copenhagen", "Cape Town"];
const BIOS = [
  "Reads in cafés. Loses chess on purpose. Will cook for you.",
  "Builds tiny robots. Long walks, longer silences.",
  "Ex-dancer turned data scientist. Plays piano badly.",
  "Surfs at sunrise. Codes at midnight. In between: you?",
  "Translates poetry from three languages I barely speak.",
  "Quietly competitive. Will lose a debate then think for a week.",
];

function seeded(n: number) { let x = Math.sin(n) * 10000; return x - Math.floor(x); }

export function generateMatches(userScore: number, count = 12): SynapseProfile[] {
  return Array.from({ length: count }, (_, i) => {
    const r = seeded(userScore + i * 13);
    const drift = Math.round((seeded(i * 7) - 0.5) * 14);
    const mindScore = Math.min(99, Math.max(20, userScore + drift));
    const faceHarmony = 60 + Math.floor(seeded(i + 1) * 40);
    const character: CharacterDNA = {
      warmth: 40 + Math.floor(seeded(i + 2) * 60),
      curiosity: 40 + Math.floor(seeded(i + 3) * 60),
      adventure: 30 + Math.floor(seeded(i + 4) * 70),
      loyalty: 50 + Math.floor(seeded(i + 5) * 50),
      humor: 40 + Math.floor(seeded(i + 6) * 60),
      ambition: 30 + Math.floor(seeded(i + 7) * 70),
    };
    const profession = PROFESSIONS[Math.floor(r * PROFESSIONS.length)];
    const base: Omit<SynapseProfile, "composite"> = {
      name: NAMES[Math.floor(seeded(i + 11) * NAMES.length)],
      age: 23 + Math.floor(seeded(i + 12) * 14),
      city: CITIES[Math.floor(seeded(i + 13) * CITIES.length)],
      profession: profession.id,
      professionLabel: profession.label,
      faceHarmony,
      mindScore,
      character,
      bio: BIOS[i % BIOS.length],
      avatar: `${i}-${Math.floor(r * 360)}`,
    };
    return { ...base, composite: computeComposite(base) };
  }).sort((a, b) => Math.abs(a.composite - userScore) - Math.abs(b.composite - userScore));
}
