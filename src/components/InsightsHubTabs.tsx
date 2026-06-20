import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Flame, MessageCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getTodayBundle, saveDailyAnswer, getAnswerHistory } from "@/lib/daily.functions";
import { trackEvent, ANALYTICS } from "@/lib/analytics";
import { getBlueprint, updateBlueprint, STYLE_OPTIONS } from "@/lib/blueprint.functions";
import { ContactExchangeCountdown, ContactExchangeReadyCard } from "@/components/ContactExchangeCountdown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Merged Insights hub tabs. Originally lived in /insights — now hosted inside
 * /insights-ai so users have a single unified Relationship Intelligence Hub.
 */
export function InsightsHubTabs({ userId }: { userId: string }) {
  return (
    <Tabs defaultValue="today" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="today">Today</TabsTrigger>
        <TabsTrigger value="readiness">Readiness</TabsTrigger>
        <TabsTrigger value="blueprint">Blueprint</TabsTrigger>
        <TabsTrigger value="connection">Connection</TabsTrigger>
      </TabsList>
      <TabsContent value="today" className="mt-6"><TodayTab /></TabsContent>
      <TabsContent value="readiness" className="mt-6"><ReadinessTab userId={userId} /></TabsContent>
      <TabsContent value="blueprint" className="mt-6"><BlueprintTab /></TabsContent>
      <TabsContent value="connection" className="mt-6"><ConnectionTab userId={userId} /></TabsContent>
    </Tabs>
  );
}

function TodayTab() {
  const fetchBundle = useServerFn(getTodayBundle);
  const submit = useServerFn(saveDailyAnswer);
  const fetchHistory = useServerFn(getAnswerHistory);
  const [cards, setCards] = useState<Array<{ category: string; question: any; answer: string | null }>>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const [b, h] = await Promise.all([fetchBundle({}), fetchHistory({})]);
    setCards(b.cards as any);
    setHistory(h.history);
  }
  useEffect(() => { load(); }, []);

  async function pick(qid: string, answer: string, category: string) {
    setBusy(qid);
    try {
      const r = await submit({ data: { questionId: qid, answer } });
      toast.success(`Saved. Readiness: ${r.score ?? "—"}`);
      trackEvent(ANALYTICS.dailyAnswerSubmitted, { category, answer });
      if (category === "challenge") trackEvent(ANALYTICS.challengeCompleted, { qid });
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(null);
    }
  }

  const streak = useMemo(() => {
    if (!history.length) return 0;
    const days = Array.from(new Set(history.map((h) => h.day_key)));
    days.sort((a, b) => (a < b ? 1 : -1));
    let s = 0;
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    for (let i = 0; i < days.length; i++) {
      const d = new Date(days[i] + "T00:00:00Z");
      const exp = new Date(today); exp.setUTCDate(today.getUTCDate() - i);
      if (d.getTime() === exp.getTime()) s++;
      else break;
    }
    return s;
  }, [history]);

  const answeredCount = cards.filter((c) => c.answer).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface/40 p-4">
          <Flame className="h-5 w-5 text-primary" aria-hidden />
          <div>
            <p className="text-sm text-muted-foreground">Daily streak</p>
            <p className="text-xl font-semibold">{streak} day{streak === 1 ? "" : "s"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface/40 p-4">
          <Sparkles className="h-5 w-5 text-primary" aria-hidden />
          <div>
            <p className="text-sm text-muted-foreground">Today's progress</p>
            <p className="text-xl font-semibold">{answeredCount} of {cards.length}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <div key={c.category} className="rounded-2xl border border-border bg-surface/40 p-5">
            <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
              {c.category}
            </span>
            {c.question ? (
              <>
                <h2 className="mt-3 text-base font-medium">{c.question.prompt}</h2>
                {c.answer ? (
                  <div className="mt-3 rounded-xl border border-primary/30 bg-primary/10 p-3">
                    <p className="text-xs text-muted-foreground">Your answer</p>
                    <p className="mt-0.5 text-sm font-medium">{c.answer}</p>
                  </div>
                ) : (
                  <div className="mt-3 grid gap-2">
                    {(c.question.options as string[]).map((opt) => (
                      <button
                        key={opt}
                        disabled={busy === c.question.id}
                        onClick={() => pick(c.question.id, opt, c.category)}
                        className="rounded-xl border border-border bg-background/60 px-3 py-2 text-left text-sm transition-colors hover:border-primary hover:bg-primary/10 disabled:opacity-50"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">No prompt today.</p>
            )}
          </div>
        ))}
      </div>

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
    { key: "emotional_intelligence", label: "Emotional intelligence" },
    { key: "commitment", label: "Commitment readiness" },
    { key: "goals", label: "Relationship goals" },
    { key: "values", label: "Values alignment" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center rounded-2xl border border-border bg-surface/40 p-8">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">Relationship readiness</p>
        <div className="relative mt-3 flex h-40 w-40 items-center justify-center">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r="45" fill="none" stroke="var(--border)" strokeWidth="8" />
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
                <stop offset="0%" stopColor="var(--primary)" />
                <stop offset="100%" stopColor="var(--accent)" />
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
    { key: "leadership_style", title: "Leadership", subtitle: "How you take initiative" },
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

function ConnectionTab({ userId }: { userId: string }) {
  const [matches, setMatches] = useState<any[]>([]);
  const [convByPeer, setConvByPeer] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data }, { data: convs }] = await Promise.all([
        supabase
          .from("matches")
          .select("id, user_id, matched_user_id, mutual_interest, created_at")
          .eq("mutual_interest", true),
        supabase.from("conversations").select("id, user_a, user_b"),
      ]);
      const list = data ?? [];
      const peerIds = list.map((m: any) => (m.user_id === userId ? m.matched_user_id : m.user_id));
      const { data: profs } = peerIds.length
        ? await (supabase as any).rpc("get_public_match_profiles", { _targets: peerIds })
        : { data: [] as any[] };
      const profMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
      const convMap: Record<string, string> = {};
      for (const c of (convs ?? []) as any[]) {
        const peer = c.user_a === userId ? c.user_b : c.user_a;
        convMap[peer] = c.id;
      }
      const enriched = list.map((m: any) => {
        const peerId = m.user_id === userId ? m.matched_user_id : m.user_id;
        return { ...m, peerId, peer: profMap.get(peerId) };
      });
      setMatches(enriched);
      setConvByPeer(convMap);
      if (enriched.length && !selected) setSelected(enriched[0].id);
    })();
  }, [userId]);

  if (!matches.length) {
    return (
      <p className="text-muted-foreground">
        When you have mutual matches, your 7-Day Contact Exchange Journey will appear here.
      </p>
    );
  }

  const active = matches.find((m) => m.id === selected);
  const activeConvId = active ? convByPeer[active.peerId] : undefined;
  const day = active?.created_at
    ? Math.max(1, Math.min(7, Math.floor((Date.now() - new Date(active.created_at).getTime()) / 86_400_000) + 1))
    : 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {matches.map((m) => {
          const convId = convByPeer[m.peerId];
          const isSelected = selected === m.id;
          return (
            <div
              key={m.id}
              className={`flex items-center gap-1 rounded-full border ${
                isSelected ? "border-primary bg-primary/15" : "border-border bg-background/60"
              }`}
            >
              <button
                onClick={() => setSelected(m.id)}
                className={`rounded-full px-3 py-1.5 text-sm ${
                  isSelected ? "text-primary font-medium" : "text-foreground"
                }`}
              >
                {m.peer?.first_name ?? "Match"}
              </button>
              {convId && (
                <Link
                  to="/chat"
                  search={{ c: convId }}
                  aria-label={`Open chat with ${m.peer?.first_name ?? "match"}`}
                  className="mr-1 inline-flex items-center gap-1 rounded-full bg-gradient-hero px-2.5 py-1 text-[11px] font-semibold text-primary-foreground shadow-glow"
                >
                  <MessageCircle className="h-3 w-3" aria-hidden />
                  Open Chat
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {selected && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-border bg-surface/40 p-4">
            {active?.peer?.first_name && activeConvId && (
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  Your journey with {active.peer.first_name}
                </p>
                <Link
                  to="/chat"
                  search={{ c: activeConvId }}
                  className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
                >
                  <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                  Open Chat
                </Link>
              </div>
            )}
            <ContactExchangeCountdown day={day} />
            <p className="mt-3 text-xs text-muted-foreground">
              Photos and full profiles unlock after 10 messages + 1 voice note from each side. Real conversation comes before full visibility.
              The 7-day countdown only unlocks the option to exchange phone, email, or social handles.
            </p>
          </div>
          {day >= 7 && <ContactExchangeReadyCard eligible />}
        </div>
      )}
    </div>
  );
}
