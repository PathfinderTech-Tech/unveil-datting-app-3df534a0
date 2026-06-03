import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { DISCOVER_SECTIONS, type DiscoverAnswers } from "@/lib/discover-sections";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ArrowRight, SkipForward, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/discover")({
  head: () => ({ meta: [
    { title: "Discover Yourself — UNVEIL" },
    { name: "description", content: "A guided psychology-driven journey that builds your Compatibility Profile." },
  ] }),
  component: Discover,
});

const STORAGE_KEY = "unveil-discover-v1";

function Discover() {
  const navigate = useNavigate();
  const [sectionIdx, setSectionIdx] = useState(0);
  const [answers, setAnswers] = useState<DiscoverAnswers>({});
  const [saving, setSaving] = useState(false);

  // Hydrate from local + DB
  useEffect(() => {
    const local = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (local) {
      try { setAnswers(JSON.parse(local)); } catch { /* noop */ }
    }
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("onboarding_answers")
        .select("answers").eq("user_id", user.id).maybeSingle();
      const remote = (data?.answers as { discover?: DiscoverAnswers } | undefined)?.discover;
      if (remote && Object.keys(remote).length) setAnswers((a) => ({ ...remote, ...a }));
    })();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
  }, [answers]);

  const section = DISCOVER_SECTIONS[sectionIdx];
  const total = DISCOVER_SECTIONS.length;
  const progress = Math.round(((sectionIdx + 1) / total) * 100);
  const sectionComplete = useMemo(
    () => section.questions.every((q) => {
      const v = answers[q.id];
      if (q.type === "multi") return Array.isArray(v) && v.length > 0;
      return v !== undefined && v !== "";
    }),
    [section, answers]
  );

  function setOne(qid: string, v: string | string[] | number) {
    setAnswers((prev) => ({ ...prev, [qid]: v }));
  }

  function toggleMulti(qid: string, choice: string, max = 4) {
    setAnswers((prev) => {
      const cur = Array.isArray(prev[qid]) ? (prev[qid] as string[]) : [];
      const next = cur.includes(choice)
        ? cur.filter((c) => c !== choice)
        : [...cur, choice].slice(-max);
      return { ...prev, [qid]: next };
    });
  }

  async function persist(complete: boolean) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSaving(true);
    try {
      const { data: existing } = await supabase.from("onboarding_answers")
        .select("answers").eq("user_id", user.id).maybeSingle();
      const merged = { ...(existing?.answers as object ?? {}), discover: answers };
      await supabase.from("onboarding_answers").upsert(
        { user_id: user.id, answers: merged }, { onConflict: "user_id" }
      );
      if (complete) {
        await supabase.from("profiles").update({
          onboarding_complete: true,
          relationship_intent: (answers.intent as string) ?? null,
          intention: (answers.intent as string) ?? null,
        }).eq("id", user.id);
      }
    } finally {
      setSaving(false);
    }
  }

  async function goNext() {
    await persist(false);
    if (sectionIdx < total - 1) {
      setSectionIdx((i) => i + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      await persist(true);
      toast.success("Compatibility profile generated ✨");
      navigate({ to: "/discover-summary" });
    }
  }
  function goBack() {
    if (sectionIdx > 0) {
      setSectionIdx((i) => i - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }
  async function skip() {
    await persist(false);
    if (sectionIdx < total - 1) setSectionIdx((i) => i + 1);
    else navigate({ to: "/discover-summary" });
  }

  return (
    <div className="min-h-screen">
      <UnveilNav />
      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-8">
          <div className="flex items-center justify-between font-mono text-xs uppercase tracking-wider text-muted-foreground">
            <span>Phase 1 — Discover Yourself</span>
            <span>Section {sectionIdx + 1} of {total}</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border">
            <div className="h-full bg-gradient-hero transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <header className="mb-8">
          <h1 className="font-display text-4xl font-bold">{section.title}</h1>
          <p className="mt-2 text-muted-foreground">{section.blurb}</p>
        </header>

        <div className="space-y-6">
          {section.questions.map((q) => (
            <div key={q.id} className="rounded-3xl border border-border bg-card p-6">
              <div className="mb-4 font-display text-lg">{q.prompt}</div>

              {q.type === "single" && (
                <div className="grid gap-2 md:grid-cols-2">
                  {q.choices!.map((c) => {
                    const active = answers[q.id] === c.id;
                    return (
                      <button key={c.id} type="button" onClick={() => setOne(q.id, c.id)}
                        className={`rounded-2xl border p-3 text-left text-sm transition-all ${
                          active ? "border-primary bg-primary/10 shadow-glow" : "border-border bg-surface hover:border-foreground/30"
                        }`}>
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {q.type === "multi" && (
                <div className="flex flex-wrap gap-2">
                  {q.choices!.map((c) => {
                    const arr = Array.isArray(answers[q.id]) ? (answers[q.id] as string[]) : [];
                    const active = arr.includes(c.id);
                    return (
                      <button key={c.id} type="button" onClick={() => toggleMulti(q.id, c.id)}
                        className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                          active ? "border-primary bg-primary/15 text-foreground" : "border-border bg-surface text-muted-foreground hover:text-foreground"
                        }`}>
                        {active && <Check className="mr-1 inline h-3 w-3" />}{c.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {q.type === "scale" && (
                <div>
                  <input
                    type="range" min={1} max={10} step={1}
                    value={(answers[q.id] as number) ?? 5}
                    onChange={(e) => setOne(q.id, Number(e.target.value))}
                    className="w-full accent-[var(--primary)]"
                  />
                  <div className="mt-1 flex justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    <span>{q.scaleMinLabel}</span>
                    <span>{(answers[q.id] as number) ?? 5}/10</span>
                    <span>{q.scaleMaxLabel}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer nav */}
        <div className="mt-10 flex items-center justify-between gap-3 border-t border-border pt-6">
          <button onClick={goBack} disabled={sectionIdx === 0}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm disabled:opacity-40">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <button onClick={skip}
            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs text-muted-foreground hover:text-foreground">
            <SkipForward className="h-3 w-3" /> Skip section
          </button>

          <button onClick={goNext} disabled={saving || (!sectionComplete && sectionIdx < total - 1)}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100">
            {sectionIdx === total - 1 ? "Generate profile" : "Next"}
            {sectionIdx === total - 1 ? <Sparkles className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
          </button>
        </div>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/onboarding" className="underline">Need to update basics first?</Link>
        </div>
      </div>
    </div>
  );
}
