import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { Lock, Sparkles, X, CheckCircle2, BookOpen, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";

/**
 * Day 1–4 Structured Conversation Scaffolding for a mutual match thread.
 * Renders above the chat input. On Day 5+ collapses to a thin "View our journey" archive link.
 * Does NOT mutate any existing chat/messages behavior — the consumer decides whether to
 * disable the chat input based on `onChatGateChange(enabled)`.
 */

const PROMPT_LABELS = [
  "The thing I value most in a relationship is...",
  "A typical Sunday for me looks like...",
  "Something most people don't know about me...",
] as const;

const PROMPT_PLACEHOLDERS = [
  "Honesty and emotional safety...",
  "Long walks, slow coffee, and a good book...",
  "I secretly love...",
] as const;

const DAY3_PROMPT = "If your life had a mission statement, what would it say?";

type Props = {
  matchId: string;
  matchCreatedAt: string;
  selfId: string;
  peerId: string;
  peerName: string;
  /** Called whenever the gate state (whether free chat input should be enabled) changes. */
  onChatGateChange?: (enabled: boolean, placeholder?: string) => void;
};

type IntroRow = { user_id: string; prompt_1: string | null; prompt_2: string | null; prompt_3: string | null };
type Day3Row = { user_id: string; answer: string; created_at: string };

function dayOf(createdAt: string): number {
  const ms = Date.now() - new Date(createdAt).getTime();
  return Math.max(1, Math.floor(ms / 86_400_000) + 1);
}

export function ConversationScaffold({
  matchId,
  matchCreatedAt,
  selfId,
  peerId,
  peerName,
  onChatGateChange,
}: Props) {
  const day = useMemo(() => dayOf(matchCreatedAt), [matchCreatedAt]);
  const [intros, setIntros] = useState<IntroRow[]>([]);
  const [day3, setDay3] = useState<Day3Row[]>([]);
  const [day4Dismissed, setDay4Dismissed] = useState<boolean>(() =>
    typeof window !== "undefined" && localStorage.getItem(`unveil:scaffold-day4:${matchId}`) === "1"
  );
  const [archiveOpen, setArchiveOpen] = useState(false);

  // Load shared state
  useEffect(() => {
    let alive = true;
    (async () => {
      const [{ data: ip }, { data: d3 }] = await Promise.all([
        supabase.from("match_intro_prompts").select("user_id, prompt_1, prompt_2, prompt_3").eq("match_id", matchId),
        supabase.from("match_day3_answers").select("user_id, answer, created_at").eq("match_id", matchId),
      ]);
      if (!alive) return;
      setIntros((ip ?? []) as IntroRow[]);
      setDay3((d3 ?? []) as Day3Row[]);
    })();

    const ch = supabase
      .channel(`scaffold-${matchId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "match_intro_prompts", filter: `match_id=eq.${matchId}` },
        (p) => setIntros((cur) => mergeRow(cur, p.new as IntroRow)))
      .on("postgres_changes", { event: "*", schema: "public", table: "match_day3_answers", filter: `match_id=eq.${matchId}` },
        (p) => setDay3((cur) => mergeRow(cur, p.new as Day3Row)))
      .subscribe();

    return () => { alive = false; supabase.removeChannel(ch); };
  }, [matchId]);

  const selfIntro = intros.find((r) => r.user_id === selfId);
  const peerIntro = intros.find((r) => r.user_id === peerId);
  const selfDay3 = day3.find((r) => r.user_id === selfId);
  const peerDay3 = day3.find((r) => r.user_id === peerId);
  const bothDay3 = !!selfDay3 && !!peerDay3;

  // Gate logic: chat input is enabled on Day 4+, OR on Day 3 once both answered the challenge.
  const chatEnabled = day >= 4 || (day === 3 && bothDay3);
  useEffect(() => {
    const placeholder = day < 4 && !bothDay3
      ? day === 3
        ? "Free chat unlocks once you both answer today's challenge"
        : "Free chat unlocks on Day 4 — get to know each other through prompts first"
      : undefined;
    onChatGateChange?.(chatEnabled, placeholder);
  }, [chatEnabled, day, bothDay3, onChatGateChange]);

  // Day 5+: just the archive link
  if (day >= 5) {
    return (
      <div className="border-b border-border bg-surface/30 px-4 py-2">
        <button onClick={() => setArchiveOpen(true)} className="text-xs text-muted-foreground underline-offset-2 hover:underline">
          View our journey →
        </button>
        {archiveOpen && (
          <ArchiveModal
            onClose={() => setArchiveOpen(false)}
            intros={intros}
            day3={day3}
            selfId={selfId}
            peerName={peerName}
          />
        )}
      </div>
    );
  }

  return (
    <div className="border-b border-border bg-surface/30 p-4">
      <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-luxury text-muted-foreground">
        <Sparkles className="h-3 w-3 text-accent" />
        Day {day} of your slow reveal
      </div>

      {day === 1 && (
        <Day1
          matchId={matchId}
          selfId={selfId}
          peerName={peerName}
          selfIntro={selfIntro}
          peerIntro={peerIntro}
        />
      )}

      {day === 2 && (
        <Day2 selfId={selfId} matchId={matchId} peerId={peerId} peerName={peerName} />
      )}

      {day === 3 && (
        <Day3
          matchId={matchId}
          selfId={selfId}
          peerName={peerName}
          selfDay3={selfDay3}
          peerDay3={peerDay3}
        />
      )}

      {day === 4 && !day4Dismissed && (
        <div className="relative rounded-2xl border border-border bg-card p-4 pr-10 text-sm text-foreground/85">
          You've spent 3 days getting to know each other through prompts and voice. The conversation is yours now.
          <button
            onClick={() => {
              localStorage.setItem(`unveil:scaffold-day4:${matchId}`, "1");
              setDay4Dismissed(true);
            }}
            className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-surface"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function mergeRow<T extends { user_id: string }>(cur: T[], next: T): T[] {
  const without = cur.filter((r) => r.user_id !== next.user_id);
  return [...without, next];
}

/* ───────────────── Day 1 ───────────────── */

function Day1({
  matchId,
  selfId,
  peerName,
  selfIntro,
  peerIntro,
}: {
  matchId: string;
  selfId: string;
  peerName: string;
  selfIntro?: IntroRow;
  peerIntro?: IntroRow;
}) {
  const [vals, setVals] = useState<[string, string, string]>(["", "", ""]);
  const [busy, setBusy] = useState(false);
  const submitted = !!selfIntro;

  const canSubmit = vals.every((v) => v.trim().length >= 10);

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    const { error } = await supabase.from("match_intro_prompts").insert({
      match_id: matchId,
      user_id: selfId,
      prompt_1: vals[0].trim().slice(0, 120),
      prompt_2: vals[1].trim().slice(0, 120),
      prompt_3: vals[2].trim().slice(0, 120),
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Your answers are shared.");
  }

  return (
    <div className="space-y-4">
      {/* Their card */}
      <div>
        <div className="mb-1.5 font-mono text-[10px] uppercase tracking-luxury text-muted-foreground">Who they are</div>
        <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
          {PROMPT_LABELS.map((label, i) => {
            const key = `prompt_${i + 1}` as keyof IntroRow;
            const answer = peerIntro?.[key] as string | null | undefined;
            return (
              <div key={i}>
                <div className="text-[11px] text-muted-foreground">{label}</div>
                <div className={`mt-0.5 text-sm ${answer ? "text-foreground" : "italic text-muted-foreground/70"}`}>
                  {answer ?? `${peerName} hasn't answered this yet.`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Your card */}
      <div>
        <div className="mb-1.5 font-mono text-[10px] uppercase tracking-luxury text-muted-foreground">
          {submitted ? "What you shared" : `Your turn — ${peerName} will see this`}
        </div>
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
          {PROMPT_LABELS.map((label, i) => {
            const key = `prompt_${i + 1}` as keyof IntroRow;
            const answer = submitted ? (selfIntro?.[key] as string | null | undefined) : null;
            const val = vals[i];
            const remaining = 120 - val.length;
            return (
              <div key={i}>
                <label className="text-[11px] text-muted-foreground">{label}</label>
                {submitted ? (
                  <div className="mt-0.5 text-sm">{answer}</div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={val}
                      maxLength={120}
                      onChange={(e) => {
                        const next = [...vals] as [string, string, string];
                        next[i] = e.target.value;
                        setVals(next);
                      }}
                      placeholder={PROMPT_PLACEHOLDERS[i]}
                      className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-[13px] outline-none placeholder:italic placeholder:text-muted-foreground/70 focus:border-primary"
                    />
                    {val.length >= 80 && (
                      <div className="mt-1 text-[11px] text-muted-foreground">{remaining} left</div>
                    )}
                  </>
                )}
              </div>
            );
          })}
          {!submitted && (
            <button
              onClick={submit}
              disabled={!canSubmit || busy}
              className="w-full rounded-full bg-gradient-hero py-2.5 text-[15px] font-semibold text-primary-foreground shadow-glow disabled:opacity-50"
            >
              Share my answers →
            </button>
          )}
          {submitted && (
            <div className="inline-flex items-center gap-1.5 text-xs text-accent">
              <CheckCircle2 className="h-3.5 w-3.5" /> Shared. {peerName} will see them when they open this conversation.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────────── Day 2 ───────────────── */

function Day2({ selfId, matchId, peerName }: { selfId: string; matchId: string; peerId: string; peerName: string }) {
  // Use existing VoiceRecorder, scoped by a match-keyed prompt so storage is per-match.
  const promptKey = `Match ${matchId} · Day 2 voice intro — What does a meaningful relationship mean to you?`;
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="text-[13px] text-foreground/85">
          Record a 60-second voice note answering:{" "}
          <span className="font-medium">What does a meaningful relationship mean to you?</span>
        </div>
        <div className="mt-1 text-[11px] italic text-muted-foreground">
          {peerName} will hear it. You'll hear theirs.
        </div>
      </div>
      <VoiceRecorder userId={selfId} prompt={promptKey} />
    </div>
  );
}

/* ───────────────── Day 3 ───────────────── */

function Day3({
  matchId,
  selfId,
  peerName,
  selfDay3,
  peerDay3,
}: {
  matchId: string;
  selfId: string;
  peerName: string;
  selfDay3?: Day3Row;
  peerDay3?: Day3Row;
}) {
  const [val, setVal] = useState("");
  const [busy, setBusy] = useState(false);
  const locked = !!selfDay3;
  const revealed = !!selfDay3 && !!peerDay3;

  async function submit() {
    if (val.trim().length < 20) return;
    setBusy(true);
    const { error } = await supabase.from("match_day3_answers").insert({
      match_id: matchId,
      user_id: selfId,
      answer: val.trim().slice(0, 200),
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Your answer is locked in.");
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="text-[17px] font-semibold leading-snug">{DAY3_PROMPT}</div>
        <div className="mt-1 text-[13px] text-muted-foreground">
          You both answer independently. Your answers reveal at the same time.
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">~2 minutes</div>
      </div>

      {!locked && (
        <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
          <textarea
            rows={4}
            value={val}
            maxLength={200}
            onChange={(e) => setVal(e.target.value)}
            placeholder="My life is about..."
            className="w-full resize-none rounded-xl border border-border bg-surface px-3 py-2 text-[13px] outline-none placeholder:italic placeholder:text-muted-foreground/70 focus:border-primary"
          />
          {val.length >= 150 && (
            <div className="text-[11px] text-muted-foreground">{200 - val.length} left</div>
          )}
          <button
            onClick={submit}
            disabled={val.trim().length < 20 || busy}
            className="w-full rounded-full bg-gradient-hero py-2.5 text-[15px] font-semibold text-primary-foreground shadow-glow disabled:opacity-50"
          >
            Lock in my answer →
          </button>
        </div>
      )}

      {locked && !revealed && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> Sealed. Waiting for {peerName} to answer…
          </div>
        </div>
      )}

      {revealed && (
        <div className="grid gap-3 sm:grid-cols-2 animate-in fade-in duration-300">
          <RevealCard label="You" body={selfDay3!.answer} />
          <RevealCard label={peerName} body={peerDay3!.answer} />
          <div className="sm:col-span-2 text-center text-[13px] italic text-muted-foreground">
            What do you notice? Free chat is open — keep going below.
          </div>
        </div>
      )}
    </div>
  );
}

function RevealCard({ label, body }: { label: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="font-mono text-[10px] uppercase tracking-luxury text-muted-foreground">{label}</div>
      <div className="mt-1 text-[14px] leading-snug text-foreground">{body}</div>
    </div>
  );
}

/* ───────────────── Archive (Day 5+) ───────────────── */

function ArchiveModal({
  onClose,
  intros,
  day3,
  selfId,
  peerName,
}: {
  onClose: () => void;
  intros: IntroRow[];
  day3: Day3Row[];
  selfId: string;
  peerName: string;
}) {
  const self = intros.find((r) => r.user_id === selfId);
  const peer = intros.find((r) => r.user_id !== selfId);
  const selfD3 = day3.find((r) => r.user_id === selfId);
  const peerD3 = day3.find((r) => r.user_id !== selfId);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-glow">
        <div className="mb-4 flex items-center justify-between">
          <div className="font-display text-lg font-bold">Your journey so far</div>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-surface"><X className="h-4 w-4" /></button>
        </div>

        <Section title="Day 1 · Mutual prompts">
          <PromptList label={peerName} row={peer} />
          <PromptList label="You" row={self} />
        </Section>

        <Section title="Day 3 · Shared challenge">
          <div className="text-[12px] text-muted-foreground">{DAY3_PROMPT}</div>
          {peerD3 && <div className="mt-2 text-[13px]"><b>{peerName}:</b> {peerD3.answer}</div>}
          {selfD3 && <div className="mt-1 text-[13px]"><b>You:</b> {selfD3.answer}</div>}
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-luxury text-muted-foreground">{title}</div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function PromptList({ label, row }: { label: string; row?: IntroRow }) {
  if (!row) return <div className="text-[12px] italic text-muted-foreground">{label} didn't share answers.</div>;
  return (
    <div className="rounded-2xl border border-border bg-surface/40 p-3 text-[13px]">
      <div className="font-mono text-[10px] uppercase text-muted-foreground">{label}</div>
      {PROMPT_LABELS.map((lbl, i) => {
        const key = `prompt_${i + 1}` as keyof IntroRow;
        const v = row[key] as string | null;
        return v ? (
          <div key={i} className="mt-1.5">
            <div className="text-[11px] text-muted-foreground">{lbl}</div>
            <div>{v}</div>
          </div>
        ) : null;
      })}
    </div>
  );
}
