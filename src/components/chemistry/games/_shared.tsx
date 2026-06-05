export function SkipButton({ onSkip }: { onSkip: () => void }) {
  return (
    <div className="pt-2 text-center">
      <button
        onClick={onSkip}
        className="rounded-full border border-border px-4 py-1.5 text-xs text-muted-foreground hover:border-primary/40 hover:text-primary"
      >
        Skip this game
      </button>
    </div>
  );
}

export function GameHeader({ step, total, title }: { step: number; total: number; title: string }) {
  return (
    <div className="text-center">
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {title} · {step} / {total}
      </div>
    </div>
  );
}
