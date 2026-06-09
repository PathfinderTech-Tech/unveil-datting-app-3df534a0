import { createFileRoute, useSearch, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { Swords, Sparkles, MapPin, Coffee, ArrowRight, ArrowLeft, Loader2, MessageCircle, Heart, Calendar, Lock, Users } from "lucide-react";
import { saveChallengeResult, useUserId, awardBadge } from "@/lib/games-api";
import { loadDailyChallenges, markCompleted, CHALLENGE_CATEGORIES, type ChallengeRow } from "@/lib/content-api";
import { PartnerPicker, usePartner } from "@/components/PartnerPicker";
import { supabase } from "@/integrations/supabase/client";
import { useRequireOnboarding } from "@/hooks/use-require-onboarding";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";


type SearchParams = { u?: string; cat?: string; tab?: "public" | "match" };

export const Route = createFileRoute("/challenges")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    u: typeof s.u === "string" ? s.u : undefined,
    cat: typeof s.cat === "string" ? s.cat : undefined,
    tab: s.tab === "public" || s.tab === "match" ? s.tab : undefined,
  }),
  head: () => ({ meta: [{ title: "Challenges — UNVEIL" }, { name: "description", content: "Public reflections for everyone. Couple challenges unlock with mutual matches." }] }),
  component: Challenges,
});

const CATEGORY_META: Record<string, { name: string; description: string; group: string }> = {
  would_you_rather:     { name: "Would You Rather",     description: "Hypotheticals that reveal values",  group: "chemistry" },
  this_or_that:         { name: "This or That",         description: "Quick-fire choices",                group: "chemistry" },
  guess_my_answer:      { name: "Guess My Answer",      description: "Guess what your match would pick",  group: "discovery" },
  finish_the_sentence:  { name: "Finish The Sentence",  description: "Complete the thought together",     group: "discovery" },
  red_flag_green_flag:  { name: "Red Flag / Green Flag",description: "Spot the difference",               group: "values" },
  dating_scenarios:     { name: "Dating Scenarios",     description: "What would you do?",                group: "values" },
  future_vision:        { name: "Future Vision",        description: "Picture your future together",      group: "values" },
  build_a_story:        { name: "Build A Story",        description: "Alternate sentences",               group: "creative" },
};
const GROUP_ORDER = ["chemistry", "discovery", "values", "creative"];

function Challenges() {
  const { checking } = useRequireOnboarding();
  const search = useSearch({ from: "/challenges" }) as SearchParams;
  const { partners, partnerId, setPartnerId, loading } = usePartner(search.u);

  const [active, setActive] = useState<string | null>(search.cat ?? null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [tab, setTab] = useState<"public" | "match">(search.tab ?? "public");
  const [valuesOnly, setValuesOnly] = useState(false);

  useEffect(() => {
    supabase.from("challenges").select("category").eq("active", true).then(({ data }) => {
      const c: Record<string, number> = {};
      (data ?? []).forEach((r: { category: string }) => { c[r.category] = (c[r.category] ?? 0) + 1; });
      setCounts(c);
    });
  }, []);

  const hasMatch = partners.length > 0;

  if (checking) {
    return (
      <div className="min-h-screen">
        <UnveilNav />
        <div className="mx-auto max-w-md p-12 text-center text-muted-foreground">Loading…</div>
      </div>
    );
  }



  return (
    <div className="min-h-screen">
      <UnveilNav />
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-8">
          <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Challenges</div>
          <h1 className="mt-2 font-display text-5xl font-bold">Reflect first. Connect deeper.</h1>
          <p className="mt-3 max-w-xl text-muted-foreground">Public prompts for everyone. Couple challenges unlock once you have a mutual match.</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 inline-flex rounded-full border border-border bg-card p-1">
          <button
            onClick={() => { setTab("public"); setActive(null); }}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm transition-colors ${tab === "public" ? "bg-gradient-hero text-primary-foreground shadow-glow" : "text-muted-foreground"}`}
          ><Sparkles className="h-3.5 w-3.5" /> Public</button>
          <button
            onClick={() => { setTab("match"); setActive(null); }}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm transition-colors ${tab === "match" ? "bg-gradient-aura text-primary-foreground shadow-glow" : "text-muted-foreground"}`}
          >{hasMatch ? <Users className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />} Match Challenges</button>
        </div>

        {tab === "public" ? (
          <PublicChallenges />
        ) : !hasMatch ? (
          <MatchLockedEmpty />
        ) : (
          <>
            <section className="mb-6 rounded-3xl border border-border bg-card p-6">
              <div className="mb-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Play with</div>
              {loading
                ? <div className="text-sm text-muted-foreground">Loading…</div>
                : <PartnerPicker partners={partners} value={partnerId} onChange={setPartnerId} />}
            </section>

            {active
              ? <PackRunner category={active} partnerId={partnerId} onBack={() => setActive(null)} />
              : <>
                  <div className="mb-4 flex items-center justify-between rounded-2xl border border-border bg-surface/40 p-3">
                    <div>
                      <div className="text-sm font-medium">Values-only mode</div>
                      <div className="text-xs text-muted-foreground">Show only prompts that surface what you each believe.</div>
                    </div>
                    <button
                      onClick={() => setValuesOnly((v) => !v)}
                      className={`relative h-6 w-11 rounded-full transition ${valuesOnly ? "bg-primary" : "bg-border"}`}
                      aria-pressed={valuesOnly}
                    >
                      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-background transition ${valuesOnly ? "left-[22px]" : "left-0.5"}`} />
                    </button>
                  </div>
                  <PackGrid counts={counts} onPick={setActive} valuesOnly={valuesOnly} />
                </>}
          </>
        )}
      </div>
    </div>
  );
}

function PublicChallenges() {
  const tiles = [
    { to: "/challenges/complete-picture", icon: Sparkles, title: "Complete the Picture", desc: "Choose the piece that completes the picture. 10 puzzles, 15s each.", badge: "NEW" },
    { to: "/play",   icon: Calendar,       title: "Daily Personality Questions", desc: "One thoughtful prompt a day. Builds your Discovery Profile over time." },
    { to: "/spark",  icon: MessageCircle,  title: "Icebreakers & Reflections",   desc: "Short prompts that shape your bio and unlock new conversation hooks." },
    { to: "/games",  icon: Sparkles,       title: "Solo Mind Games",             desc: "Puzzles that quietly improve your matching signal." },
    { to: "/insights", icon: Heart,        title: "Community Reflections",       desc: "See how your answers compare with the wider UNVEIL community." },
  ] as const;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {tiles.map((t) => {
        const Icon = t.icon;
        const isNew = "badge" in t && t.badge === "NEW";
        return (
          <Link key={t.to} to={t.to}
            className={`group relative rounded-3xl border bg-card p-5 text-left transition-all hover:-translate-y-1 hover:shadow-glow ${
              isNew ? "border-primary/60 ring-1 ring-primary/40" : "border-border hover:border-primary"
            }`}>
            {isNew && (
              <span className="absolute right-4 top-4 rounded-full bg-gradient-hero px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-primary-foreground shadow-glow">NEW</span>
            )}
            <Icon className="h-5 w-5 text-accent" />
            <div className="mt-4 font-display text-xl">{t.title}</div>
            <div className="mt-1 text-xs text-muted-foreground">{t.desc}</div>
            <span className="mt-4 inline-flex items-center gap-1 text-xs text-primary">Open <ArrowRight className="h-3 w-3" /></span>
          </Link>
        );
      })}
    </div>
  );
}

function MatchLockedEmpty() {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-card/40 p-10 text-center">
      <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-surface ring-1 ring-border">
        <Lock className="h-5 w-5 text-muted-foreground" />
      </div>
      <h2 className="font-display text-2xl font-bold">Match Challenges are couple-only.</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Couple compatibility, 7-day connection, Opposite Match, Values, Future Goals and Readiness challenges unlock the moment you have a mutual match.
      </p>
      <Link to="/matches" className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-hero px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow">
        Find matches <ArrowRight className="h-4 w-4" />
      </Link>
      <p className="mt-3 text-[11px] text-muted-foreground">In the meantime, the <strong>Public</strong> tab has daily questions, icebreakers and reflections.</p>
    </div>
  );
}


function PackGrid({ counts, onPick, valuesOnly }: { counts: Record<string, number>; onPick: (c: string) => void; valuesOnly?: boolean }) {
  const groups = valuesOnly ? ["values"] : GROUP_ORDER;
  return (
    <div className="space-y-8">
      {groups.map((g) => {
        const cats = CHALLENGE_CATEGORIES.filter((c) => CATEGORY_META[c]?.group === g);
        if (cats.length === 0) return null;
        return (
          <div key={g}>
            <div className="mb-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{g}</div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {cats.map((c) => {
                const m = CATEGORY_META[c];
                return (
                  <button key={c} onClick={() => onPick(c)}
                    className="group rounded-3xl border border-border bg-card p-5 text-left transition-all hover:-translate-y-1 hover:border-primary hover:shadow-glow">
                    <Swords className="h-5 w-5 text-accent" />
                    <div className="mt-4 font-display text-xl">{m.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{m.description}</div>
                    <div className="mt-4 flex items-center justify-between text-xs">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{counts[c] ?? 0} prompts</span>
                      <span className="inline-flex items-center gap-1 text-primary">Play <ArrowRight className="h-3 w-3" /></span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const REWARDS = [
  { id: "venue", icon: MapPin, label: "Winner picks the venue" },
  { id: "activity", icon: Coffee, label: "Winner picks the activity" },
  { id: "theme", icon: Sparkles, label: "Winner picks the theme" },
];
const PAYMENT_OPTIONS = ["Split the bill", "Winner pays", "Loser pays", "Alternate next time", "Decide on the night"];

function PackRunner({ category, partnerId, onBack }: { category: string; partnerId: string | null; onBack: () => void }) {
  const uid = useUserId();
  const [questions, setQuestions] = useState<ChallengeRow[] | null>(null);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [reward, setReward] = useState<string | null>(null);
  const [payment, setPayment] = useState<string | null>(null);
  const [bothAgree, setBothAgree] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { loadDailyChallenges(5, category).then(setQuestions); }, [category]);

  const allAnswered = !!questions && questions.length > 0 && questions.every((q) => picks[q.id]);

  useEffect(() => {
    if (!saved && allAnswered && reward && payment && bothAgree) {
      if (!uid) { toast.info("Sign in to save this to your passport."); setSaved(true); return; }
      const pickArray = questions!.map((q) => picks[q.id]);
      questions!.forEach((q) => markCompleted("challenge", q.id, picks[q.id]));
      saveChallengeResult({
        picks: pickArray as never,
        reward, payment, both_agree: bothAgree,
        partner_id: partnerId ?? null,
      }).then(async ({ error }) => {
        if (error) toast.error("Couldn't save", { description: error });
        else { toast.success("Challenge locked in ✨"); awardBadge("challenge-champion"); }
        setSaved(true);

        // Track per-user category progress (esp. values) and unlock milestones
        const group = CATEGORY_META[category]?.group;
        const { data: existing } = await supabase
          .from("values_challenge_progress")
          .select("completion_count")
          .eq("user_id", uid)
          .eq("category", category)
          .maybeSingle();
        const nextCount = (existing?.completion_count ?? 0) + 1;
        await supabase.from("values_challenge_progress").upsert(
          { user_id: uid, category, completion_count: nextCount, last_completed_at: new Date().toISOString() },
          { onConflict: "user_id,category" },
        );
        trackEvent("challenge_pack_completed", { category, group, count: nextCount, values_only: group === "values" });
        if (group === "values" && [3, 5, 10].includes(nextCount)) {
          trackEvent("values_milestone_unlocked", { category, milestone: nextCount });
          toast.success(`Values milestone unlocked · ${nextCount} packs`, { description: "New depth prompts opened." });
        }
      });
    }
  }, [saved, allAnswered, reward, payment, bothAgree, uid, partnerId, picks, questions, category]);


  if (!questions) return (
    <div className="space-y-4">
      <BackBtn onClick={onBack} />
      <div className="rounded-3xl border border-border bg-card p-8 text-center text-sm text-muted-foreground"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></div>
    </div>
  );
  if (questions.length === 0) return (
    <div className="space-y-4">
      <BackBtn onClick={onBack} />
      <div className="rounded-3xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">No prompts in this category yet.</div>
    </div>
  );

  const meta = CATEGORY_META[category];

  return (
    <div className="space-y-6">
      <BackBtn onClick={onBack} />

      <div className="rounded-3xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Swords className="h-4 w-4 text-accent" />
          <span className="font-display text-lg font-bold">{meta?.name ?? category}</span>
        </div>
        <div className="space-y-4">
          {questions.map((q, i) => {
            const opts = [q.option_a, q.option_b, q.option_c].filter((x): x is string => !!x && x.trim().length > 0);
            return (
              <div key={q.id} className="rounded-2xl border border-border bg-surface p-4">
                <div className="mb-2 font-mono text-xs text-muted-foreground">Question {i + 1}</div>
                <div className="mb-3 font-display text-base">{q.question}</div>
                <div className="grid gap-2 md:grid-cols-2">
                  {opts.length === 0
                    ? <input
                        value={picks[q.id] ?? ""}
                        onChange={(e) => setPicks((p) => ({ ...p, [q.id]: e.target.value }))}
                        placeholder="Type your answer…"
                        className="rounded-xl border border-border bg-card px-3 py-2 text-sm"
                      />
                    : opts.map((opt) => {
                        const active = picks[q.id] === opt;
                        return (
                          <button key={opt} onClick={() => setPicks((p) => ({ ...p, [q.id]: opt }))}
                            className={`rounded-xl border p-3 text-left text-sm transition-all ${active ? "border-primary bg-primary/10" : "border-border bg-card hover:border-foreground/30"}`}>
                            {opt}
                          </button>
                        );
                      })}
                </div>
                {picks[q.id] && q.explanation && (
                  <div className="mt-2 text-xs text-muted-foreground">{q.explanation}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {allAnswered && (
        <>
          <div className="rounded-3xl border border-border bg-card p-6">
            <div className="mb-3 font-display text-lg font-bold">Winner's reward</div>
            <div className="grid gap-3 md:grid-cols-3">
              {REWARDS.map((r) => {
                const Icon = r.icon; const active = reward === r.id;
                return (
                  <button key={r.id} onClick={() => setReward(r.id)}
                    className={`flex flex-col items-start gap-2 rounded-2xl border p-4 text-left text-sm transition-all ${active ? "border-primary bg-primary/10 shadow-glow" : "border-border bg-surface hover:border-foreground/30"}`}>
                    <Icon className="h-5 w-5 text-accent" />
                    <span className="font-display font-bold">{r.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6">
            <div className="mb-2 font-display text-lg font-bold">How do you handle the bill?</div>
            <p className="mb-4 text-xs text-muted-foreground">No one is required to pay. Both must agree.</p>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_OPTIONS.map((p) => {
                const active = payment === p;
                return (
                  <button key={p} onClick={() => setPayment(p)}
                    className={`rounded-full border px-4 py-2 text-sm transition-colors ${active ? "border-primary bg-primary/10" : "border-border bg-surface hover:border-foreground/30"}`}>
                    {p}
                  </button>
                );
              })}
            </div>
            <label className="mt-5 flex items-center gap-3 text-sm">
              <input type="checkbox" checked={bothAgree} onChange={(e) => setBothAgree(e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
              <span>We both agree to this arrangement.</span>
            </label>
          </div>

          {reward && payment && bothAgree && (
            <div className="rounded-3xl border border-neon/40 bg-neon/5 p-6">
              <div className="font-display text-xl font-bold">✨ Challenge locked in.</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Winner: <span className="font-medium text-foreground">{REWARDS.find((r) => r.id === reward)!.label.toLowerCase()}</span> · Bill: <span className="font-medium text-foreground">{payment.toLowerCase()}</span>.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-4 py-2 text-xs hover:bg-surface">
      <ArrowLeft className="h-3 w-3" /> All categories
    </button>
  );
}
