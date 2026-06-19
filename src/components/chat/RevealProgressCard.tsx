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
 * Flagship Reveal Progress Card — sits directly below the conversation header.
 *
 * Visual language: deep-glass card with purple→magenta→gold gradient progress
 * bar, three vertical stat columns, and a "more to reveal" badge.
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
      <div className="mx-3 mt-3 mb-2 overflow-hidden rounded-3xl border border-[oklch(0.80_0.14_68/0.35)] bg-gradient-to-br from-[oklch(0.18_0.08_300/0.85)] via-[oklch(0.20_0.10_330/0.75)] to-[oklch(0.20_0.10_60/0.55)] p-4 backdrop-blur-2xl shadow-[0_10px_40px_-12px_oklch(0.65_0.20_328/0.45)]">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[oklch(0.80_0.14_68)] to-[oklch(0.65_0.20_328)] shadow-[0_0_24px_oklch(0.80_0.14_68/0.6)]">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold tracking-tight text-foreground">Veil lifted</p>
            <p className="mt-0.5 text-[12px] text-foreground/65">You've earned the full picture of each other.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-3 mt-3 mb-2 overflow-hidden rounded-3xl border border-[oklch(0.56_0.22_286/0.25)] bg-[oklch(0.13_0.05_298/0.72)] p-4 backdrop-blur-2xl shadow-[0_10px_40px_-12px_oklch(0.56_0.22_286/0.35)]">
      {/* Ambient nebula glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-px rounded-3xl opacity-60"
        style={{
          background:
            "radial-gradient(60% 80% at 0% 0%, oklch(0.61 0.22 304 / 0.18), transparent 60%), radial-gradient(50% 70% at 100% 100%, oklch(0.80 0.14 68 / 0.12), transparent 60%)",
        }}
      />

      <div className="relative flex items-start gap-3">
        {/* Heart-lock icon */}
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[oklch(0.65_0.20_328/0.4)] bg-gradient-to-br from-[oklch(0.61_0.22_304/0.35)] to-[oklch(0.65_0.20_328/0.25)] shadow-[inset_0_1px_0_oklch(1_0_0/0.08),0_0_24px_oklch(0.65_0.20_328/0.35)]">
          <Sparkles className="h-5 w-5 text-[oklch(0.85_0.10_328)]" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[14px] font-semibold tracking-tight text-foreground">Reveal Progress</h3>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/55">
              {remainingInteractions > 0 ? `${remainingInteractions} more to reveal` : "Ready to reveal"}
            </span>
          </div>

          <p className="mt-0.5 text-[12px] text-foreground/70">
            <span className="font-semibold text-foreground">{messagesExchanged} of {messagesRequired}</span>{" "}
            messages exchanged
          </p>

          {/* Progress bar — purple→pink→gold */}
          <div className="relative mt-2.5 h-1.5 overflow-hidden rounded-full bg-[oklch(0.18_0.05_298/0.7)]">
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out"
              style={{
                width: `${Math.max(6, progress)}%`,
                background:
                  "linear-gradient(90deg, oklch(0.56 0.22 286), oklch(0.65 0.20 328), oklch(0.80 0.14 68))",
                boxShadow: "0 0 12px oklch(0.65 0.20 328 / 0.55)",
              }}
            />
          </div>

          {/* Mini-stats row */}
          <div className="mt-3 flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[11px] text-foreground/65">
              <Mic className={`h-3.5 w-3.5 ${voiceNoteSent ? "text-[oklch(0.80_0.14_68)]" : "text-foreground/55"}`} />
              <span>
                {voiceNoteRequired && !voiceNoteSent
                  ? "1 voice note required"
                  : voiceNoteSent
                  ? "Voice note delivered"
                  : "Voice note optional"}
              </span>
            </div>
            <span className="text-foreground/25">·</span>
            <div className="flex items-center gap-1.5 text-[11px] text-foreground/65">
              <Gift className="h-3.5 w-3.5 text-[oklch(0.65_0.20_328)]" />
              <span>Gifts deepen the reveal</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
