import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { setSponsorPreference, type RevealState } from "@/lib/reveal";
import { useEntitlements } from "@/hooks/use-entitlements";

const OPTIONS: Array<{ id: "sponsor" | "split" | "decide_together"; label: string }> = [
  { id: "sponsor", label: "I'll Sponsor" },
  { id: "split", label: "Split the Bill" },
  { id: "decide_together", label: "Decide Together" },
];

/**
 * Date Mode panel — appears once both veil + journey requirements are met.
 * Sponsor preference is a stored preference only (no payment processing).
 */
export function DateReadinessPanel({
  peerUserId,
  peerName,
  state,
}: {
  peerUserId: string;
  peerName?: string | null;
  state: RevealState;
}) {
  const { isPremium } = useEntitlements();
  const [pref, setPref] = useState(state.sponsorPreference);
  const [busy, setBusy] = useState(false);

  if (!state.dateUnlocked) return null;

  async function pick(id: "sponsor" | "split" | "decide_together") {
    setBusy(true);
    try {
      await setSponsorPreference(peerUserId, id);
      setPref(id);
      toast.success("Preference saved");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save preference");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-3xl border border-primary/20 bg-card p-6 shadow-glow">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
        <Sparkles className="h-3.5 w-3.5" /> Ready to meet?
      </div>
      <p className="mt-2 text-sm text-foreground/80">
        You and {peerName ?? "your match"} have built real momentum. Pick a date vibe — your
        choice stays private until you both align.
      </p>

      {isPremium ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {OPTIONS.map((o) => (
            <button
              key={o.id}
              disabled={busy}
              onClick={() => pick(o.id)}
              className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
                pref === o.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface/60 text-foreground hover:bg-surface"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          Sponsor preferences are a Premium feature.
        </p>
      )}
    </div>
  );
}
