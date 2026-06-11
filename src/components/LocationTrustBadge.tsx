import { useEffect, useState } from "react";
import { ShieldCheck, Plane, AlertTriangle, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type LocationTrustStatus = "verified" | "travel" | "warning" | "restricted" | "unverified";

export type LocationTrustInput = {
  verified?: boolean | null;
  travel_status?: string | null;
  travel_expires_at?: string | null;
  travel_warning_count?: number | null;
  account_restricted?: boolean | null;
};

export function deriveLocationTrust(p: LocationTrustInput | null | undefined): {
  status: LocationTrustStatus;
  daysLeft: number | null;
  warningCount: number;
} {
  if (!p) return { status: "unverified", daysLeft: null, warningCount: 0 };
  if (p.account_restricted) return { status: "restricted", daysLeft: null, warningCount: p.travel_warning_count ?? 2 };
  if (p.travel_status === "travelling" && p.travel_expires_at) {
    const ms = new Date(p.travel_expires_at).getTime() - Date.now();
    if (ms > 0) {
      return { status: "travel", daysLeft: Math.max(1, Math.ceil(ms / 86400000)), warningCount: p.travel_warning_count ?? 0 };
    }
  }
  if ((p.travel_warning_count ?? 0) >= 1) return { status: "warning", daysLeft: null, warningCount: p.travel_warning_count ?? 1 };
  if (p.verified) return { status: "verified", daysLeft: null, warningCount: 0 };
  return { status: "unverified", daysLeft: null, warningCount: 0 };
}

const STYLES: Record<Exclude<LocationTrustStatus, "unverified">, { bg: string; fg: string; border: string; ring: string }> = {
  verified:   { bg: "bg-[#39FF14]/12", fg: "text-[#39FF14]", border: "border-[#39FF14]/45", ring: "shadow-[0_0_12px_-2px_#39FF14aa]" },
  travel:     { bg: "bg-amber-400/12",  fg: "text-amber-400",  border: "border-amber-400/45",  ring: "shadow-[0_0_10px_-2px_rgba(251,191,36,0.55)]" },
  warning:    { bg: "bg-orange-500/12", fg: "text-orange-500", border: "border-orange-500/45", ring: "" },
  restricted: { bg: "bg-red-500/12",    fg: "text-red-500",    border: "border-red-500/50",   ring: "" },
};

export function LocationTrustBadge({
  profile,
  size = "sm",
  showLabel = true,
}: {
  profile: LocationTrustInput | null | undefined;
  size?: "xs" | "sm" | "md";
  showLabel?: boolean;
}) {
  const { status, daysLeft, warningCount } = deriveLocationTrust(profile);
  if (status === "unverified") return null;
  const s = STYLES[status];
  const Icon = status === "verified" ? ShieldCheck : status === "travel" ? Plane : status === "warning" ? AlertTriangle : ShieldAlert;
  const label =
    status === "verified" ? "Verified Location"
    : status === "travel" ? `Travel Mode${daysLeft ? ` • ${daysLeft}d` : ""}`
    : status === "warning" ? `Location Warning ${warningCount} of 2`
    : "Location Verification Required";
  const title =
    status === "verified" ? "Your location has been successfully verified."
    : status === "travel" ? `Travel Mode verified.${daysLeft ? ` Expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.` : ""}`
    : status === "warning" ? "Your profile location does not match your verified location."
    : "Account restricted pending location verification.";
  const dim = size === "xs" ? "text-[9px] px-1.5 py-0.5" : size === "md" ? "text-xs px-2.5 py-1" : "text-[10px] px-2 py-0.5";
  const icoDim = size === "md" ? "h-3.5 w-3.5" : "h-3 w-3";
  return (
    <span
      title={title}
      aria-label={title}
      className={`inline-flex items-center gap-1 rounded-full border font-mono uppercase tracking-wider ${dim} ${s.bg} ${s.fg} ${s.border} ${s.ring}`}
    >
      <Icon className={icoDim} />
      {showLabel && <span>{label}</span>}
    </span>
  );
}

export function useMyLocationTrust() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<LocationTrustInput | null>(null);
  useEffect(() => {
    if (!user) { setProfile(null); return; }
    let alive = true;
    supabase
      .from("profiles")
      .select("verified, travel_status, travel_expires_at, travel_warning_count, account_restricted")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => { if (alive) setProfile((data as LocationTrustInput) ?? null); });
    return () => { alive = false; };
  }, [user?.id]);
  return { profile, ...deriveLocationTrust(profile) };
}
