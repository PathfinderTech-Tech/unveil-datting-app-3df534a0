import { useState } from "react";
import { Plane, ShieldCheck, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { SelfieVerifyModal } from "@/components/SelfieVerifyModal";
import { LocationPicker, EMPTY_LOCATION, type LocationValue } from "@/components/LocationPicker";
import { startVerifiedTravel } from "@/lib/travel-mode.functions";

type Phase = "claim" | "selfie" | "verifying" | "result";
type ResultState = {
  verified: boolean;
  warningCount: number;
  restricted: boolean;
  expiresAt: string | null;
} | null;

function deviceCountryFromLocale(): string {
  try {
    const loc = (typeof navigator !== "undefined" && navigator.language) || "";
    const region = loc.split("-")[1];
    return region ? region.toUpperCase() : "";
  } catch { return ""; }
}

function deviceTimezone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch { return ""; }
}

async function tryGpsCountry(): Promise<string> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return "";
  return await new Promise<string>((resolve) => {
    const t = setTimeout(() => resolve(""), 4000);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        clearTimeout(t);
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&zoom=3&addressdetails=1`,
            { headers: { "Accept-Language": "en" } },
          );
          const j = await res.json();
          resolve(((j?.address?.country_code as string) || "").toUpperCase());
        } catch { resolve(""); }
      },
      () => { clearTimeout(t); resolve(""); },
      { enableHighAccuracy: false, timeout: 4000, maximumAge: 600000 },
    );
  });
}

export function TravelVerifyModal({
  open,
  onClose,
  onActivated,
}: {
  open: boolean;
  onClose: () => void;
  onActivated?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("claim");
  const [picker, setPicker] = useState<LocationValue>(EMPTY_LOCATION);
  const [result, setResult] = useState<ResultState>(null);
  const startFn = useServerFn(startVerifiedTravel);

  function reset() {
    setPhase("claim");
    setPicker(EMPTY_LOCATION);
    setResult(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function runVerification() {
    setPhase("verifying");
    try {
      const [gps] = await Promise.all([tryGpsCountry()]);
      const res = await startFn({
        data: {
          claimedCountryCode: picker.country_code!,
          claimedCountryName: picker.country!,
          deviceCountryCode: deviceCountryFromLocale(),
          gpsCountryCode: gps,
          deviceTimezone: deviceTimezone(),
        },
      });
      setResult(res);
      setPhase("result");
      if (res.verified) {
        onActivated?.();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verification failed");
      setPhase("claim");
    }
  }

  if (!open) return null;

  // Selfie modal owns its own overlay; render it standalone.
  if (phase === "selfie") {
    return (
      <SelfieVerifyModal
        open
        onClose={handleClose}
        onVerified={() => { void runVerification(); }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center" onClick={handleClose}>
      <div
        className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={handleClose} className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:bg-surface" aria-label="Close">
          <X className="h-4 w-4" />
        </button>

        {phase === "claim" && (
          <>
            <h3 className="flex items-center gap-2 font-display text-xl">
              <Plane className="h-5 w-5 text-primary" /> Verify your travel
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Tell us where you are now. We'll confirm with a quick selfie and your device location so other members can trust where you say you are.
            </p>
            <div className="mt-4">
              <LocationPicker value={picker} onChange={setPicker} autoDetect labels={{ country: "Where are you now?", city: "City (optional)" }} />
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={handleClose} className="rounded-full border border-border px-4 py-1.5 text-xs hover:bg-surface">Cancel</button>
              <button
                onClick={() => {
                  if (!picker.country_code || !picker.country) { toast.error("Pick a country."); return; }
                  setPhase("selfie");
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-hero px-4 py-1.5 text-xs font-medium text-primary-foreground shadow-glow"
              >
                <ShieldCheck className="h-3 w-3" /> Continue to selfie
              </button>
            </div>
          </>
        )}

        {phase === "verifying" && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Checking your location signals…
          </div>
        )}

        {phase === "result" && result && (
          <>
            {result.verified ? (
              <div className="text-center">
                <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-hero text-primary-foreground shadow-glow">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="font-display text-xl">Travel Mode verified</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  We'll re-check your location in 14 days.
                </p>
                <button onClick={handleClose} className="mt-5 rounded-full bg-gradient-hero px-5 py-2 text-xs font-medium text-primary-foreground shadow-glow">
                  Done
                </button>
              </div>
            ) : (
              <div className="text-center">
                <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-destructive/40 bg-destructive/10 text-destructive">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <h3 className="font-display text-xl">
                  {result.restricted ? "Account restricted" : `Warning ${result.warningCount} of 2`}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {result.restricted
                    ? "Matching and messaging are paused. Contact support to appeal."
                    : "Your claimed country didn't match our location signals. If you really are travelling, try again from your current location."}
                </p>
                <button onClick={handleClose} className="mt-5 rounded-full border border-border px-5 py-2 text-xs hover:bg-surface">
                  Close
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
