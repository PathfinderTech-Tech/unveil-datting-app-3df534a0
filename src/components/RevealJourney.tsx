import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Lock, Sparkles, Mic, Brain, Heart, Target, ImageIcon, Video, User } from "lucide-react";
import { advanceReveal, getRevealProgress, REVEAL_STAGES } from "@/lib/reveal.functions";
import { trackEvent, ANALYTICS } from "@/lib/analytics";
import { toast } from "sonner";

const STAGE_ICONS = [Mic, Brain, Heart, Target, ImageIcon, Video, User];

function fmtCountdown(ms: number): string {
  if (ms <= 0) return "Available now";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

export function RevealJourney({ matchId, peerName }: { matchId: string; peerName?: string | null }) {
  const fetchProg = useServerFn(getRevealProgress);
  const advance = useServerFn(advanceReveal);
  const [currentDay, setCurrentDay] = useState(0);
  const [history, setHistory] = useState<Array<{ day: number; unlocked_at: string; user_id: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  async function refresh() {
    const r = await fetchProg({ data: { matchId } });
    setCurrentDay(r.currentDay);
    setHistory(r.history as any);
  }

  useEffect(() => { refresh(); }, [matchId]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Find the user's last unlock for countdown
  const mine = history.filter((h) => true).sort((a, b) =>
    new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime()
  );
  const last = mine[0];
  const lastTs = last ? new Date(last.unlocked_at).getTime() : null;
  const nextAvailableAt = lastTs ? lastTs + 20 * 60 * 60 * 1000 : now;
  const canUnlock = currentDay < 7 && (!lastTs || nextAvailableAt <= now);

  async function unlock() {
    setBusy(true);
    try {
      const r = await advance({ data: { matchId } });
      if (!r.ok) toast.error(r.reason ?? "Not yet");
      else {
        toast.success(`Day ${r.day} unlocked${peerName ? ` with ${peerName}` : ""}`);
        trackEvent(ANALYTICS.revealUnlocked, { matchId, day: r.day });
        await refresh();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-surface/40 p-4">
        <div className="flex items-center justify-between gap-3 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Progress</p>
            <p className="text-base font-medium">Day {currentDay} of 7</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Next reveal</p>
            <p className="text-base font-medium">{canUnlock ? "Available now" : fmtCountdown(nextAvailableAt - now)}</p>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-border">
          <div
            className="h-full bg-gradient-hero transition-all duration-700"
            style={{ width: `${(currentDay / 7) * 100}%` }}
          />
        </div>
      </div>

      <ol className="grid gap-3 md:grid-cols-2">
        {REVEAL_STAGES.map((stage, idx) => {
          const unlocked = currentDay >= stage.day;
          const isNext = !unlocked && stage.day === currentDay + 1;
          const Icon = STAGE_ICONS[idx] ?? Sparkles;
          return (
            <li
              key={stage.day}
              className={[
                "relative flex items-start gap-4 rounded-2xl border p-4 transition-all",
                unlocked
                  ? "border-primary/40 bg-primary/5 animate-in fade-in slide-in-from-bottom-2"
                  : isNext && canUnlock
                    ? "border-accent/50 bg-accent/5 ring-2 ring-accent/40 ring-offset-2 ring-offset-background animate-pulse"
                    : "border-border bg-surface/40 opacity-80",
              ].join(" ")}
            >
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                  unlocked ? "bg-gradient-hero text-primary-foreground shadow-glow" : "bg-border text-muted-foreground"
                }`}
              >
                {unlocked ? <Icon className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Day {stage.day}</span>
                  {unlocked && <Check className="h-3 w-3 text-primary" />}
                  {isNext && canUnlock && (
                    <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-medium text-accent">Ready</span>
                  )}
                </div>
                <p className="mt-0.5 font-medium">{stage.title}</p>
                <p className="text-sm text-muted-foreground">{stage.subtitle}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={unlock}
          disabled={busy || !canUnlock}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-transform enabled:hover:scale-105 disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" />
          {currentDay >= 7 ? "All revealed" : canUnlock ? `Unlock Day ${currentDay + 1}` : "Locked"}
        </button>
        {!canUnlock && currentDay < 7 && (
          <p className="text-xs text-muted-foreground">Reveals open every 20 hours.</p>
        )}
      </div>
    </div>
  );
}
