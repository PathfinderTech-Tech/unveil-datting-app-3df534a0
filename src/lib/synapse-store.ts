// Lightweight client-side store (localStorage) for the SYNAPSE prototype.
// SYNAPSE is a cognitive & emotional compatibility platform — not an IQ app.
// The "Resonance Score" represents communication rhythm, curiosity, emotional
// pacing, and personality dynamics. It is never a measure of human value.
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

// Emotional presence — replaces "online now". Atmosphere, not pressure.
export type Presence =
  | "reflective"
  | "open-deep"
  | "low-energy"
  | "seeking-humor"
  | "listening"
  | "curious-tonight";

export const PRESENCE_LABELS: Record<Presence, { label: string; hint: string; hue: string }> = {
  "reflective": { label: "Reflective", hint: "Quiet thoughts, slow replies", hue: "var(--cyan)" },
  "open-deep": { label: "Open to deep talk", hint: "Bring the real questions", hue: "var(--magenta)" },
  "low-energy": { label: "Low social energy", hint: "Soft presence today", hue: "var(--muted-foreground)" },
  "seeking-humor": { label: "Seeking humor", hint: "Make them laugh", hue: "var(--amber)" },
  "listening": { label: "Listening mode", hint: "Tell me a story", hue: "var(--neon)" },
  "curious-tonight": { label: "Curious tonight", hint: "Open to a new mind", hue: "var(--primary)" },
};

// Emotional archetypes — proprietary identity poetry, evolves over time.
export type Archetype =
  | "architect" | "wanderer" | "mirror" | "observer"
  | "catalyst" | "deep-current" | "signal";

export const ARCHETYPES: Record<Archetype, { name: string; tagline: string; essence: string; hue: string }> = {
  "architect":     { name: "The Architect",    tagline: "Builds frameworks out of feelings.", essence: "Structured curiosity. Calm under complexity.", hue: "var(--cyan)" },
  "wanderer":      { name: "The Wanderer",     tagline: "Loves the texture of unknown places.", essence: "High adventure, low fear. Curious in motion.", hue: "var(--amber)" },
  "mirror":        { name: "The Mirror",       tagline: "Reflects you back, more clearly.",   essence: "Deep empathy. Mirrors emotional pacing.", hue: "var(--magenta)" },
  "observer":      { name: "The Observer",     tagline: "Notices the things you didn't say.",  essence: "Patient signal-reader. Reads between lines.", hue: "var(--muted-foreground)" },
  "catalyst":      { name: "The Catalyst",     tagline: "Lights the room and rearranges it.",  essence: "High warmth & humor. Moves first.", hue: "var(--primary)" },
  "deep-current":  { name: "The Deep Current", tagline: "Quiet on the surface, vast underneath.", essence: "Loyal, slow-warming, profound.", hue: "var(--accent)" },
  "signal":        { name: "The Signal",       tagline: "Speaks in clear, careful frequencies.", essence: "Precise communicator. Truthful.", hue: "var(--neon)" },
};

export type SynapseProfile = {
  name: string;
  age: number;
  city: string;
  profession: Profession;
  professionLabel: string;
  faceHarmony: number;     // 0-100 — used for compatibility, never ranking
  mindScore: number;       // 0-100 — cognitive rhythm signature
  character: CharacterDNA;
  composite: number;       // Resonance Score — compatibility rhythm
  archetype: Archetype;
  presence?: Presence;
  bio?: string;
  avatar?: string;
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

// Resonance Score: compatibility rhythm, not ranking.
// Mind 40% (rhythm) + Character 40% (emotional dynamics) + Face 20% (sensory layer)
export function computeComposite(p: Omit<SynapseProfile, "composite" | "archetype"> & { archetype?: Archetype }): number {
  const charAvg =
    (p.character.warmth + p.character.curiosity + p.character.adventure +
      p.character.loyalty + p.character.humor + p.character.ambition) / 6;
  return Math.round(p.mindScore * 0.4 + charAvg * 0.4 + p.faceHarmony * 0.2);
}

// Derive an emotional archetype from character dynamics + cognitive rhythm.
export function deriveArchetype(c: CharacterDNA, mind: number): Archetype {
  const { warmth, curiosity, adventure, loyalty, humor, ambition } = c;
  if (warmth >= 70 && humor >= 65) return "catalyst";
  if (adventure >= 70 && curiosity >= 60) return "wanderer";
  if (loyalty >= 70 && warmth >= 55 && adventure < 55) return "deep-current";
  if (warmth >= 65 && curiosity >= 60 && ambition < 60) return "mirror";
  if (mind >= 70 && ambition >= 60 && curiosity >= 55) return "architect";
  if (humor < 50 && warmth < 60 && curiosity >= 55) return "observer";
  return "signal";
}

// ---- DISCOVERY PROFILE — simple A/B questions ----
// Each question maps a CharacterDNA dimension to a friendly label.
// Picking A = 30, picking B = 80 — keeps downstream archetype math intact.
export type DiscoveryKey =
  | "connection" | "communication" | "energy" | "adventure" | "pace" | "humor";

export const DISCOVERY_QUESTIONS: {
  key: DiscoveryKey;
  // which CharacterDNA field it feeds
  field: keyof CharacterDNA;
  prompt: string;
  a: string; b: string;
  aLabel: string; bLabel: string;
}[] = [
  { key: "connection", field: "warmth",
    prompt: "Which sounds more like you?",
    a: "I like getting to know people slowly.", b: "I usually connect with people quickly.",
    aLabel: "Slow-warming", bLabel: "Quick-to-connect" },
  { key: "communication", field: "curiosity",
    prompt: "On a great first date, you mostly…",
    a: "Keep it light, joke around, see what clicks.", b: "Trade real stories and bigger questions.",
    aLabel: "Light & easy", bLabel: "Deep talker" },
  { key: "energy", field: "ambition",
    prompt: "Most weeks, you…",
    a: "Protect your calm — fewer plans, deeper ones.", b: "Run hot — lots going on, lots of people.",
    aLabel: "Steady & calm", bLabel: "High-energy" },
  { key: "adventure", field: "adventure",
    prompt: "Which sounds more like you?",
    a: "I prefer a quiet night at home.", b: "I enjoy going out and exploring.",
    aLabel: "Homebody", bLabel: "Explorer" },
  { key: "pace", field: "loyalty",
    prompt: "What are you actually looking for?",
    a: "Something easy — see where it goes.", b: "Someone serious — a real relationship.",
    aLabel: "Open & easy", bLabel: "Long-term" },
  { key: "humor", field: "humor",
    prompt: "Which sounds more like you?",
    a: "Dry, observational, a little sharp.", b: "Goofy, playful, laughs easily.",
    aLabel: "Dry wit", bLabel: "Playful" },
];

export type DiscoveryProfile = Record<DiscoveryKey, "a" | "b">;

export function discoveryToCharacter(d: DiscoveryProfile): CharacterDNA {
  const v = (k: DiscoveryKey) => (d[k] === "b" ? 80 : 30);
  return {
    warmth: v("connection"),
    curiosity: v("communication"),
    adventure: v("adventure"),
    loyalty: v("pace"),
    humor: v("humor"),
    ambition: v("energy"),
  };
}

export function discoverySummary(d: DiscoveryProfile): string {
  const parts: string[] = [];
  parts.push(d.connection === "a" ? "You build trust slowly" : "You connect with people quickly");
  parts.push(d.communication === "a" ? "keep things light and easy" : "love meaningful conversations");
  parts.push(d.adventure === "a" ? "prefer cozy nights in" : "enjoy getting out and exploring");
  parts.push(d.energy === "a" ? "move at a calm, steady pace" : "carry a high-energy rhythm");
  parts.push(d.pace === "a" ? "stay open about where things go" : "are looking for a real relationship");
  parts.push(d.humor === "a" ? "have a dry, sharp humor" : "love to laugh and play");
  return parts.join(", ") + ".";
}

// ---- BADGES — UNVEIL Passport ----
export type Badge = {
  id: string; name: string; icon: string; description: string; rarity: "common" | "rare" | "elite";
};
export const BADGES: Badge[] = [
  { id: "adventurer", name: "Adventurer", icon: "🧭", description: "Said yes to the unknown.", rarity: "common" },
  { id: "romantic", name: "Romantic", icon: "🌹", description: "Spoke from the heart, often.", rarity: "common" },
  { id: "explorer", name: "Explorer", icon: "🗺️", description: "Curious across worlds.", rarity: "common" },
  { id: "deep-thinker", name: "Deep Thinker", icon: "🧠", description: "Always one layer down.", rarity: "rare" },
  { id: "great-listener", name: "Great Listener", icon: "👂", description: "Reflects people back to themselves.", rarity: "rare" },
  { id: "storyteller", name: "Storyteller", icon: "📖", description: "Turns moments into worlds.", rarity: "rare" },
  { id: "challenge-champion", name: "Challenge Champion", icon: "🏆", description: "Won three challenges.", rarity: "elite" },
  { id: "conversation-master", name: "Conversation Master", icon: "💬", description: "Held a 100-message thread that mattered.", rarity: "elite" },
];

// ---- CHALLENGE GAMES — Challenge Before The Date ----
export const WOULD_YOU_RATHER = [
  { a: "Travel the world for a year — alone.", b: "Travel for a year — with the right partner." },
  { a: "Cook a long dinner together at home.", b: "Discover a new restaurant every weekend." },
  { a: "Always say what you feel, immediately.", b: "Always wait until you really mean it." },
  { a: "Beach sunrise, no phones.", b: "Mountain hike, music in your ears." },
  { a: "Plan every weekend a month ahead.", b: "Decide Friday afternoon, every time." },
];

export const RED_FLAGS = [
  "Doesn't have any close long-term friends.",
  "Talks badly about every ex.",
  "Always 'too busy' to make plans.",
  "Can never apologize first.",
  "Phone face-down on every dinner.",
];
export const GREEN_FLAGS = [
  "Remembers small details you mentioned weeks ago.",
  "Has hobbies that have nothing to do with you.",
  "Apologizes specifically, not vaguely.",
  "Friends with their exes — without weirdness.",
  "Asks the second question, not just the first.",
];

// ---- FIRST DATE SIMULATOR — scenario alignment ----
export const FIRST_DATE_SCENARIOS = [
  {
    q: "You're both late to dinner. What do you do?",
    options: ["Call ahead, charm the host.", "Ditch it — find a wine bar instead.", "Walk fast and laugh about it."],
  },
  {
    q: "Your vacation gets canceled last minute. Backup plan?",
    options: ["Hometown staycation, every restaurant.", "Drive somewhere random within 4 hours.", "Stay in, cook, watch everything."],
  },
  {
    q: "You win $1,000 unexpectedly. How do you spend it?",
    options: ["Save half, treat yourself with half.", "One incredible weekend trip.", "Something thoughtful for someone else."],
  },
  {
    q: "First fight, six months in. You usually…",
    options: ["Talk it through tonight, even if late.", "Sleep on it, return in the morning.", "Write it down before you say it."],
  },
  {
    q: "Sunday morning together looks like…",
    options: ["Slow breakfast, no agenda.", "Out the door by 9 — market, walk, café.", "One of you reads, one of you cooks."],
  },
];

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
const PRESENCES: Presence[] = ["reflective", "open-deep", "low-energy", "seeking-humor", "listening", "curious-tonight"];

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
    const archetype = deriveArchetype(character, mindScore);
    const presence = PRESENCES[Math.floor(seeded(i + 21) * PRESENCES.length)];
    const base = {
      name: NAMES[Math.floor(seeded(i + 11) * NAMES.length)],
      age: 23 + Math.floor(seeded(i + 12) * 14),
      city: CITIES[Math.floor(seeded(i + 13) * CITIES.length)],
      profession: profession.id,
      professionLabel: profession.label,
      faceHarmony,
      mindScore,
      character,
      archetype,
      presence,
      bio: BIOS[i % BIOS.length],
      avatar: `${i}-${Math.floor(r * 360)}`,
    };
    return { ...base, composite: computeComposite(base) } as SynapseProfile;
  }).sort((a, b) => Math.abs(a.composite - userScore) - Math.abs(b.composite - userScore));
}

// Conversation chemistry — purely illustrative, for the prototype.
export function chemistryFor(seed: string) {
  const n = seed.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return {
    reciprocity: 55 + (n % 40),
    humorSync: 50 + ((n * 3) % 45),
    curiosityAlign: 60 + ((n * 7) % 35),
    pacing: 50 + ((n * 11) % 45),
  };
}
