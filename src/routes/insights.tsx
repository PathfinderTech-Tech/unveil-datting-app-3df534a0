import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { getTodayBundle, saveDailyAnswer, getAnswerHistory } from "@/lib/daily.functions";
import { trackEvent, ANALYTICS } from "@/lib/analytics";
import { getBlueprint, updateBlueprint, STYLE_OPTIONS } from "@/lib/blueprint.functions";
import { getRevealProgress, advanceReveal, REVEAL_STAGES } from "@/lib/reveal.functions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Lock, Flame, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "Insights — UNVEIL" },
      { name: "description", content: "Daily compatibility, readiness score, personality blueprint, and reveal journey." },
    ],
  }),
  component: InsightsPage,
});

function InsightsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <UnveilNav />
        <div className="p-8 text-muted-foreground">Loading…</div>
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-0">
      <UnveilNav />
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Insights</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your relationship intelligence dashboard.</p>
        </header>
        <Tabs defaultValue="today" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="readiness">Readiness</TabsTrigger>
            <TabsTrigger value="blueprint">Blueprint</TabsTrigger>
            <TabsTrigger value="reveal">Reveal</TabsTrigger>
          </TabsList>
          <TabsContent value="today" className="mt-6"><TodayTab /></TabsContent>
          <TabsContent value="readiness" className="mt-6"><ReadinessTab userId={user.id} /></TabsContent>
          <TabsContent value="blueprint" className="mt-6"><BlueprintTab /></TabsContent>
          <TabsContent value="reveal" className="mt-6"><RevealTab userId={user.id} /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

/* ---------------- Today ---------------- */
function TodayTab() {
  const fetchToday = useServerFn(getTodayQuestion);
  const submit = useServerFn(saveDailyAnswer);
  const fetchHistory = useServerFn(getAnswerHistory);
  const [data, setData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    const [t, h] = await Promise.all([fetchToday({}), fetchHistory({})]);
    setData(t);
    setHistory(h.history);
  }
  useEffect(() => { load(); }, []);

  async function pick(answer: string) {
    if (!data?.question) return;
    setBusy(true);
    try {
      const r = await submit({ data: { questionId: data.question.id, answer } });
      toast.success(`Saved. Readiness: ${r.score ?? "—"}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  const streak = useMemo(() => {
    if (!history.length) return 0;
    let s = 0;
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    for (let i = 0; i < history.length; i++) {
      const d = new Date(history[i].day_key + "T00:00:00Z");
      const exp = new Date(today); exp.setUTCDate(today.getUTCDate() - i);
      if (d.getTime() === exp.getTime()) s++;
      else break;
    }
    return s;
  }, [history]);

  if (!data) return <p className="text-muted-foreground">Loading…</p>;

  const q = data.question;
  const answered = data.answered;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface/40 p-4">
        <Flame className="h-5 w-5 text-primary" aria-hidden />
        <div>
          <p className="text-sm text-muted-foreground">Daily streak</p>
          <p className="text-xl font-semibold">{streak} day{streak === 1 ? "" : "s"}</p>
        </div>
      </div>

      {q && (
        <div className="rounded-2xl border border-border bg-surface/40 p-6">
          <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
            {q.category}
          </span>
          <h2 className="mt-3 text-xl font-medium">{q.prompt}</h2>
          {answered ? (
            <div className="mt-4 rounded-xl border border-primary/30 bg-primary/10 p-4">
              <p className="text-sm text-muted-foreground">Your answer today</p>
              <p className="mt-1 font-medium">{answered.answer}</p>
            </div>
          ) : (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {(q.options as string[]).map((opt) => (
                <button
                  key={opt}
                  disabled={busy}
                  onClick={() => pick(opt)}
                  className="rounded-xl border border-border bg-background/60 px-4 py-3 text-left text-sm transition-colors hover:border-primary hover:bg-primary/10 disabled:opacity-50"
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">Recent answers</h3>
          <ul className="space-y-2">
            {history.slice(0, 7).map((h) => (
              <li key={h.id} className="rounded-xl border border-border bg-surface/30 p-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{h.daily_questions?.category}</span>
                  <span>{h.day_key}</span>
                </div>
                <p className="mt-1 text-sm">{h.daily_questions?.prompt}</p>
                <p className="mt-1 text-sm font-medium">→ {h.answer}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ---------------- Readiness ---------------- */
function ReadinessTab({ userId }: { userId: string }) {
  const [score, setScore] = useState<number>(0);
  const [breakdown, setBreakdown] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      await supabase.rpc("compute_readiness_score", { _uid: userId });
      const { data } = await supabase
        .from("profiles")
        .select("readiness_score, readiness_breakdown")
        .eq("id", userId)
        .maybeSingle();
      setScore(data?.readiness_score ?? 0);
      setBreakdown((data?.readiness_breakdown as Record<string, number>) ?? {});
    })();
  }, [userId]);

  const buckets: { key: string; label: string }[] = [
    { key: "communication", label: "Communication" },
    { key: "commitment", label: "Commitment" },
    { key: "emotional", label: "Emotional maturity" },
    { key: "values", label: "Values" },
    { key: "goals", label: "Life goals" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center rounded-2xl border border-border bg-surface/40 p-8">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">Relationship readiness</p>
        <div className="relative mt-3 flex h-40 w-40 items-center justify-center">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="url(#g1)"
              strokeWidth="8"
              strokeDasharray={`${(score / 100) * 282.7} 282.7`}
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="g1" x1="0" x2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" />
                <stop offset="100%" stopColor="hsl(var(--accent, var(--primary)))" />
              </linearGradient>
            </defs>
          </svg>
          <span className="absolute text-4xl font-semibold">{score}</span>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">out of 100</p>
      </div>

      <div className="space-y-3">
        {buckets.map((b) => {
          const v = breakdown[b.key] ?? 0;
          return (
            <div key={b.key}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span>{b.label}</span>
                <span className="text-muted-foreground">{v}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-border">
                <div className="h-full bg-gradient-hero" style={{ width: `${Math.max(0, Math.min(100, v))}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Your score grows as you complete daily questions, refine your blueprint, and clarify your goals during onboarding.
      </p>
    </div>
  );
}

/* ---------------- Blueprint ---------------- */
function BlueprintTab() {
  const fetchBp = useServerFn(getBlueprint);
  const saveBp = useServerFn(updateBlueprint);
  const [bp, setBp] = useState<Record<string, string | null>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await fetchBp({ data: {} });
      setBp(((r.blueprint as Record<string, string | null>) ?? {}));
    })();
  }, []);

  async function update(key: keyof typeof STYLE_OPTIONS, value: string) {
    setBusy(true);
    try {
      await saveBp({ data: { [key]: value } as any });
      setBp((s) => ({ ...s, [key]: value }));
      toast.success("Saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  const fields: { key: keyof typeof STYLE_OPTIONS; title: string; subtitle: string }[] = [
    { key: "communication_style", title: "Communication", subtitle: "How you express and listen" },
    { key: "attachment_style", title: "Attachment", subtitle: "How you bond" },
    { key: "conflict_style", title: "Conflict", subtitle: "How you navigate friction" },
    { key: "relationship_style", title: "Relationship", subtitle: "The partnership you want" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((f) => (
        <div key={f.key} className="rounded-2xl border border-border bg-surface/40 p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{f.title}</p>
          <p className="text-xs text-muted-foreground/70">{f.subtitle}</p>
          <p className="mt-2 text-lg font-medium">
            {bp[f.key] ?? <span className="text-muted-foreground">Not set</span>}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {STYLE_OPTIONS[f.key].map((opt) => (
              <button
                key={opt}
                disabled={busy}
                onClick={() => update(f.key, opt)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  bp[f.key] === opt
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-background/60 hover:border-primary hover:text-foreground"
                } disabled:opacity-50`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Reveal ---------------- */
function RevealTab({ userId }: { userId: string }) {
  const [matches, setMatches] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ currentDay: number } | null>(null);
  const fetchProg = useServerFn(getRevealProgress);
  const advance = useServerFn(advanceReveal);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("matches")
        .select("id, user_id, matched_user_id, mutual_interest")
        .eq("mutual_interest", true);
      const list = data ?? [];
      // Enrich with peer name
      const peerIds = list.map((m: any) => (m.user_id === userId ? m.matched_user_id : m.user_id));
      const { data: profs } = peerIds.length
        ? await supabase.from("profiles").select("id, first_name, photo_url, avatar_url").in("id", peerIds)
        : { data: [] as any[] };
      const profMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
      const enriched = list.map((m: any) => {
        const peerId = m.user_id === userId ? m.matched_user_id : m.user_id;
        return { ...m, peer: profMap.get(peerId) };
      });
      setMatches(enriched);
      if (enriched.length && !selected) setSelected(enriched[0].id);
    })();
  }, [userId]);

  useEffect(() => {
    if (!selected) return;
    (async () => {
      const r = await fetchProg({ data: { matchId: selected } });
      setProgress({ currentDay: r.currentDay });
    })();
  }, [selected]);

  async function unlock() {
    if (!selected) return;
    try {
      const r = await advance({ data: { matchId: selected } });
      if (!r.ok) {
        toast.error(r.reason ?? "Could not unlock");
      } else {
        toast.success(`Day ${r.day} unlocked`);
        const refreshed = await fetchProg({ data: { matchId: selected } });
        setProgress({ currentDay: refreshed.currentDay });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  if (!matches.length) {
    return <p className="text-muted-foreground">When you have mutual matches, your 7-day reveal journeys appear here.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {matches.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelected(m.id)}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              selected === m.id ? "border-primary bg-primary/15 text-primary" : "border-border bg-background/60"
            }`}
          >
            {m.peer?.first_name ?? "Match"}
          </button>
        ))}
      </div>

      <ol className="space-y-3">
        {REVEAL_STAGES.map((stage) => {
          const unlocked = (progress?.currentDay ?? 0) >= stage.day;
          return (
            <li
              key={stage.day}
              className={`flex items-start gap-4 rounded-2xl border p-4 ${
                unlocked ? "border-primary/40 bg-primary/5" : "border-border bg-surface/40"
              }`}
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                unlocked ? "bg-gradient-hero text-primary-foreground" : "bg-border text-muted-foreground"
              }`}>
                {unlocked ? <Check className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">Day {stage.day}</span>
                  {unlocked && <Sparkles className="h-3.5 w-3.5 text-primary" />}
                </div>
                <p className="font-medium">{stage.title}</p>
                <p className="text-sm text-muted-foreground">{stage.subtitle}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <button
        onClick={unlock}
        disabled={(progress?.currentDay ?? 0) >= 7}
        className="w-full rounded-full bg-gradient-hero px-5 py-3 text-sm font-medium text-primary-foreground shadow-glow transition-transform hover:scale-[1.01] disabled:opacity-50"
      >
        {(progress?.currentDay ?? 0) >= 7 ? "Journey complete" : `Unlock Day ${(progress?.currentDay ?? 0) + 1}`}
      </button>
    </div>
  );
}
