import { useEffect, useState } from "react";
import { Plane, X } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { LocationPicker, EMPTY_LOCATION, type LocationValue } from "@/components/LocationPicker";
import { setTravelMode, endTravelMode } from "@/lib/travel-mode.functions";

type TravelState = {
  home_country_code: string | null;
  home_country_name: string | null;
  current_country_code: string | null;
  current_country_name: string | null;
  travel_status: string | null;
};

export function TravelModeToggle() {
  const { user } = useAuth();
  const [state, setState] = useState<TravelState | null>(null);
  const [open, setOpen] = useState(false);
  const [picker, setPicker] = useState<LocationValue>(EMPTY_LOCATION);
  const [busy, setBusy] = useState(false);
  const setTravelFn = useServerFn(setTravelMode);
  const endTravelFn = useServerFn(endTravelMode);

  async function load() {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("home_country_code, home_country_name, current_country_code, current_country_name, travel_status")
      .eq("id", user.id)
      .maybeSingle();
    setState(data as TravelState | null);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user?.id]);

  if (!state) return null;
  const travelling = state.travel_status === "travelling";

  async function startTravel() {
    if (!picker.country_code || !picker.country) {
      toast.error("Pick a country first.");
      return;
    }
    setBusy(true);
    try {
      await setTravelFn({ data: {
        currentCountryCode: picker.country_code,
        currentCountryName: picker.country,
        travelling: true,
      }});
      toast.success(`Travel mode on — ${picker.country}`);
      setOpen(false);
      setPicker(EMPTY_LOCATION);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  }

  async function stopTravel() {
    setBusy(true);
    try {
      await endTravelFn();
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

      {travelling ? (
        <div className="mt-3 space-y-3">
          <p className="text-sm">
            Currently travelling in{" "}
            <span className="font-medium text-foreground">{state.current_country_name ?? state.current_country_code}</span>.
            Your home country (<span className="text-muted-foreground">{state.home_country_name ?? state.home_country_code ?? "—"}</span>) is preserved.
          </p>
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
            Let matches know you're temporarily abroad. Your home country stays the same.
          </p>
          {!open ? (
            <button
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-hero px-4 py-1.5 text-xs font-medium text-primary-foreground shadow-glow"
            >
              <Plane className="h-3 w-3" /> I'm travelling
            </button>
          ) : (
            <div className="space-y-3 rounded-xl border border-border bg-surface/40 p-3">
              <LocationPicker
                value={picker}
                onChange={setPicker}
                autoDetect={false}
                labels={{ country: "Where are you now?", city: "City (optional)" }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setOpen(false); setPicker(EMPTY_LOCATION); }}
                  disabled={busy}
                  className="rounded-full border border-border px-4 py-1.5 text-xs hover:bg-surface disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={startTravel}
                  disabled={busy || !picker.country_code}
                  className="rounded-full bg-gradient-hero px-4 py-1.5 text-xs font-medium text-primary-foreground shadow-glow disabled:opacity-50"
                >
                  Confirm travel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
