import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import {
  useProfile, ARCHETYPES, PRESENCE_LABELS, chemistryFor,
  type SynapseProfile,
} from "@/lib/synapse-store";
import { loadRealMatches, likeProfile, distanceLabel, type RealMatch } from "@/lib/matching-api";
import { MatchFilters, DEFAULT_FILTERS, type FilterState } from "@/components/MatchFilters";
import { Avatar } from "@/components/Avatar";
import { toast } from "sonner";
import {
  Heart, X, ArrowRight, MapPin, Briefcase, Mic, MessageCircle, Eye, Lock, Unlock, Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/matches")({
  head: () => ({ meta: [{ title: "Your band — UNVEIL" }, { name: "description", content: "People inside your compatibility band. Connection unlocks progressively." }] }),
  component: Matches,
});

function Matches() {
  const [profile] = useProfile();
  const baseScore = profile?.composite ?? 70;
  const [matches, setMatches] = useState<RealMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"band" | "all">("all");
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    setLoading(true);
    loadRealMatches({
      limit: 40,
      nearbyOnly: filters.nearbyOnly,
      radiusKm: filters.radiusKm || null,
      country: filters.country || null,
      language: filters.language || null,
      intent: filters.intent || null,
      ageMin: filters.ageMin,
      ageMax: filters.ageMax,
    }).then((rows) => {
      if (!alive) return;
      setMatches(rows);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [filters]);

  const visible = useMemo(() => {
    if (tab === "band") return matches.filter((m) => Math.abs(m.composite - baseScore) <= 10);
    return matches;
  }, [matches, tab, baseScore]);
  const [active, setActive] = useState<RealMatch | null>(null);

  if (!profile) {
    return (
      <div className="min-h-screen">
        <UnveilNav />
        <div className="mx-auto max-w-md p-12 text-center">
          <h1 className="font-display text-3xl font-bold">Discover your resonance first.</h1>
          <p className="mt-2 text-muted-foreground">Your band reveals once your signature is composed.</p>
          <Link to="/onboarding" className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-hero px-6 py-3 text-primary-foreground shadow-glow">
            Begin <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  async function handleLike(m: RealMatch) {
    const res = await likeProfile(m.userId);
    if (res.error) { toast.error(res.error); return; }
    if (res.mutual) {
      toast.success(`It's mutual with ${m.name} — a conversation is open.`);
      if (res.conversationId) navigate({ to: "/chat", search: { c: res.conversationId } as never });
    } else {
      toast.success("Interest sent. They'll see you on their side.");
    }
    setMatches((prev) => prev.filter((p) => p.userId !== m.userId));
    setActive(null);
  }

  return (
    <div className="min-h-screen">
      <UnveilNav />
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Your resonance · {profile.composite} · {ARCHETYPES[profile.archetype].name}
            </div>
            <h1 className="mt-2 font-display text-4xl font-bold">
              {loading ? "Loading minds…" : `${visible.length} ${visible.length === 1 ? "person" : "people"} to discover`}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Photos and details reveal as mutual engagement deepens. No swiping.
            </p>
          </div>
          <div className="flex gap-1 rounded-full border border-border bg-card p-1">
            <button onClick={() => setTab("all")} className={`rounded-full px-4 py-1.5 text-sm transition-colors ${tab === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              All
            </button>
            <button onClick={() => setTab("band")} className={`rounded-full px-4 py-1.5 text-sm transition-colors ${tab === "band" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              In band ±10
            </button>
          </div>
        </div>

        <MatchFilters value={filters} onChange={setFilters} />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((m) => {
            const arch = ARCHETYPES[m.archetype];
            const dist = distanceLabel(m.distanceKm);
            const cityLabel = m.locationPrivacy === "country" ? (m.country || "—")
              : m.locationPrivacy === "hidden" ? "Location hidden"
              : m.city;
            return (
              <button
                key={m.userId}
                onClick={() => setActive(m)}
                className="group text-left rounded-3xl border border-border bg-card p-5 transition-all hover:-translate-y-1 hover:border-primary hover:shadow-glow"
              >
                <div className="flex items-start justify-between">
                  <div className="relative">
                    <div style={{ filter: "blur(8px)" }}>
                      <Avatar seed={m.avatar ?? "0-180"} size={56} label={m.name} />
                    </div>
                    <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-background ring-1 ring-border">
                      <Lock className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Resonance</div>
                    <div className="font-display text-2xl font-bold text-gradient-hero">{m.composite}</div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="font-display text-lg font-bold" style={{ color: arch.hue as string }}>{arch.name}</div>
                  <div className="text-xs italic text-muted-foreground">"{arch.tagline}"</div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{cityLabel}</span>
                  <span className="inline-flex items-center gap-1"><Briefcase className="h-3 w-3" />{m.professionLabel}</span>
                </div>

                {(m.tags.length > 0 || dist) && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {dist && (
                      <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">{dist}</span>
                    )}
                    {m.tags.slice(0, 3).map((t) => (
                      <span key={t} className="rounded-full border border-border bg-surface/60 px-2 py-0.5 text-[10px] text-muted-foreground">{t}</span>
                    ))}
                  </div>
                )}

                <div className="mt-3 font-mono text-[11px] text-muted-foreground">
                  Δ {Math.abs(m.composite - profile.composite)} pts
                </div>
              </button>
            );
          })}
        </div>


        {!loading && visible.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border p-12 text-center text-muted-foreground">
            No one to discover yet. As more people complete onboarding, they'll appear here.
          </div>
        )}
      </div>

      {active && <MatchSheet match={active} you={profile} onClose={() => setActive(null)} onLike={() => handleLike(active)} />}
    </div>
  );
}

type Stage = 1 | 2 | 3;

function MatchSheet({ match, you, onClose, onLike }: { match: SynapseProfile; you: SynapseProfile; onClose: () => void; onLike: () => void }) {
  // Progressive reveal — earned, not timed.
  const [stage, setStage] = useState<Stage>(1);
  const arch = ARCHETYPES[match.archetype];
  const presence = match.presence ? PRESENCE_LABELS[match.presence] : null;
  const chem = chemistryFor(match.name + match.city);
  const matchPercent = Math.max(60, 100 - Math.abs(you.composite - match.composite) * 4);

  const blur = stage === 1 ? "blur(14px)" : stage === 2 ? "blur(4px)" : "none";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-4 backdrop-blur-md md:items-center" onClick={onClose}>
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-border bg-card shadow-glow" onClick={(e) => e.stopPropagation()}>
        {/* Aura header */}
        <div className="relative p-8 pb-6" style={{ background: `radial-gradient(120% 80% at 20% 0%, ${arch.hue} 0%, transparent 60%)` }}>
          <div className="flex items-center gap-4">
            <div style={{ filter: blur, transition: "filter 0.6s ease" }}>
              <Avatar seed={match.avatar ?? "0-180"} size={72} label={match.name} />
            </div>
            <div className="flex-1">
              <div className="font-display text-xs uppercase tracking-wider opacity-80" style={{ color: arch.hue as string }}>
                {arch.name}
              </div>
              <div className="font-display text-2xl font-bold">
                {stage >= 3 ? `${match.name}, ${match.age}` : "Identity revealed at Stage 3"}
              </div>
              <div className="text-sm text-muted-foreground">
                {stage >= 2 ? `${match.city} · ${match.professionLabel}` : "City revealed at Stage 2"}
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Resonance</div>
              <div className="font-display text-3xl font-bold text-gradient-hero">{matchPercent}%</div>
            </div>
          </div>

          {presence && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-xs">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: presence.hue }} />
              {presence.label} · <span className="text-muted-foreground">{presence.hint}</span>
            </div>
          )}
        </div>

        {/* Stage indicator */}
        <div className="flex items-center gap-3 px-8 pb-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex flex-1 items-center gap-2">
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                stage >= s ? "bg-gradient-hero text-primary-foreground" : "bg-surface-2 text-muted-foreground"
              }`}>{s}</span>
              <div className={`h-0.5 flex-1 rounded-full ${stage >= s ? "bg-gradient-hero" : "bg-surface-2"}`} />
            </div>
          ))}
        </div>

        <div className="space-y-5 p-8 pt-4">
          {stage === 1 && (
            <>
              <p className="text-sm italic text-foreground/85">"{arch.tagline}"</p>
              <p className="text-sm text-muted-foreground">{arch.essence}</p>
              <VoicePrompt label="Voice prompt · 18s" text="A small ritual that makes my day feel like mine." />
              <VoicePrompt label="Voice prompt · 22s" text="The last idea that kept me up — and why." />
            </>
          )}

          {stage === 2 && (
            <>
              <p className="text-sm italic text-foreground/85">"{match.bio}"</p>
              <div className="space-y-2">
                <ChemRing label="Conversational reciprocity" value={chem.reciprocity} />
                <ChemRing label="Humor synchronization" value={chem.humorSync} />
                <ChemRing label="Curiosity alignment" value={chem.curiosityAlign} />
                <ChemRing label="Emotional pacing" value={chem.pacing} />
              </div>
              <div className="rounded-2xl border border-border bg-surface/60 p-4 text-xs text-muted-foreground">
                <Sparkles className="mb-1 inline h-3 w-3 text-accent" /> Your conversational synchronicity is rising.
                Curiosity alignment is unusually high.
              </div>
            </>
          )}

          {stage === 3 && (
            <>
              <p className="text-sm italic text-foreground/85">"{match.bio}"</p>
              <div className="space-y-3">
                {(["warmth", "curiosity", "adventure", "loyalty", "humor", "ambition"] as const).map((k) => (
                  <CompareBar key={k} label={k} you={you.character[k]} them={match.character[k]} />
                ))}
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-neon/40 bg-neon/5 p-4 text-xs">
                <Unlock className="h-4 w-4 text-neon" />
                Intentional meetup is unlocked. Decide together when you're ready.
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-border bg-background/40 p-6">
          {stage < 3 ? (
            <button
              onClick={() => setStage((s) => (s + 1) as Stage)}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-hero py-3 font-medium text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]"
            >
              <Unlock className="h-4 w-4" />
              Engage to unlock Stage {stage + 1}
            </button>
          ) : (
            <button onClick={onLike} className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-hero py-3 font-medium text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]">
              <Heart className="h-4 w-4" /> Send interest — open conversation if mutual
            </button>
          )}
          <div className="flex gap-2">
            <button onClick={onClose} className="flex flex-1 items-center justify-center gap-2 rounded-full border border-border py-2 text-sm hover:bg-surface">
              <X className="h-4 w-4" /> Step back
            </button>
            <button className="flex flex-1 items-center justify-center gap-2 rounded-full border border-border py-2 text-sm hover:bg-surface">
              <MessageCircle className="h-4 w-4" /> Send a thought
            </button>
          </div>
          <p className="mt-1 text-center text-[11px] text-muted-foreground">
            <Eye className="mr-1 inline h-3 w-3" /> Reveals are mutual. Nothing is shared without consent.
          </p>
        </div>
      </div>
    </div>
  );
}

function VoicePrompt({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface/60 p-3">
      <button className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-hero text-primary-foreground shadow-glow">
        <Mic className="h-4 w-4" />
      </button>
      <div className="min-w-0">
        <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="truncate text-sm">{text}</div>
      </div>
    </div>
  );
}

function ChemRing({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full bg-gradient-hero" style={{ width: `${value}%` }} />
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
