import { Sparkles, Mic, Gift } from "lucide-react";

type Props = {
  messagesExchanged: number;
  messagesRequired: number;
  voiceNoteSent: boolean;
  voiceNoteRequired: boolean;
  remainingInteractions: number;
  veilLifted: boolean;
};

/**
 * Compact reveal progress card — restrained glow, mobile-first.
 */
export function RevealProgressCard({
  messagesExchanged,
  messagesRequired,
  voiceNoteSent,
  voiceNoteRequired,
  remainingInteractions,
  veilLifted,
}: Props) {
  const progress = Math.min(100, Math.round((messagesExchanged / Math.max(1, messagesRequired)) * 100));

  if (veilLifted) {
    return (
      <div className="mx-3 mt-2 mb-1.5 flex items-center gap-2.5 rounded-2xl border border-[oklch(0.80_0.14_68/0.25)] bg-[oklch(0.16_0.06_320/0.5)] px-3 py-2 backdrop-blur-xl">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[oklch(0.80_0.14_68)] to-[oklch(0.65_0.20_328)]">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-tight text-foreground">Veil lifted</p>
          <p className="truncate text-[11px] leading-tight text-foreground/60">You've earned the full picture.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-3 mt-2 mb-1.5 rounded-2xl border border-[oklch(0.56_0.22_286/0.18)] bg-[oklch(0.13_0.05_298/0.5)] px-3 py-2 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-[oklch(0.78_0.12_328)]" />
          <h3 className="truncate text-[12.5px] font-semibold tracking-tight text-foreground">Reveal progress</h3>
        </div>
        <span className="shrink-0 font-mono text-[9.5px] uppercase tracking-[0.14em] text-foreground/55">
          {remainingInteractions > 0 ? `${remainingInteractions} to go` : "Ready"}
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative mt-1.5 h-1 overflow-hidden rounded-full bg-[oklch(0.18_0.05_298/0.6)]">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out"
          style={{
            width: `${Math.max(6, progress)}%`,
            background:
              "linear-gradient(90deg, oklch(0.56 0.22 286), oklch(0.65 0.20 328), oklch(0.80 0.14 68))",
          }}
        />
      </div>

      <div className="mt-1.5 flex items-center gap-2 text-[10.5px] text-foreground/60">
        <span className="font-medium text-foreground/75">{messagesExchanged}/{messagesRequired} msgs</span>
        <span className="text-foreground/25">·</span>
        <span className="flex items-center gap-1">
          <Mic className={`h-3 w-3 ${voiceNoteSent ? "text-[oklch(0.80_0.14_68)]" : "text-foreground/50"}`} />
          {voiceNoteRequired && !voiceNoteSent ? "voice needed" : voiceNoteSent ? "voice sent" : "voice optional"}
        </span>
        <span className="text-foreground/25">·</span>
        <span className="flex items-center gap-1">
          <Gift className="h-3 w-3 text-[oklch(0.65_0.20_328)]" /> gifts deepen
        </span>
      </div>
    </div>
  );
}
