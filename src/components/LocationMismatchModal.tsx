import { useState } from "react";
import { Plane, MapPin, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { LocationPicker, EMPTY_LOCATION, type LocationValue } from "@/components/LocationPicker";
import { TravelVerifyModal } from "@/components/TravelVerifyModal";

type Mode = "choices" | "verify_travel" | "update_home";

export function LocationMismatchModal({
  open,
  onClose,
  onRetry,
}: {
  open: boolean;
  onClose: () => void;
  onRetry: () => void;
}) {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("choices");
  const [picker, setPicker] = useState<LocationValue>(EMPTY_LOCATION);
  const [busy, setBusy] = useState(false);
  const setTravelFn = useServerFn(setTravelMode);

  if (!open) return null;

  async function confirmTravelling() {
    if (!picker.country_code || !picker.country) { toast.error("Pick a country."); return; }
    setBusy(true);
    try {
      await setTravelFn({ data: {
        currentCountryCode: picker.country_code,
        currentCountryName: picker.country,
        travelling: true,
      }});
      toast.success(`Travel mode on — ${picker.country}`);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  }

  async function updateHome() {
    if (!user || !picker.country_code || !picker.country) { toast.error("Pick a country."); return; }
    setBusy(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          home_country_code: picker.country_code,
          home_country_name: picker.country,
          home_city: picker.city ?? null,
          current_country_code: picker.country_code,
          current_country_name: picker.country,
          current_city: picker.city ?? null,
          country_code: picker.country_code,
          country: picker.country,
          city: picker.city ?? null,
          travel_status: "home",
          travel_started_at: null,
        })
        .eq("id", user.id);
      if (error) throw error;
      toast.success("Home country updated.");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center" onClick={onClose}>
      <div
        className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:bg-surface" aria-label="Close">
          <X className="h-4 w-4" />
        </button>

        <h3 className="font-display text-xl">Location check</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          We detected that your current location differs from the country listed on your profile.
          If you are traveling, you may continue and update your location preferences.
        </p>

        {mode === "choices" && (
          <div className="mt-5 space-y-2">
            <button
              onClick={() => setMode("travelling")}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface/60 p-3 text-left text-sm hover:bg-surface"
            >
              <Plane className="h-4 w-4 text-primary" />
              <span><span className="font-medium">I'm travelling</span> — set a temporary country, keep my home as-is.</span>
            </button>
            <button
              onClick={() => setMode("update_home")}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface/60 p-3 text-left text-sm hover:bg-surface"
            >
              <MapPin className="h-4 w-4 text-accent" />
              <span><span className="font-medium">Update my home country</span> — I've moved permanently.</span>
            </button>
            <button
              onClick={() => { onClose(); onRetry(); }}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface/60 p-3 text-left text-sm hover:bg-surface"
            >
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
              <span><span className="font-medium">Retry verification</span></span>
            </button>
          </div>
        )}

        {mode === "travelling" && (
          <div className="mt-5 space-y-3">
            <LocationPicker value={picker} onChange={setPicker} autoDetect labels={{ country: "Where are you now?", city: "City (optional)" }} />
            <div className="flex gap-2">
              <button onClick={() => setMode("choices")} className="rounded-full border border-border px-4 py-1.5 text-xs hover:bg-surface">Back</button>
              <button onClick={confirmTravelling} disabled={busy || !picker.country_code} className="rounded-full bg-gradient-hero px-4 py-1.5 text-xs font-medium text-primary-foreground shadow-glow disabled:opacity-50">Confirm travel</button>
            </div>
          </div>
        )}

        {mode === "update_home" && (
          <div className="mt-5 space-y-3">
            <LocationPicker value={picker} onChange={setPicker} autoDetect labels={{ country: "Your new home country" }} />
            <div className="flex gap-2">
              <button onClick={() => setMode("choices")} className="rounded-full border border-border px-4 py-1.5 text-xs hover:bg-surface">Back</button>
              <button onClick={updateHome} disabled={busy || !picker.country_code} className="rounded-full bg-gradient-hero px-4 py-1.5 text-xs font-medium text-primary-foreground shadow-glow disabled:opacity-50">Update home</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
