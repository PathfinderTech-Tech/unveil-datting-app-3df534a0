import { useEffect, useState } from "react";
import { Plane, X, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { endTravelMode } from "@/lib/travel-mode.functions";
import { TravelVerifyModal } from "@/components/TravelVerifyModal";

type TravelState = {
  home_country_code: string | null;
  home_country_name: string | null;
  home_city: string | null;
  current_country_code: string | null;
  current_country_name: string | null;
  current_city: string | null;
  travel_status: string | null;
  travel_verified_at: string | null;
  travel_expires_at: string | null;
  travel_warning_count: number | null;
  account_restricted: boolean | null;
};

export function TravelModeToggle() {
  const { user } = useAuth();
  const [state, setState] = useState<TravelState | null>(null);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const endTravelFn = useServerFn(endTravelMode);

  async function load() {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("home_country_code, home_country_name, home_city, current_country_code, current_country_name, current_city, travel_status, travel_verified_at, travel_expires_at, travel_warning_count, account_restricted")
      .eq("id", user.id)
      .maybeSingle();
    setState(data as TravelState | null);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user?.id]);

  if (!state) return null;
  const travelling = state.travel_status === "travelling";
  const expired = !!state.travel_expires_at && new Date(state.travel_expires_at) < new Date();
  const expiresAt = state.travel_expires_at ? new Date(state.travel_expires_at) : null;

  async function stopTravel() {
    setBusy(true);
    try {
      await endTravelFn();
      if (user) {
        await supabase.from("profiles").update({ current_city: state?.home_city ?? null }).eq("id", user.id);
      }
      toast.success("Welcome home.");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="flex items-center gap-2 font-display text-xl">
        <Plane className="h-5 w-5" /> Travel mode
      </h2>

      {state.account_restricted && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          <ShieldAlert className="mt-0.5 h-4 w-4" />
          <div>
            Account restricted after repeated location mismatches. Matching and messaging are paused.{" "}
            <a href="/support" className="underline">Contact support</a> to appeal.
          </div>
        </div>
      )}

      {travelling ? (
        <div className="mt-3 space-y-3">
          <p className="text-sm">
            Travelling from{" "}
            <span className="text-muted-foreground">{[state.home_city, state.home_country_name ?? state.home_country_code].filter(Boolean).join(", ") || "your home"}</span>{" "}
            • Currently in{" "}
            <span className="font-medium text-foreground">{[state.current_city, state.current_country_name ?? state.current_country_code].filter(Boolean).join(", ")}</span>.
          </p>
          {expiresAt && !expired && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Verified — we'll re-check on {expiresAt.toLocaleDateString()}.
            </p>
          )}
          {expired && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
              Your travel verification has expired. Re-verify to keep Travel Mode active.
              <button
                onClick={() => setVerifyOpen(true)}
                className="ml-2 inline-flex items-center gap-1 rounded-full bg-gradient-hero px-3 py-1 text-[11px] font-medium text-primary-foreground shadow-glow"
              >
                Re-verify
              </button>
            </div>
          )}
          <button
            onClick={stopTravel}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-1.5 text-xs hover:bg-surface disabled:opacity-50"
          >
            <X className="h-3 w-3" /> End travel mode
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-muted-foreground">
            Let matches know you're temporarily abroad. We'll confirm with a quick selfie + location check before turning it on.
          </p>
          <button
            onClick={() => setVerifyOpen(true)}
            disabled={!!state.account_restricted}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-hero px-4 py-1.5 text-xs font-medium text-primary-foreground shadow-glow disabled:opacity-50"
          >
            <Plane className="h-3 w-3" /> I'm travelling
          </button>
          {state.travel_warning_count ? (
            <p className="text-[11px] text-muted-foreground">
              Location warnings: {state.travel_warning_count} of 2.
            </p>
          ) : null}
        </div>
      )}

      <TravelVerifyModal
        open={verifyOpen}
        onClose={() => { setVerifyOpen(false); void load(); }}
        onActivated={() => { void load(); }}
      />
    </div>
  );
}
