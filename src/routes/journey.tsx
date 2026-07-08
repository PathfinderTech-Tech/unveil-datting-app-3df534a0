import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import {
  Heart, Brain, MapPin, Flag, Award, Star, Footprints,
  Flame, Clock, Share2, Sparkles, Plus, BookMarked, Trophy,
  Users, User, ChevronRight, Compass, Globe, Ship,
} from "lucide-react";

export const Route = createFileRoute("/journey")({
  head: () => ({
    meta: [
      { title: "UNVEIL Journey — Walk the World Together" },
      { name: "description", content: "Turn every step into a shared journey across the world. Walk together, unlock landmarks, collect passport stamps." },
    ],
  }),
  component: JourneyPage,
});

/* ---------- Route data ---------- */
type Landmark = {
  key: string;
  name: string;
  label: string;   // status label
  mile: number;    // cumulative miles from start
  emoji: string;
};

const ROUTE = {
  from: { city: "Paris", country: "France", flag: "🇫🇷" },
  to:   { city: "London", country: "United Kingdom", flag: "🇬🇧" },
  totalMiles: 344,
  totalKm: 554,
};

const LANDMARKS: Landmark[] = [
  { key: "paris",    name: "Paris",           label: "STARTED",       mile: 0,   emoji: "🗼" },
  { key: "eiffel",   name: "Eiffel Tower",    label: "DISCOVERED",    mile: 6,   emoji: "🗼" },
  { key: "calais",   name: "Calais",          label: "NEXT STOP",     mile: 185, emoji: "⚓" },
  { key: "channel",  name: "English Channel", label: "CROSSING",      mile: 210, emoji: "🚢" },
  { key: "dover",    name: "Dover",           label: "ALMOST THERE",  mile: 234, emoji: "🌊" },
  { key: "london",   name: "London",          label: "DESTINATION",   mile: 344, emoji: "🎡" },
];

/* ---------- Persistence ---------- */
const STORAGE_KEY = "unveil_journey_v1";
type SavedState = {
  mode: "couple" | "solo";
  role: "heart" | "mind";
  completedMiles: number;
  todayMiles: number;
  todaySteps: number;
  partnerToday: number;
  shareInChat: boolean;
  lovePoints: number;
  xp: number;
  stamps: number;
  badges: number;
  activity: "walking" | "running" | "cycling" | "hiking";
};

const DEFAULT_STATE: SavedState = {
  mode: "couple",
  role: "heart",
  completedMiles: 112.8,
  todayMiles: 4.2,
  todaySteps: 6765,
  partnerToday: 3.0,
  shareInChat: true,
  lovePoints: 3250,
  xp: 12840,
  stamps: 24,
  badges: 8,
  activity: "walking",
};

function loadState(): SavedState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch { return DEFAULT_STATE; }
}
function saveState(s: SavedState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

/* ---------- Page ---------- */
function JourneyPage() {
  const [state, setState] = useState<SavedState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => { setState(loadState()); setHydrated(true); }, []);
  useEffect(() => { if (hydrated) saveState(state); }, [state, hydrated]);

  const set = <K extends keyof SavedState>(k: K, v: SavedState[K]) =>
    setState((s) => ({ ...s, [k]: v }));

  const combinedToday = state.mode === "couple"
    ? +(state.todayMiles + state.partnerToday).toFixed(1)
    : state.todayMiles;

  const completed = Math.min(state.completedMiles, ROUTE.totalMiles);
  const remainingMiles = Math.max(0, ROUTE.totalMiles - completed);
  const remainingKm = Math.round(remainingMiles * 1.609);
  const progressPct = Math.min(100, (completed / ROUTE.totalMiles) * 100);

  // Current landmark: last one we've reached; next one to reach
  const reachedIdx = LANDMARKS.reduce((acc, l, i) => (completed >= l.mile ? i : acc), 0);
  const currentLandmark = LANDMARKS[reachedIdx];
  const nextLandmark = LANDMARKS[Math.min(reachedIdx + 1, LANDMARKS.length - 1)];

  const daysToArrival = Math.max(1, Math.ceil(remainingMiles / Math.max(1, combinedToday || 3.5)));

  const logToday = () => {
    setState((s) => {
      const add = s.mode === "couple" ? s.todayMiles + s.partnerToday : s.todayMiles;
      const newCompleted = Math.min(ROUTE.totalMiles, +(s.completedMiles + add).toFixed(1));
      const reachedNew = LANDMARKS.filter(l => l.mile > s.completedMiles && l.mile <= newCompleted).length;
      return {
        ...s,
        completedMiles: newCompleted,
        lovePoints: s.lovePoints + Math.round(add * 10),
        xp: s.xp + Math.round(add * 25),
        stamps: s.stamps + reachedNew,
        badges: s.badges + (newCompleted >= ROUTE.totalMiles ? 1 : 0),
      };
    });
  };

  return (
    <div className="min-h-screen bg-[#07061a] text-foreground">
      {/* Ambient nebula backdrop */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full opacity-40 blur-3xl"
             style={{ background: "radial-gradient(circle, #d946ef 0%, transparent 60%)" }} />
        <div className="absolute top-1/3 -right-52 h-[620px] w-[620px] rounded-full opacity-30 blur-3xl"
             style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 60%)" }} />
        <div className="absolute bottom-0 left-1/3 h-[520px] w-[520px] rounded-full opacity-25 blur-3xl"
             style={{ background: "radial-gradient(circle, #ec4899 0%, transparent 60%)" }} />
        <Stars />
      </div>

      <UnveilNav />

      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
        {/* Header */}
        <header className="mb-8 flex flex-col items-center gap-3 text-center">
          <h1 className="font-display text-4xl font-light tracking-wide md:text-5xl">
            <span className="text-gradient-hero">UNVEIL JOURNEY</span>
          </h1>
          <p className="flex items-center gap-2 text-sm text-white/70 md:text-base">
            <Heart className="h-4 w-4 text-pink-400" fill="currentColor" />
            Walk the world. Together.
            <Sparkles className="h-4 w-4 text-amber-300" />
          </p>

          {/* Mode toggle */}
          <div className="mt-3 flex rounded-full border border-pink-500/30 bg-white/5 p-1 backdrop-blur-xl">
            <ModePill
              active={state.mode === "couple"}
              onClick={() => set("mode", "couple")}
              icon={<Heart className="h-4 w-4" fill={state.mode === "couple" ? "currentColor" : "none"} />}
              label="Couple Journey"
            />
            <ModePill
              active={state.mode === "solo"}
              onClick={() => set("mode", "solo")}
              icon={<User className="h-4 w-4" />}
              label="Solo Journey"
            />
          </div>

          {/* Couple role picker */}
          {state.mode === "couple" && (
            <div className="mt-2 flex items-center gap-2 text-xs text-white/60">
              <span>You are:</span>
              <button
                onClick={() => set("role", "heart")}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 transition ${state.role === "heart" ? "border-pink-400 bg-pink-500/15 text-pink-200" : "border-white/10 text-white/60 hover:border-pink-400/50"}`}
              >
                <Heart className="h-3 w-3" fill="currentColor" /> Heart
              </button>
              <button
                onClick={() => set("role", "mind")}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 transition ${state.role === "mind" ? "border-indigo-400 bg-indigo-500/15 text-indigo-200" : "border-white/10 text-white/60 hover:border-indigo-400/50"}`}
              >
                <Brain className="h-3 w-3" /> Mind
              </button>
            </div>
          )}

          {/* Stat chips */}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Chip icon={<Heart className="h-3.5 w-3.5 text-pink-400" fill="currentColor" />} value={state.lovePoints.toLocaleString()} accent="pink" />
            <Chip icon={<Star className="h-3.5 w-3.5 text-amber-300" fill="currentColor" />} value={state.xp.toLocaleString()} accent="amber" />
            <Chip icon={<BookMarked className="h-3.5 w-3.5 text-purple-300" />} value={`${state.stamps} stamps`} accent="purple" />
            <Chip icon={<Trophy className="h-3.5 w-3.5 text-yellow-300" />} value={`${state.badges} badges`} accent="amber" />
          </div>
        </header>

        {/* Map card */}
        <section className="relative overflow-hidden rounded-3xl border border-pink-500/25 bg-gradient-to-b from-white/[0.04] to-white/[0.02] p-5 shadow-[0_0_80px_-30px_rgba(217,70,239,0.6)] backdrop-blur-xl md:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <CityPin side="from" city={ROUTE.from.city} flag={ROUTE.from.flag} tone="pink" />
            <div className="flex-1 min-w-[160px] px-2">
              <div className="mx-auto flex max-w-xs items-center justify-center gap-2 rounded-2xl border border-pink-400/30 bg-black/40 px-4 py-3 backdrop-blur">
                <MapPin className="h-4 w-4 text-pink-400" />
                <div className="text-center">
                  <div className="font-display text-lg leading-tight">{remainingMiles.toFixed(0)} mi <span className="text-white/50">/</span> {remainingKm} km</div>
                  <div className="text-[10px] uppercase tracking-widest text-white/60">Distance to go</div>
                </div>
              </div>
            </div>
            <CityPin side="to" city={ROUTE.to.city} flag={ROUTE.to.flag} tone="indigo" />
          </div>

          {/* World map */}
          <WorldMap progressPct={progressPct} />

          {/* Today's Progress */}
          <div className="mt-6 grid gap-4 rounded-2xl border border-white/10 bg-black/40 p-5 backdrop-blur md:grid-cols-3">
            <div>
              <div className="text-xs uppercase tracking-widest text-white/60">Today's Progress</div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="font-display text-4xl text-pink-300">{combinedToday.toFixed(1)}</span>
                <span className="text-sm text-white/60">mi</span>
              </div>
              <div className="text-xs text-white/50">{state.todaySteps.toLocaleString()} steps</div>
            </div>

            <div className="md:col-span-2">
              <div className="flex items-baseline justify-between">
                <div className="text-xs uppercase tracking-widest text-white/60">Total Progress</div>
                <div className="text-xs text-white/60">{progressPct.toFixed(0)}%</div>
              </div>
              <div className="mt-1 font-display text-2xl">
                {completed.toFixed(1)} <span className="text-white/50 text-lg">mi</span>
                <span className="text-white/40 text-base"> / {ROUTE.totalMiles} mi</span>
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-pink-400 via-fuchsia-500 to-indigo-400 shadow-[0_0_16px_rgba(236,72,153,0.7)] transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-white/60">
                <Clock className="h-3.5 w-3.5" />
                Together you'll arrive in <span className="text-white">{daysToArrival} days</span> (est.)
              </div>
            </div>
          </div>

          {/* Encouragement banner */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-pink-400/30 bg-gradient-to-r from-pink-500/10 via-fuchsia-500/10 to-indigo-500/10 p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-pink-500/20 text-pink-300">
                <Footprints className="h-5 w-5" />
              </div>
              <div>
                <div className="font-display text-base">Walk today to move forward</div>
                <div className="text-xs text-white/60">
                  Next stop: <span className="text-pink-300">{nextLandmark.name}</span> · {Math.max(0, nextLandmark.mile - completed).toFixed(0)} mi away
                </div>
              </div>
            </div>
            <button
              onClick={logToday}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500 px-5 py-2.5 text-sm font-medium text-white shadow-[0_0_24px_rgba(236,72,153,0.5)] hover:brightness-110"
            >
              <Plus className="h-4 w-4" /> Log today's walk
            </button>
          </div>
        </section>

        {/* Route highlights */}
        <section className="mt-8">
          <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/70">
            <Compass className="h-3.5 w-3.5 text-pink-400" /> Your Route Highlights
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {LANDMARKS.map((l, i) => {
              const reached = completed >= l.mile;
              const isCurrent = i === reachedIdx;
              return (
                <div
                  key={l.key}
                  className={`relative overflow-hidden rounded-2xl border p-4 backdrop-blur transition ${
                    isCurrent
                      ? "border-amber-300/60 bg-amber-500/5 shadow-[0_0_36px_-8px_rgba(251,191,36,0.6)]"
                      : reached
                      ? "border-pink-400/40 bg-white/[0.03]"
                      : "border-white/10 bg-white/[0.02] opacity-70"
                  }`}
                >
                  {isCurrent && (
                    <div className="absolute right-2 top-2 text-amber-300"><MapPin className="h-4 w-4" fill="currentColor" /></div>
                  )}
                  {reached && !isCurrent && (
                    <div className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-pink-500/30 text-pink-200 text-[10px]">✓</div>
                  )}
                  <div className="grid h-16 w-full place-items-center rounded-xl bg-gradient-to-br from-indigo-900/60 to-black/60 text-3xl">
                    {l.emoji}
                  </div>
                  <div className="mt-3 font-display text-sm">{l.name}</div>
                  <div className="mt-0.5 text-[10px] uppercase tracking-widest text-white/60">{l.label}</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Bottom row: activity + rewards + share */}
        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          {/* Today's activity */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur">
            <div className="mb-4 text-xs uppercase tracking-[0.2em] text-white/60">Today's Activity</div>
            <div className="flex items-center gap-5">
              <StepsRing steps={state.todaySteps} goal={10000} />
              <div className="space-y-2 text-sm">
                <ActivityRow icon={<Flame className="h-4 w-4 text-orange-400" />} value={Math.round(state.todaySteps * 0.046)} label="Calories" />
                <ActivityRow icon={<MapPin className="h-4 w-4 text-pink-400" />} value={`${state.todayMiles.toFixed(1)} mi`} label="Distance" />
                <ActivityRow icon={<Clock className="h-4 w-4 text-indigo-300" />} value={`${Math.round(state.todaySteps / 116)} min`} label="Active Time" />
              </div>
            </div>

            {/* Activity type selector */}
            <div className="mt-4 flex flex-wrap gap-1.5">
              {(["walking","running","cycling","hiking"] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => set("activity", a)}
                  className={`rounded-full border px-3 py-1 text-[11px] capitalize transition ${state.activity === a ? "border-pink-400 bg-pink-500/15 text-pink-200" : "border-white/10 bg-white/[0.03] text-white/60 hover:border-pink-400/40"}`}
                >
                  {a === "walking" ? "🚶" : a === "running" ? "🏃" : a === "cycling" ? "🚴" : "🥾"} {a}
                </button>
              ))}
            </div>

            {/* Mock step control */}
            <div className="mt-4 flex items-center gap-2 text-xs">
              <button
                onClick={() => setState((s) => ({ ...s, todaySteps: Math.max(0, s.todaySteps - 500), todayMiles: +Math.max(0, s.todayMiles - 0.3).toFixed(1) }))}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 hover:bg-white/10"
              >−</button>
              <span className="text-white/60">Adjust mock steps</span>
              <button
                onClick={() => setState((s) => ({ ...s, todaySteps: s.todaySteps + 500, todayMiles: +(s.todayMiles + 0.3).toFixed(1) }))}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 hover:bg-white/10"
              >+</button>
            </div>
          </div>

          {/* Journey rewards */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur">
            <div className="mb-4 text-xs uppercase tracking-[0.2em] text-white/60 text-center">Journey Rewards</div>
            <div className="grid grid-cols-4 gap-3 text-center">
              <RewardTile icon={<BookMarked className="h-6 w-6 text-amber-200" />} value="+1" label="Stamp" ring="from-amber-500/30 to-amber-800/20" />
              <RewardTile icon={<Heart className="h-6 w-6 text-pink-300" fill="currentColor" />} value="+50" label="Love Points" ring="from-pink-500/30 to-fuchsia-800/20" />
              <RewardTile icon={<Star className="h-6 w-6 text-yellow-300" fill="currentColor" />} value="+100" label="XP" ring="from-yellow-500/30 to-amber-800/20" />
              <RewardTile icon={<Award className="h-6 w-6 text-emerald-300" />} value="+1" label="Badge" ring="from-emerald-500/30 to-teal-800/20" />
            </div>
            <button className="mt-4 w-full rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 py-2.5 text-sm font-medium shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:brightness-110">
              View All Rewards
            </button>
          </div>

          {/* Share */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur">
            <div className="mb-4 text-xs uppercase tracking-[0.2em] text-white/60 text-center">Share Journey</div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center gap-2 text-sm">
                <Share2 className="h-4 w-4 text-pink-300" />
                <div>
                  <div>Share progress</div>
                  <div className="text-[11px] text-white/60">in conversation</div>
                </div>
              </div>
              <Toggle on={state.shareInChat} onChange={(v) => set("shareInChat", v)} />
            </div>

            <div className="mt-4 flex items-center justify-center gap-3">
              <Avatar tone="pink" icon={<Heart className="h-5 w-5" fill="currentColor" />} />
              <div className="flex items-center gap-1 text-pink-400">
                <Heart className="h-3 w-3" fill="currentColor" />
                <span className="h-px w-6 bg-gradient-to-r from-pink-400 to-indigo-400" />
                <Heart className="h-3 w-3 text-indigo-300" fill="currentColor" />
              </div>
              <Avatar tone="indigo" icon={<Brain className="h-5 w-5" />} />
            </div>
            <div className="mt-3 text-center text-[11px] text-white/60">
              You both can choose what to share.
            </div>
          </div>
        </section>

        {/* Health integration coming soon */}
        <section className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-400/30 bg-gradient-to-r from-amber-500/5 to-transparent p-5 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-amber-500/15 text-amber-300">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-base">Health tracking integration coming next</div>
              <div className="text-xs text-white/60">Apple Health, Android Health Connect, Fitbit and more.</div>
            </div>
          </div>
          <button className="rounded-full border border-amber-300/40 bg-white/[0.03] px-4 py-2 text-xs text-amber-200 hover:bg-amber-500/10">
            Learn More
          </button>
        </section>
      </div>
    </div>
  );
}

/* ---------- Small components ---------- */
function ModePill({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm transition ${
        active
          ? "bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white shadow-[0_0_20px_rgba(236,72,153,0.5)]"
          : "text-white/70 hover:text-white"
      }`}
    >
      {icon}{label}
    </button>
  );
}

function Chip({ icon, value, accent }: { icon: React.ReactNode; value: string; accent: "pink" | "amber" | "purple" | "indigo"; }) {
  const border = { pink: "border-pink-400/40", amber: "border-amber-400/40", purple: "border-purple-400/40", indigo: "border-indigo-400/40" }[accent];
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full border ${border} bg-white/[0.04] px-3 py-1 text-xs backdrop-blur`}>
      {icon}<span className="text-white/90">{value}</span>
    </div>
  );
}

function CityPin({ side, city, flag, tone }: { side: "from" | "to"; city: string; flag: string; tone: "pink" | "indigo"; }) {
  const ring = tone === "pink" ? "ring-pink-400/70 shadow-[0_0_32px_rgba(236,72,153,0.5)]" : "ring-indigo-400/70 shadow-[0_0_32px_rgba(99,102,241,0.5)]";
  const tint = tone === "pink" ? "text-pink-300" : "text-indigo-300";
  return (
    <div className="flex items-center gap-3">
      {side === "from" && (
        <div className={`grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-indigo-900 to-black text-2xl ring-2 ${ring}`}>
          {tone === "pink" ? "🗼" : "🎡"}
        </div>
      )}
      <div className={side === "to" ? "text-right" : ""}>
        <div className={`text-[10px] uppercase tracking-[0.2em] ${tint}`}>{side === "from" ? "FROM" : "TO"}</div>
        <div className="font-display text-2xl leading-tight">{flag} {city}</div>
      </div>
      {side === "to" && (
        <div className={`grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-indigo-900 to-black text-2xl ring-2 ${ring}`}>
          🎡
        </div>
      )}
    </div>
  );
}

function WorldMap({ progressPct }: { progressPct: number }) {
  // Stylized SVG world map with animated route
  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-indigo-500/25 bg-[radial-gradient(circle_at_30%_30%,rgba(99,102,241,0.25),transparent_60%),radial-gradient(circle_at_70%_60%,rgba(236,72,153,0.2),transparent_60%),#0a0824]">
      <svg viewBox="0 0 800 320" className="h-56 w-full md:h-72" preserveAspectRatio="none">
        <defs>
          <linearGradient id="routeGrad" x1="0" x2="1">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="50%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>
          <radialGradient id="cityGlowPink">
            <stop offset="0%" stopColor="#f472b6" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#f472b6" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="cityGlowBlue">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Faint continents blob */}
        <g fill="rgba(148,163,255,0.14)" stroke="rgba(148,163,255,0.25)" strokeWidth="1">
          <path d="M 60 120 Q 140 80, 240 110 T 380 140 Q 420 180, 380 220 T 240 240 Q 140 240, 60 200 Z" />
          <path d="M 460 90 Q 560 70, 640 110 T 760 160 Q 720 220, 640 240 T 480 220 Q 440 170, 460 90 Z" />
        </g>

        {/* Grid dots */}
        <g fill="rgba(255,255,255,0.15)">
          {Array.from({ length: 24 }).map((_, i) =>
            Array.from({ length: 10 }).map((_, j) => (
              <circle key={`${i}-${j}`} cx={30 + i * 32} cy={20 + j * 30} r="1" />
            ))
          )}
        </g>

        {/* Full route (dim) */}
        <path
          d="M 180 200 Q 320 100, 460 170 T 660 150"
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="3"
          strokeDasharray="4 6"
        />

        {/* Progress route */}
        <path
          d="M 180 200 Q 320 100, 460 170 T 660 150"
          fill="none"
          stroke="url(#routeGrad)"
          strokeWidth="3.5"
          strokeDasharray="1000"
          strokeDashoffset={1000 - (progressPct / 100) * 1000}
          strokeLinecap="round"
          style={{ filter: "drop-shadow(0 0 6px rgba(236,72,153,0.7))", transition: "stroke-dashoffset 0.8s ease" }}
        />

        {/* Ship midway */}
        <g transform="translate(420,160)">
          <circle r="18" fill="rgba(255,255,255,0.06)" />
          <text x="0" y="6" textAnchor="middle" fontSize="20">🚢</text>
        </g>
        <text x="440" y="200" fill="rgba(255,255,255,0.7)" fontSize="11">English Channel</text>

        {/* Start city */}
        <circle cx="180" cy="200" r="24" fill="url(#cityGlowPink)" />
        <circle cx="180" cy="200" r="6" fill="#f472b6" />
        <text x="180" y="235" textAnchor="middle" fill="white" fontSize="12" fontWeight="500">Paris</text>

        {/* End city */}
        <circle cx="660" cy="150" r="24" fill="url(#cityGlowBlue)" />
        <circle cx="660" cy="150" r="6" fill="#60a5fa" />
        <text x="660" y="185" textAnchor="middle" fill="white" fontSize="12" fontWeight="500">London</text>
      </svg>

      {/* Avatar tokens floating over map */}
      <div className="pointer-events-none absolute left-[18%] bottom-6 flex flex-col items-center">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-600 text-2xl shadow-[0_0_24px_rgba(236,72,153,0.7)] ring-2 ring-pink-300/60">
          <Heart className="h-6 w-6 text-white" fill="currentColor" />
        </div>
      </div>
      <div className="pointer-events-none absolute right-[15%] top-6 flex flex-col items-center">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 text-2xl shadow-[0_0_24px_rgba(99,102,241,0.7)] ring-2 ring-indigo-300/60">
          <Brain className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
}

function ActivityRow({ icon, value, label }: { icon: React.ReactNode; value: React.ReactNode; label: string; }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-white">{value}</span>
      <span className="text-white/50 text-xs">{label}</span>
    </div>
  );
}

function StepsRing({ steps, goal }: { steps: number; goal: number; }) {
  const pct = Math.min(1, steps / goal);
  const r = 44;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-28 w-28 flex-shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke="url(#stepsGrad)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - c * pct}
          style={{ filter: "drop-shadow(0 0 6px rgba(236,72,153,0.6))" }}
        />
        <defs>
          <linearGradient id="stepsGrad" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <Footprints className="h-4 w-4 text-pink-300" />
        <div className="font-display text-lg leading-none mt-1">{steps.toLocaleString()}</div>
        <div className="text-[10px] text-white/60">/ {goal.toLocaleString()} steps</div>
      </div>
    </div>
  );
}

function RewardTile({ icon, value, label, ring }: { icon: React.ReactNode; value: string; label: string; ring: string; }) {
  return (
    <div>
      <div className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-gradient-to-br ${ring} backdrop-blur`}>
        {icon}
      </div>
      <div className="mt-2 font-display text-sm">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-white/60">{label}</div>
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void; }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 rounded-full transition ${on ? "bg-gradient-to-r from-pink-500 to-fuchsia-500" : "bg-white/15"}`}
      aria-pressed={on}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${on ? "left-[calc(100%-1.375rem)]" : "left-0.5"}`} />
    </button>
  );
}

function Avatar({ tone, icon }: { tone: "pink" | "indigo"; icon: React.ReactNode; }) {
  const cls = tone === "pink"
    ? "from-pink-500 to-fuchsia-600 ring-pink-300/60 shadow-[0_0_20px_rgba(236,72,153,0.6)]"
    : "from-indigo-500 to-blue-600 ring-indigo-300/60 shadow-[0_0_20px_rgba(99,102,241,0.6)]";
  return (
    <div className={`grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br ${cls} text-white ring-2`}>
      {icon}
    </div>
  );
}

function Stars() {
  const stars = useMemo(
    () => Array.from({ length: 60 }).map(() => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      s: Math.random() * 1.6 + 0.3,
      d: Math.random() * 4 + 2,
      o: Math.random() * 0.6 + 0.2,
    })),
    []
  );
  return (
    <div className="absolute inset-0">
      {stars.map((st, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            left: `${st.x}%`, top: `${st.y}%`,
            width: st.s, height: st.s,
            opacity: st.o,
            animation: `pulse ${st.d}s ease-in-out ${i * 0.1}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
