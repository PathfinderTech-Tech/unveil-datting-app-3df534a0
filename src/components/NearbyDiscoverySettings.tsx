import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MapPin, ShieldCheck, Loader2, Globe } from "lucide-react";
import { COUNTRY_BY_CODE, CONTINENTS } from "@/lib/countries";

type Privacy = "hidden" | "country" | "city" | "distance";

// Radius sentinels match the SQL convention (profiles.discovery_radius_km):
//   > 0  literal km
//    0   anywhere in the world
//   -1   anywhere in my country
//   -2   anywhere in my continent
const RADII = [
  { km: 10,  label: "10 km" },
  { km: 25,  label: "25 km" },
  { km: 50,  label: "50 km" },
  { km: 100, label: "100 km" },
  { km: 250, label: "250 km" },
  { km: -1,  label: "Anywhere in my country" },
  { km: -2,  label: "Anywhere in my continent" },
  { km: 0,   label: "Anywhere in the world" },
];

const PRIVACY: { v: Privacy; label: string; hint: string }[] = [
  { v: "hidden",   label: "Hide my location",        hint: "Never shown to anyone." },
  { v: "country",  label: "Show country only",       hint: "Others see your country, nothing more." },
  { v: "city",     label: "Show city only",          hint: "City visible. No distance, no map." },
  { v: "distance", label: "Show approximate distance", hint: "e.g. 'Within 10 miles' — never exact." },
];

export function NearbyDiscoverySettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [privacy, setPrivacy] = useState<Privacy>("distance");
  const [radius, setRadius] = useState(50);
  const [hasCoords, setHasCoords] = useState(false);
  const [openInternational, setOpenInternational] = useState(false);
  const [countryCode, setCountryCode] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setLoading(false); return; }
      const { data } = await supabase
        .from("profiles")
        .select("location_enabled, location_privacy, discovery_radius_km, lat_approx, open_to_international, country_code")
        .eq("id", u.user.id).maybeSingle();
      if (!alive) return;
      setEnabled(!!data?.location_enabled);
      setPrivacy((data?.location_privacy as Privacy) || "distance");
      setRadius(data?.discovery_radius_km ?? 50);
      setHasCoords(data?.lat_approx != null);
      const d = data as { open_to_international?: boolean | null; country_code?: string | null } | null;
      setOpenInternational(!!d?.open_to_international);
      setCountryCode(d?.country_code ?? null);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  async function persist(patch: Record<string, unknown>) {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update(patch as never).eq("id", u.user.id);
    setSaving(false);
    if (error) toast.error(error.message);
  }

  async function enableLocation() {
    if (!("geolocation" in navigator)) { toast.error("Geolocation unavailable on this device."); return; }
    setSaving(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        // Round to 2 decimals (~1.1km) — never store exact GPS.
        const lat = Math.round(pos.coords.latitude * 100) / 100;
        const lng = Math.round(pos.coords.longitude * 100) / 100;
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) return;
        const { error } = await supabase.from("profiles").update({
          location_enabled: true,
          lat_approx: lat,
          lng_approx: lng,
          location_updated_at: new Date().toISOString(),
        }).eq("id", u.user.id);
        setSaving(false);
        if (error) { toast.error(error.message); return; }
        setEnabled(true); setHasCoords(true);
        toast.success("Nearby Discovery enabled. Only approximate location is stored.");
      },
      (err) => { setSaving(false); toast.error(err.message || "Location permission denied."); },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 },
    );
  }

  async function disableLocation() {
    setEnabled(false); setHasCoords(false);
    await persist({ location_enabled: false, lat_approx: null, lng_approx: null });
    toast.success("Nearby Discovery turned off.");
  }

  if (loading) return <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl"><MapPin className="h-4 w-4" /> Nearby Discovery</h2>
          <p className="mt-1 max-w-md text-xs text-muted-foreground">
            Optional and off by default. UNVEIL only stores your approximate location (rounded to ~1 km) — never exact GPS,
            never your address. You can disable this anytime.
          </p>
        </div>
        <button
          onClick={enabled ? disableLocation : enableLocation}
          disabled={saving}
          className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-medium transition ${
            enabled ? "border border-border bg-background hover:bg-surface" : "bg-gradient-hero text-primary-foreground shadow-glow"
          }`}
        >
          {saving && <Loader2 className="h-3 w-3 animate-spin" />}
          {enabled ? "Disable" : "Enable"}
        </button>
      </div>

      {enabled && (
        <>
          <div className="mt-6">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Location privacy</div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {PRIVACY.map((p) => (
                <label key={p.v} className={`cursor-pointer rounded-xl border p-3 text-sm transition ${
                  privacy === p.v ? "border-primary bg-primary/5" : "border-border hover:bg-surface"
                }`}>
                  <input
                    type="radio" name="privacy" className="sr-only"
                    checked={privacy === p.v}
                    onChange={async () => { setPrivacy(p.v); await persist({ location_privacy: p.v }); }}
                  />
                  <div className="font-medium">{p.label}</div>
                  <div className="text-[11px] text-muted-foreground">{p.hint}</div>
                </label>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Discovery radius</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {RADII.map((r) => (
                <button
                  key={r.km}
                  onClick={async () => { setRadius(r.km); await persist({ discovery_radius_km: r.km }); }}
                  className={`rounded-full border px-3 py-1.5 text-xs transition ${
                    radius === r.km ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-surface"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {!hasCoords && (
              <p className="mt-3 text-[11px] text-amber-500">
                Tap Enable again to refresh your approximate location.
              </p>
            )}
            <p className="mt-4 inline-flex items-center gap-2 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3 w-3" /> Exact addresses and live GPS are never shown to anyone.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
