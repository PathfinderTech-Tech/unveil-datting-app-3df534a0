import { useCallback, useEffect, useState } from "react";
import { Eye, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Status = {
  mutual: boolean;
  you_verified: boolean;
  they_verified: boolean;
  you_consented: boolean;
  they_consented: boolean;
  unlocked: boolean;
  peer_photo_url: string | null;
};

export function PhotoRevealPanel({
  peerUserId,
  peerName,
}: {
  peerUserId: string;
  peerName?: string | null;
}) {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_photo_reveal_status", {
      _match_user: peerUserId,
    });
    if (error) return;
    const row = Array.isArray(data) ? (data as any[])[0] : data;
    if (row) setStatus(row as Status);
  }, [peerUserId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!status) return null;
  if (!status.mutual) return null;

  async function optIn() {
    setBusy(true);
    const { data, error } = await supabase.rpc("consent_photo_reveal", {
      _match_user: peerUserId,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message.replace(/^.*:\s*/, ""));
      return;
    }
    const row = Array.isArray(data) ? (data as any[])[0] : data;
    if (row?.unlocked) toast.success("Photos revealed — you both opted in.");
    else toast.success("Opt-in saved. Waiting for them to opt in too.");
    refresh();
  }

  const verifiedOk = status.you_verified && status.they_verified;

  return (
    <div className="rounded-3xl border border-primary/20 bg-card p-6 shadow-glow">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
        {status.unlocked ? <Eye className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
        Photo reveal
      </div>

      {status.unlocked && status.peer_photo_url ? (
        <div className="mt-3 flex items-start gap-4">
          <img
            src={status.peer_photo_url}
            alt={`${peerName ?? "Match"} photo`}
            className="h-28 w-28 rounded-2xl object-cover border border-primary/30"
          />
          <div className="text-sm text-foreground/85">
            <div className="font-display text-lg">Photo unlocked</div>
            <p className="mt-1 text-muted-foreground">
              You and {peerName ?? "your match"} both opted in. Treat this with care.
            </p>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm text-foreground/80">
            UNVEIL keeps photos private until <span className="font-medium">both</span> of you opt in.
          </p>
          <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
            <li className="flex items-center gap-2">
              <ShieldCheck className={`h-3.5 w-3.5 ${verifiedOk ? "text-accent" : "text-muted-foreground/60"}`} />
              Both profiles verified {verifiedOk ? "✓" : "—"}
            </li>
            <li className="flex items-center gap-2">
              <Sparkles className={`h-3.5 w-3.5 ${status.you_consented ? "text-accent" : "text-muted-foreground/60"}`} />
              You opted in {status.you_consented ? "✓" : "—"}
            </li>
            <li className="flex items-center gap-2">
              <Sparkles className={`h-3.5 w-3.5 ${status.they_consented ? "text-accent" : "text-muted-foreground/60"}`} />
              {peerName ?? "They"} opted in {status.they_consented ? "✓" : "—"}
            </li>
          </ul>

          <button
            disabled={busy || status.you_consented || !verifiedOk}
            onClick={optIn}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-hero px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow disabled:opacity-60"
          >
            <Eye className="h-4 w-4" />
            {status.you_consented
              ? status.they_consented
                ? "Unlocked"
                : "Waiting for them"
              : verifiedOk
                ? "Reveal my photo"
                : "Verification required"}
          </button>
        </>
      )}
    </div>
  );
}
