import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SynapseNav } from "@/components/SynapseNav";
import { generateMatches, useProfile, type SynapseProfile } from "@/lib/synapse-store";
import { Avatar } from "@/components/Avatar";
import { Heart, X, ArrowRight, MapPin, Briefcase } from "lucide-react";

export const Route = createFileRoute("/matches")({
  head: () => ({ meta: [{ title: "Matches — SYNAPSE" }, { name: "description", content: "People within your ±5 cognitive band." }] }),
  component: Matches,
});

function Matches() {
  const [profile] = useProfile();
  const baseScore = profile?.composite ?? 70;
  const matches = useMemo(() => generateMatches(baseScore, 14), [baseScore]);
  const [tab, setTab] = useState<"band" | "all">("band");
  const visible = tab === "band"
    ? matches.filter((m) => Math.abs(m.composite - baseScore) <= 5)
    : matches;
  const [active, setActive] = useState<SynapseProfile | null>(null);

  if (!profile) {
    return (
      <div className="min-h-screen">
        <SynapseNav />
        <div className="mx-auto max-w-md p-12 text-center">
          <h1 className="font-display text-3xl font-bold">Take the test first.</h1>
          <p className="mt-2 text-muted-foreground">You'll need a Composite score to see your band.</p>
          <Link to="/onboarding" className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-hero px-6 py-3 text-primary-foreground shadow-glow">
            Start <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SynapseNav />
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Your composite · {profile.composite}</div>
            <h1 className="mt-2 font-display text-4xl font-bold">
              {visible.length} matches in your <span className="text-gradient-hero">±5 band</span>
            </h1>
          </div>
          <div className="flex gap-1 rounded-full border border-border bg-card p-1">
            <button onClick={() => setTab("band")} className={`rounded-full px-4 py-1.5 text-sm transition-colors ${tab === "band" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              In band
            </button>
            <button onClick={() => setTab("all")} className={`rounded-full px-4 py-1.5 text-sm transition-colors ${tab === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              Extended
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((m, i) => (
            <button
              key={i}
              onClick={() => setActive(m)}
              className="group text-left rounded-3xl border border-border bg-card p-5 transition-all hover:-translate-y-1 hover:border-primary hover:shadow-glow"
            >
              <div className="flex items-start justify-between">
                <Avatar seed={m.avatar ?? "0-180"} size={56} label={m.name} />
                <div className="text-right">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Composite</div>
                  <div className="font-display text-2xl font-bold text-gradient-hero">{m.composite}</div>
                </div>
              </div>
              <div className="mt-4 font-display text-lg font-bold">{m.name}, {m.age}</div>
              <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{m.city}</span>
                <span className="inline-flex items-center gap-1"><Briefcase className="h-3 w-3" />{m.professionLabel}</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <Mini label="Mind" value={m.mindScore} />
                <Mini label="Face" value={m.faceHarmony} />
                <Mini label="Char" value={Math.round((m.character.warmth + m.character.curiosity + m.character.humor) / 3)} />
              </div>
              <div className="mt-3 font-mono text-[11px] text-muted-foreground">
                Δ {Math.abs(m.composite - profile.composite)} pts from you
              </div>
            </button>
          ))}
        </div>

        {visible.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border p-12 text-center text-muted-foreground">
            No one in your band yet. Try the extended view.
          </div>
        )}
      </div>

      {active && <MatchSheet match={active} you={profile} onClose={() => setActive(null)} />}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-surface-2 py-1.5">
      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-display text-sm font-bold">{value}</div>
    </div>
  );
}

function MatchSheet({ match, you, onClose }: { match: SynapseProfile; you: SynapseProfile; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-4 backdrop-blur-md md:items-center" onClick={onClose}>
      <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-8 shadow-glow" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-4">
          <Avatar seed={match.avatar ?? "0-180"} size={72} label={match.name} />
          <div className="flex-1">
            <div className="font-display text-2xl font-bold">{match.name}, {match.age}</div>
            <div className="text-sm text-muted-foreground">{match.city} · {match.professionLabel}</div>
          </div>
          <div className="text-right">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Match</div>
            <div className="font-display text-3xl font-bold text-gradient-hero">{Math.max(50, 100 - Math.abs(you.composite - match.composite) * 4)}%</div>
          </div>
        </div>
        <p className="mt-5 text-sm italic text-muted-foreground">"{match.bio}"</p>
        <div className="mt-6 space-y-3">
          {(["warmth", "curiosity", "adventure", "loyalty", "humor", "ambition"] as const).map((k) => (
            <CompareBar key={k} label={k} you={you.character[k]} them={match.character[k]} />
          ))}
        </div>
        <div className="mt-8 flex gap-3">
          <button onClick={onClose} className="flex flex-1 items-center justify-center gap-2 rounded-full border border-border py-3 hover:bg-surface">
            <X className="h-4 w-4" /> Skip
          </button>
          <button className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-hero py-3 font-medium text-primary-foreground shadow-glow transition-transform hover:scale-105">
            <Heart className="h-4 w-4" /> Synapse
          </button>
        </div>
      </div>
    </div>
  );
}

function CompareBar({ label, you, them }: { label: string; you: number; them: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>{label}</span>
        <span>you {you} · them {them}</span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-surface-2">
        <div className="absolute inset-y-0 left-0 bg-accent/60" style={{ width: `${you}%` }} />
        <div className="absolute inset-y-0 left-0 bg-primary/70 mix-blend-screen" style={{ width: `${them}%` }} />
      </div>
    </div>
  );
}
