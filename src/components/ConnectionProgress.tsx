import type { RevealState } from "@/lib/reveal";
import { Check, Mic, Lock as LockIcon } from "lucide-react";

/**
 * Inline status strip shown in the chat thread until both unlock
 * requirements are met:
 *   - 10 meaningful interactions (text or voice)
 *   - each user has sent ≥ 1 voice note
 */
export function ConnectionProgress({
  state,
  peerName,
}: {
  state: RevealState;
  peerName?: string | null;
}) {
  if (state.loading || state.veilLifted) return null;

  const meaningful = Math.min(state.meaningful, 10);
  const pct = (meaningful / 10) * 100;
  const youVoice = state.voiceMe >= 1;
  const themVoice = state.voicePeer >= 1;

  return (
    <div className="border-t border-border/30 bg-surface/30 px-4 py-2.5 sm:px-5">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-luxury text-muted-foreground">
          <LockIcon className="h-2.5 w-2.5" /> Connection
        </span>
        <span className="font-mono text-[11px] font-semibold text-primary">
          {meaningful} / 10
        </span>
        <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-surface/80">
          <div
            className="h-full rounded-full bg-gradient-hero transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Mic className="h-3 w-3" /> Voice notes
        </span>
        <span className={`inline-flex items-center gap-1 ${youVoice ? "text-accent" : ""}`}>
          You {youVoice ? <Check className="h-3 w-3" /> : "—"}
        </span>
        <span className={`inline-flex items-center gap-1 ${themVoice ? "text-accent" : ""}`}>
          {peerName ?? "Them"} {themVoice ? <Check className="h-3 w-3" /> : "—"}
        </span>
        <span className="ml-auto italic">Keep talking to unlock the reveal.</span>
      </div>
    </div>
  );
}

/**
 * Post-reveal momentum strip: 3 active days + 1 shared activity → Date Mode.
 */
export function DateReadinessProgress({ state }: { state: RevealState }) {
  if (state.loading || !state.veilLifted || state.dateUnlocked) return null;
  const day = Math.min(state.activeDays, 3);
  const ch = Math.min(state.sharedActivities, 1);
  return (
    <div className="border-t border-border/30 bg-surface/30 px-4 py-2 text-[11px] text-muted-foreground sm:px-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-mono text-[10px] uppercase tracking-luxury">Conversation Journey</span>
        <span className="font-mono text-[11px] font-semibold text-primary">Day {day} / 3</span>
        <span className="font-mono text-[10px] uppercase tracking-luxury">Challenge</span>
        <span className="font-mono text-[11px] font-semibold text-primary">{ch} / 1</span>
      </div>
    </div>
  );
}
