import { Sparkles } from "lucide-react";

export function BetaBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-luxury text-accent ${className}`}>
      <Sparkles className="h-3 w-3" /> Beta
    </span>
  );
}
