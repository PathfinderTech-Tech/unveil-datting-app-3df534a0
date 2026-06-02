import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { Swords, Sparkles, MapPin, Coffee, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { saveChallengeResult, useUserId, awardBadge } from "@/lib/games-api";
import { loadDailyChallenges, markCompleted, CHALLENGE_CATEGORIES, type ChallengeRow } from "@/lib/content-api";
import { PartnerPicker, usePartner } from "@/components/PartnerPicker";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type SearchParams = { u?: string; cat?: string };

export const Route = createFileRoute("/challenges")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    u: typeof s.u === "string" ? s.u : undefined,
    cat: typeof s.cat === "string" ? s.cat : undefined,
  }),
  head: () => ({ meta: [{ title: "Challenges — UNVEIL" }, { name: "description", content: "Playful 2-player packs that spark chemistry before the date." }] }),
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
  const search = useSearch({ from: "/challenges" }) as SearchParams;
  const { partners, partnerId, setPartnerId, loading } = usePartner(search.u);
  const [active, setActive] = useState<string | null>(search.cat ?? null);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    supabase.from("challenges").select("category").eq("active", true).then(({ data }) => {
      const c: Record<string, number> = {};
      (data ?? []).forEach((r: { category: string }) => { c[r.category] = (c[r.category] ?? 0) + 1; });
      setCounts(c);
    });
  }, []);

  return (
    <div className="min-h-screen">
      <UnveilNav />
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-8">
          <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Challenge Before The Date</div>
          <h1 className="mt-2 font-display text-5xl font-bold">Play first. Meet second.</h1>
          <p className="mt-3 max-w-xl text-muted-foreground">Two-player packs that build chemistry — then a tiny ritual to settle the first date.</p>
        </div>

        <section className="mb-6 rounded-3xl border border-border bg-card p-6">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Play with</div>
          {loading
            ? <div className="text-sm text-muted-foreground">Loading…</div>
            : <PartnerPicker partners={partners} value={partnerId} onChange={setPartnerId} />}
          {partners.length === 0 && (
            <p className="mt-3 text-xs text-muted-foreground">You can still preview a pack — your picks will save once you have a mutual match.</p>
          )}
        </section>

        {active
          ? <PackRunner category={active} partnerId={partnerId} onBack={() => setActive(null)} />
          : <PackGrid counts={counts} onPick={setActive} />}
      </div>
    </div>
  );
}

function PackGrid({ counts, onPick }: { counts: Record<string, number>; onPick: (c: string) => void }) {
  return (
    <div className="space-y-8">
      {GROUP_ORDER.map((g) => {
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
      }).then(({ error }) => {
        if (error) toast.error("Couldn't save", { description: error });
        else { toast.success("Challenge locked in ✨"); awardBadge("challenge-champion"); }
        setSaved(true);
      });
    }
  }, [saved, allAnswered, reward, payment, bothAgree, uid, partnerId, picks, questions]);

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
