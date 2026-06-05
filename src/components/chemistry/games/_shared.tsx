export function SkipButton({ onSkip }: { onSkip: () => void }) {
  return (
    <div className="pt-2 text-center">
      <button
        onClick={onSkip}
        className="rounded-full border px-4 py-1.5 text-xs"
        style={{ color: "#7A7876", borderColor: "#2A2A2E" }}
      >
        Skip this game
      </button>
    </div>
  );
}

export function GameHeader({ step, total, title }: { step: number; total: number; title: string }) {
  return (
    <div className="text-center">
      <div className="font-mono text-[10px] uppercase tracking-wider" style={{ color: "#7A7876" }}>
        {title} · {step} / {total}
      </div>
    </div>
  );
}
