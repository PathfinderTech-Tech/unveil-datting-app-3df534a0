import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { NoMatchHub } from "@/components/NoMatchHub";
import {
  ARCHETYPES, PRESENCE_LABELS, chemistryFor,
  type SynapseProfile,
} from "@/lib/synapse-store";
import { loadRealMatches, likeProfile, passProfile, toggleSaveProfile, distanceLabel, bandLabel, type RealMatch } from "@/lib/matching-api";
import { MatchFilters, DEFAULT_FILTERS, type FilterState } from "@/components/MatchFilters";
import { Avatar } from "@/components/Avatar";
import { VeilBackdrop } from "@/components/VeilBackdrop";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRequireOnboarding } from "@/hooks/use-require-onboarding";

import { toast } from "sonner";
import {
  Heart, X, ArrowRight, MapPin, Briefcase, Mic, MessageCircle, Eye, Lock, Unlock, Sparkles, Bookmark, Info, Home, RefreshCw, Share2,
} from "lucide-react";
import { HiddenMatchCard } from "@/components/HiddenMatchCard";
import { WhyWeMatchSheet } from "@/components/WhyWeMatchSheet";
import { loadHiddenMatches, logHiddenMatchView, type HiddenMatch } from "@/lib/hidden-matches.functions";
import { useServerFn } from "@tanstack/react-start";
import { trackEvent } from "@/lib/analytics";
import { ThoughtModal } from "@/components/ThoughtModal";

export const Route = createFileRoute("/matches")({
  head: () => ({ meta: [{ title: "Your band — UNVEIL" }, { name: "description", content: "People inside your compatibility band. Connection unlocks progressively." }] }),
  component: Matches,
});

type ProfileState = {
  onboardingComplete: boolean;
  baseScore: number;
  archetype: string | null;
  archetypeName: string;
  completionPct: number;
  questionsRemaining: number;
  photosRemaining: number;
};

function Matches() {
  const { checking } = useRequireOnboarding();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [profileState, setProfileState] = useState<ProfileState | null>(null);
  const [matches, setMatches] = useState<RealMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"band" | "all">("all");
  const [mode, setMode] = useState<"your" | "hidden">("your");
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  // DB-backed gate (replaces localStorage useProfile). Onboarding completion
  // is the only requirement to enter Matches — discovery answers refine the
  // score but should never lock the page.
  useEffect(() => {
    if (authLoading || !user) return;
    let alive = true;
    (async () => {
      const [{ data }, { data: onb }] = await Promise.all([
        supabase.from("profiles")
          .select("onboarding_complete, compatibility_score, archetype, first_name, gender, country, intention, relationship_intent, photo_url, profile_photo_url")
          .eq("id", user.id).maybeSingle(),
        supabase.from("onboarding_answers")
          .select("answers").eq("user_id", user.id).maybeSingle(),
      ]);
      if (!alive) return;
      const arch = (data?.archetype ?? null) as string | null;

      // Compute resume progress for the "Finish your profile" card.
      const answers = (onb?.answers as Record<string, unknown> | null) ?? null;
      const discovery = (answers?.discovery as Record<string, unknown> | undefined) ?? {};
      const intent = data?.relationship_intent || data?.intention;
      const hasIdentity = !!data?.first_name && !!data?.gender && !!data?.country && !!intent;
      const hasConnStyle = typeof answers?.connectionStyle === "string" && !!answers.connectionStyle;
      const hasProfession = typeof answers?.profession === "string" && !!answers.profession;
      const hasPhoto = !!(data?.profile_photo_url || data?.photo_url);
      const discoveryKeys = ["pace", "energy", "conflict", "future", "intimacy", "decisions"];
      const discoveryAnswered = discoveryKeys.filter((k) => !!discovery[k]).length;
      const totalSegments = 5; // identity, connection style, photo, profession, discovery
      const doneSegments =
        (hasIdentity ? 1 : 0) + (hasConnStyle ? 1 : 0) + (hasPhoto ? 1 : 0) +
        (hasProfession ? 1 : 0) + (discoveryAnswered === discoveryKeys.length ? 1 : 0);
      const completionPct = Math.round((doneSegments / totalSegments) * 100);

      setProfileState({
        onboardingComplete: !!data?.onboarding_complete,
        baseScore: data?.compatibility_score ?? 70,
        archetype: arch,
        archetypeName: arch && (ARCHETYPES as Record<string, { name: string }>)[arch]?.name || "Your resonance",
        completionPct,
        questionsRemaining: Math.max(0, discoveryKeys.length - discoveryAnswered),
        photosRemaining: hasPhoto ? 0 : 1,
      });
    })();
    return () => { alive = false; };
  }, [user, authLoading]);

  useEffect(() => {
    if (!profileState?.onboardingComplete) return;
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
  }, [filters, profileState?.onboardingComplete]);

  const baseScore = profileState?.baseScore ?? 70;
  const visible = useMemo(() => {
    if (tab === "band") return matches.filter((m) => Math.abs(m.composite - baseScore) <= 10);
    return matches;
  }, [matches, tab, baseScore]);
  const [active, setActive] = useState<RealMatch | null>(null);
  const [thoughtFor, setThoughtFor] = useState<RealMatch | null>(null);
  const [avatarUrls, setAvatarUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const ids = visible.map((m) => m.userId).filter((id) => !(id in avatarUrls));
    if (ids.length === 0) return;
    let alive = true;
    supabase
      .from("profiles")
      .select("id, avatar_url")
      .in("id", ids)
      .then(({ data }) => {
        if (!alive || !data) return;
        setAvatarUrls((prev) => {
          const next = { ...prev };
          for (const row of data as Array<{ id: string; avatar_url: string | null }>) {
            if (row.avatar_url) next[row.id] = row.avatar_url;
          }
          return next;
        });
      });
    return () => { alive = false; };
  }, [visible]);

  if (checking || authLoading || (user && !profileState)) {
    return (
      <div className="min-h-screen">
        <UnveilNav />
        <div className="mx-auto max-w-md p-12 text-center text-muted-foreground">Loading…</div>
      </div>
    );
  }


  // Not signed in → go sign in (never to onboarding step 1).
  if (!user) {
    return (
      <div className="min-h-screen">
        <UnveilNav />
        <div className="mx-auto max-w-md p-12 text-center">
          <h1 className="font-display text-3xl font-bold">Sign in to see your matches.</h1>
          <p className="mt-2 text-muted-foreground">Your profile and matches travel with your account.</p>
          <Link to="/login" className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-hero px-6 py-3 text-primary-foreground shadow-glow">
            Log in <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  // Signed in but hasn't finished onboarding → resume onboarding.
  if (!profileState!.onboardingComplete) {
    const ps = profileState!;
    return (
      <div className="min-h-screen">
        <UnveilNav />
        <div className="mx-auto max-w-md p-12 text-center">
          <h1 className="font-display text-3xl font-bold">Continue your profile.</h1>
          <p className="mt-2 text-muted-foreground">Pick up right where you left off — nothing is lost.</p>

          <div className="mt-6 rounded-3xl border border-border bg-card p-5 text-left">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Profile completion</span>
              <span className="font-display text-lg font-bold text-gradient-hero">{ps.completionPct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-border">
              <div className="h-full bg-gradient-hero transition-all" style={{ width: `${ps.completionPct}%` }} />
            </div>
            <ul className="mt-4 space-y-1 text-xs text-muted-foreground">
              {ps.questionsRemaining > 0 && <li>· Questions remaining: <span className="text-foreground">{ps.questionsRemaining}</span></li>}
              {ps.photosRemaining > 0 && <li>· Photos remaining: <span className="text-foreground">{ps.photosRemaining}</span></li>}
              {ps.questionsRemaining === 0 && ps.photosRemaining === 0 && (
                <li>· A few final details to finish up.</li>
              )}
            </ul>
          </div>

          <Link to="/onboarding" className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-hero px-6 py-3 text-primary-foreground shadow-glow">
            Continue profile <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  // Signed in + onboarding complete but no matches yet → "Your profile is live" waiting room.
  if (!loading && visible.length === 0) {
    return (
      <div className="min-h-screen">
        <UnveilNav />
        <section className="relative mx-auto max-w-2xl overflow-hidden rounded-3xl px-6 py-16 text-center">
          <VeilBackdrop variant="center" opacity={0.08} />
          <div className="relative mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-hero text-primary-foreground shadow-glow">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="mt-5 font-display text-4xl font-light md:text-5xl">Your profile is <span className="text-gradient-aura italic">live</span>.</h1>
          <p className="mt-3 text-muted-foreground">
            We're searching for compatible connections. New people complete onboarding every day —
            you'll see them here as they arrive.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Link to="/" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-5 py-4 text-sm hover:bg-surface-2">
              <Home className="h-4 w-4" /> Return home
            </Link>
            <Link to="/discover" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-5 py-4 text-sm hover:bg-surface-2">
              <RefreshCw className="h-4 w-4" /> Refine Discovery answers
            </Link>
            <Link to="/play" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-5 py-4 text-sm hover:bg-surface-2">
              <Sparkles className="h-4 w-4" /> Play solo questions
            </Link>
            <Link to="/spark" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-5 py-4 text-sm hover:bg-surface-2">
              <MessageCircle className="h-4 w-4" /> Improve your profile
            </Link>
            <Link to="/passport" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-5 py-4 text-sm hover:bg-surface-2 sm:col-span-2">
              <Share2 className="h-4 w-4" /> View compatibility insights
            </Link>
          </div>

          <div className="mt-8 text-left">
            <NoMatchHub title="Keep building while we search" />
          </div>

          <p className="mt-8 text-xs text-muted-foreground">
            Want priority discovery? <Link to="/premium" className="text-primary underline">Upgrade to Premium</Link>.
          </p>
        </section>
      </div>
    );
  }

  // Build a synapse-shaped "me" object the MatchSheet expects.
  const profile: SynapseProfile = {
    name: "You",
    age: 0,
    city: "",
    profession: "creative",
    professionLabel: "",
    faceHarmony: 70,
    mindScore: profileState!.baseScore,
    character: { warmth: 50, curiosity: 50, adventure: 50, loyalty: 50, humor: 50, ambition: 50 },
    composite: profileState!.baseScore,
    archetype: (profileState!.archetype as SynapseProfile["archetype"]) ?? "signal",
  };

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
  async function handlePass(m: RealMatch) {
    await passProfile(m.userId);
    setMatches((prev) => prev.filter((p) => p.userId !== m.userId));
    toast("Passed.");
  }
  async function handleSave(m: RealMatch) {
    const res = await toggleSaveProfile(m.userId);
    if (res.error) { toast.error(res.error); return; }
    toast.success(res.saved ? "Saved for later." : "Removed from saved.");
  }

  return (
    <div className="min-h-screen">
      <UnveilNav />
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-6 inline-flex rounded-full border border-border bg-card p-1">
          <button
            onClick={() => setMode("your")}
            className={`rounded-full px-4 py-1.5 text-sm transition-colors ${mode === "your" ? "bg-gradient-hero text-primary-foreground shadow-glow" : "text-muted-foreground"}`}
          >Your Matches</button>
          <button
            onClick={() => setMode("hidden")}
            className={`rounded-full px-4 py-1.5 text-sm transition-colors ${mode === "hidden" ? "bg-gradient-aura text-primary-foreground shadow-glow" : "text-muted-foreground"}`}
          >Hidden Matches™</button>
        </div>

        {mode === "hidden" ? (
          <HiddenMatchesView />
        ) : (
        <>
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
            const dist = distanceLabel(m.distanceKm);
            const cityLabel = m.locationPrivacy === "country" ? (m.country || "—")
              : m.locationPrivacy === "hidden" ? "Location hidden"
              : m.city;
            const band = bandLabel(m.pairScore);
            return (
              <div
                key={m.userId}
                className="group flex flex-col rounded-3xl border border-border bg-card p-5 transition-all hover:-translate-y-1 hover:border-primary hover:shadow-glow"
              >
                <button onClick={() => setActive(m)} className="text-left">
                  <div className="flex items-start justify-between">
                    <div className="relative">
                      {avatarUrls[m.userId] ? (
                        <img
                          src={avatarUrls[m.userId]}
                          alt={`${m.name} avatar`}
                          className="h-14 w-14 rounded-full border-2 border-primary/35 object-cover shadow-glow"
                          loading="lazy"
                        />
                      ) : (
                        <div style={{ filter: "blur(8px)" }}>
                          <Avatar seed={m.avatar ?? "0-180"} size={56} label={m.name} />
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-background ring-1 ring-border">
                        <Lock className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Compatibility</div>
                      <div className="font-display text-2xl font-bold text-gradient-hero">{m.pairScore}%</div>
                      <div className={`font-mono text-[10px] uppercase tracking-wider ${band.tone}`}>{band.label}</div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{cityLabel}</span>
                    {m.age ? <span>· {m.age}</span> : null}
                    {m.verified && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">Verified</span>}
                  </div>

                  {m.strengths.length > 0 && (
                    <ul className="mt-3 space-y-1 text-xs text-foreground/85">
                      {m.strengths.slice(0, 3).map((s) => (
                        <li key={s} className="flex items-start gap-2"><Sparkles className="mt-0.5 h-3 w-3 text-accent" /> {s}</li>
                      ))}
                    </ul>
                  )}

                  {m.relationshipIntent && (
                    <div className="mt-3 text-[11px] text-muted-foreground">
                      <Briefcase className="mr-1 inline h-3 w-3" /> {m.relationshipIntent}
                    </div>
                  )}

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
                </button>

                <div className="mt-4 flex items-center gap-2">
                  <button onClick={() => handlePass(m)} aria-label="Pass" className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-surface">
                    <X className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleSave(m)} aria-label="Save" className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-surface">
                    <Bookmark className="h-4 w-4" />
                  </button>
                  <Link to="/match/$userId" params={{ userId: m.userId } as never} className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-surface" aria-label="Insights">
                    <Info className="h-4 w-4" />
                  </Link>
                  <button onClick={() => handleLike(m)} aria-label="Like" className="ml-auto flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-hero py-2 text-sm font-medium text-primary-foreground shadow-glow">
                    <Heart className="h-4 w-4" /> Like
                  </button>
                </div>
              </div>
            );
          })}
        </div>


        {!loading && visible.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border p-12 text-center text-muted-foreground">
            No one to discover yet. As more people complete onboarding, they'll appear here.
          </div>
        )}
        </>
        )}
      </div>

      {active && (
        <MatchSheet
          match={active}
          you={profile}
          onClose={() => setActive(null)}
          onLike={() => handleLike(active)}
          onThought={() => { setThoughtFor(active); setActive(null); }}
        />
      )}
      {thoughtFor && (
        <ThoughtModal
          targetUserId={thoughtFor.userId}
          targetName={thoughtFor.name}
          onClose={() => setThoughtFor(null)}
          onSent={(r) => {
            setMatches((prev) => prev.filter((p) => p.userId !== thoughtFor.userId));
            if (r.mutual && r.conversationId) {
              navigate({ to: "/chat", search: { c: r.conversationId } as never });
            }
          }}
        />
      )}
    </div>
  );
}

type Stage = 1 | 2 | 3;

function MatchSheet({ match, you, onClose, onLike, onThought }: { match: SynapseProfile; you: SynapseProfile; onClose: () => void; onLike: () => void; onThought: () => void }) {
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
            <button onClick={onThought} className="flex flex-1 items-center justify-center gap-2 rounded-full border border-border py-2 text-sm hover:bg-surface">
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

const HIDDEN_TAGLINES = [
  "Your perfect match may not be your type.",
  "Discover the connections you would normally overlook.",
  "Compatibility beyond attraction.",
];

function HiddenMatchesView() {
  const navigate = useNavigate();
  const fetchHidden = useServerFn(loadHiddenMatches);
  const logView = useServerFn(logHiddenMatchView);
  const [items, setItems] = useState<HiddenMatch[]>([]);
  const [total, setTotal] = useState(0);
  const [premium, setPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [why, setWhy] = useState<{ peerId: string; peerName: string | null } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetchHidden({ data: { limit: 24 } });
        setItems(r.matches);
        setTotal(r.total);
        setPremium(r.premium);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Couldn't load Hidden Matches");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const strongest = items.find((m) => !m.locked && m.complementaryScore >= 90);
  const tagline = HIDDEN_TAGLINES[Math.floor(Date.now() / 86_400_000) % HIDDEN_TAGLINES.length];

  async function handleLike(m: HiddenMatch) {
    const res = await likeProfile(m.id);
    if (res.error) { toast.error(res.error); return; }
    trackEvent("hidden_match_message_started", { peerId: m.id });
    await logView({ data: { peerId: m.id, kind: "message" } });
    if (res.mutual && res.conversationId) {
      toast.success(`It's mutual with ${m.firstName ?? "your match"} — opening the conversation.`);
      navigate({ to: "/chat", search: { c: res.conversationId } as never });
    } else {
      toast.success("Interest sent.");
    }
  }

  function openWhy(m: HiddenMatch) {
    setWhy({ peerId: m.id, peerName: m.firstName });
    logView({ data: { peerId: m.id, kind: "view" } }).catch(() => {});
    trackEvent("hidden_match_view", { peerId: m.id });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-accent/30 bg-gradient-to-br from-primary/15 via-accent/10 to-transparent p-6">
        <p className="font-mono text-[10px] uppercase tracking-luxury text-accent">Hidden Matches™</p>
        <h1 className="mt-2 font-display text-3xl font-light md:text-4xl">
          {loading ? "Reading your blueprint…" : `You have ${total} Hidden ${total === 1 ? "Match" : "Matches"}`}
        </h1>
        <p className="mt-1 text-sm text-foreground/80 italic">"{tagline}"</p>
        {strongest && (
          <p className="mt-3 text-sm text-muted-foreground">
            <Sparkles className="mr-1 inline h-3.5 w-3.5 text-accent" />
            One Hidden Match has a {strongest.complementaryScore}% Complementary Score.
          </p>
        )}
        {!premium && (
          <p className="mt-3 text-xs text-muted-foreground">
            Free preview shows 3 Hidden Matches. <Link to="/premium" className="text-accent underline">Unlock unlimited</Link>.
          </p>
        )}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border p-12 text-center text-muted-foreground">
          No Hidden Matches yet. As more profiles complete onboarding and you refine your blueprint, they'll appear here.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((m, idx) => (
            <HiddenMatchCard
              key={m.id}
              match={m}
              taglineSeed={idx}
              onView={() => openWhy(m)}
              onWhy={() => openWhy(m)}
              onLike={m.locked ? undefined : () => handleLike(m)}
            />
          ))}
        </div>
      )}

      {why && (
        <WhyWeMatchSheet
          peerId={why.peerId}
          peerName={why.peerName}
          onClose={() => setWhy(null)}
        />
      )}
    </div>
  );
}

