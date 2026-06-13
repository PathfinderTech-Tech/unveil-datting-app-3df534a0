import { useCallback, useEffect, useState } from "react";
import { Lock, Sparkles, ShieldCheck, Phone, Link as LinkIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ContactExchangeReadyCard } from "@/components/ContactExchangeCountdown";

type Status = {
  mutual: boolean;
  bothVerified: boolean;
  eligible: boolean; // server-side can_share_contacts result
  youConsented: boolean;
  theyConsented: boolean;
  shareUnlocked: boolean;
};

/**
 * Contact Exchange panel — the reward at the end of the 7-Day Contact
 * Exchange Journey. Photos are NEVER gated here (the veil lifts after
 * the first meaningful message). This screen only governs the exchange
 * of real-world contact info (phone, email, social handles).
 *
 * Eligibility (enforced by DB function `can_share_contacts`):
 *   mutual match  AND  both verified  AND  (>=7 days OR either is premium)
 */
export function ContactRevealPanel({
  peerUserId,
  peerName,
}: {
  peerUserId: string;
  peerName?: string | null;
}) {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Find the two match rows in either direction.
    const { data: matchRows } = await supabase
      .from("matches")
      .select("user_id, matched_user_id, mutual_interest, share_user_consent, share_unlocked")
      .or(
        `and(user_id.eq.${user.id},matched_user_id.eq.${peerUserId}),and(user_id.eq.${peerUserId},matched_user_id.eq.${user.id})`
      );

    const mine = matchRows?.find((r) => r.user_id === user.id);
    const theirs = matchRows?.find((r) => r.user_id === peerUserId);
    const mutual = !!(mine?.mutual_interest || theirs?.mutual_interest);

    // Server-authoritative eligibility check (verified + mutual + 7d-or-premium).
    const { data: eligible } = await (supabase as any).rpc("can_share_contacts", {
      _a: user.id,
      _b: peerUserId,
    });

    // Verification of both sides — use the privacy-safe peer RPC.
    const { data: profs } = await (supabase as any)
      .rpc("get_public_match_profiles", { _targets: [user.id, peerUserId] });
    const list = (profs ?? []) as Array<{ id: string; verified: boolean | null }>;
    const meV = !!list.find((p) => p.id === user.id)?.verified;
    const peerV = !!list.find((p) => p.id === peerUserId)?.verified;

    setStatus({
      mutual,
      bothVerified: meV && peerV,
      eligible: !!eligible,
      youConsented: !!mine?.share_user_consent,
      theyConsented: !!theirs?.share_user_consent,
      shareUnlocked: !!(mine?.share_unlocked || theirs?.share_unlocked),
    });
  }, [peerUserId]);

  useEffect(() => { refresh(); }, [refresh]);

  if (!status) return null;
  if (!status.mutual) return null;

  async function optIn() {
    setBusy(true);
    const { data, error } = await (supabase as any).rpc("consent_share_contact", {
      _match_user: peerUserId,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message.replace(/^.*:\s*/, ""));
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.unlocked) toast.success("Contact sharing unlocked — you both opted in.");
    else toast.success("Opt-in saved. Waiting for them to opt in too.");
    refresh();
  }

  return (
    <div className="space-y-4">
      {status.eligible && <ContactExchangeReadyCard eligible />}
      <div className="rounded-3xl border border-primary/20 bg-card p-6 shadow-glow">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
          {status.shareUnlocked ? <LinkIcon className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
          Contact sharing
        </div>

      {status.shareUnlocked ? (
        <div className="mt-3">
          <div className="font-display text-lg">Contact sharing unlocked</div>
          <p className="mt-1 text-sm text-muted-foreground">
            You and {peerName ?? "your match"} can now exchange phone, email, and social handles.
            Treat this with care.
          </p>
          <Link
            to="/contact-share"
            search={{ with: peerUserId } as any}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-hero px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow"
          >
            <Phone className="h-4 w-4" />
            Open contact sharing
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm text-foreground/80">
            Direct contact unlocks once you've built trust together — and both of you opt in.
          </p>
          <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
            <li className="flex items-center gap-2">
              <ShieldCheck className={`h-3.5 w-3.5 ${status.bothVerified ? "text-accent" : "text-muted-foreground/60"}`} />
              Both profiles verified {status.bothVerified ? "✓" : "—"}
            </li>
            <li className="flex items-center gap-2">
              <Sparkles className={`h-3.5 w-3.5 ${status.eligible ? "text-accent" : "text-muted-foreground/60"}`} />
              7-Day Contact Exchange Journey complete (or Premium fast-track) {status.eligible ? "✓" : "—"}
            </li>
            <li className="flex items-center gap-2">
              <Sparkles className={`h-3.5 w-3.5 ${status.youConsented ? "text-accent" : "text-muted-foreground/60"}`} />
              You opted in {status.youConsented ? "✓" : "—"}
            </li>
            <li className="flex items-center gap-2">
              <Sparkles className={`h-3.5 w-3.5 ${status.theyConsented ? "text-accent" : "text-muted-foreground/60"}`} />
              {peerName ?? "They"} opted in {status.theyConsented ? "✓" : "—"}
            </li>
          </ul>

          {!status.eligible && (
            <p className="mt-3 text-xs text-muted-foreground">
              Contact sharing becomes available after both members complete verification and finish the 7-day journey together.
              <span className="ml-1 text-primary">Premium members can accelerate meaningful connections.</span>
            </p>
          )}

          <button
            disabled={busy || status.youConsented || !status.eligible}
            onClick={optIn}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-hero px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow disabled:opacity-60"
          >
            <Phone className="h-4 w-4" />
            {status.youConsented
              ? status.theyConsented
                ? "Unlocked"
                : "Waiting for them"
              : status.eligible
                ? "Opt in to share contacts"
                : "Locked"}
          </button>
        </>
      )}
      </div>
    </div>
  );
}

