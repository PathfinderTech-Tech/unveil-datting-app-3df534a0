import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, BadgeCheck, AlertTriangle, Plane } from "lucide-react";

import { LocationTrustBadge } from "@/components/LocationTrustBadge";

type Row = {
  id: string;
  first_name: string | null;
  trust_level: string | null;
  location_risk_score: number | null;
  location_mismatch_count: number | null;
  travel_status: string | null;
  travel_expires_at: string | null;
  travel_warning_count: number | null;
  account_restricted: boolean | null;
  home_country_code: string | null;
  current_country_code: string | null;
  verified_country_code: string | null;
  verified: boolean | null;
};

type VerifRow = {
  id: string;
  user_id: string;
  verified_at: string | null;
  created_at: string;
  match_result: string;
  risk_level: string;
  vpn_suspected: boolean;
  profile_country_code: string | null;
  current_country_code: string | null;
  device_country_code: string | null;
  ip_country_code: string | null;
  gps_country_code: string | null;
  device_timezone: string | null;
};

export function AdminTrustPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [history, setHistory] = useState<VerifRow[]>([]);
  const [selected, setSelected] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, first_name, trust_level, location_risk_score, location_mismatch_count, travel_status, travel_expires_at, travel_warning_count, account_restricted, home_country_code, current_country_code, verified_country_code, verified")
        .order("location_risk_score", { ascending: false })
        .limit(200);
      setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
  }, []);

  async function openUser(r: Row) {
    setSelected(r);
    const { data } = await supabase
      .from("location_verifications")
      .select("*")
      .eq("user_id", r.id)
      .order("verified_at", { ascending: false })
      .limit(50);
    setHistory((data ?? []) as VerifRow[]);
  }

  if (loading) return <div className="mt-6 text-sm text-muted-foreground">Loading trust signals…</div>;

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-[1fr,1.3fr]">
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">
          Users by risk
        </div>
        <div className="max-h-[70vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr><th className="px-3 py-2">User</th><th>Trust</th><th>Risk</th><th>Miss</th><th>Loc</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => openUser(r)}
                  className={`cursor-pointer border-t border-border hover:bg-surface ${selected?.id === r.id ? "bg-surface" : ""}`}
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      {r.travel_status === "travelling" && <Plane className="h-3 w-3 text-primary" />}
                      <span className="truncate">{r.first_name ?? r.id.slice(0, 8)}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <TrustPill level={r.trust_level} />
                      <LocationTrustBadge profile={r} size="xs" showLabel={false} />
                    </div>
                  </td>
                  <td>
                    <RiskPill score={r.location_risk_score ?? 0} />
                  </td>
                  <td className="text-xs text-muted-foreground">{r.location_mismatch_count ?? 0}</td>
                  <td className="text-xs text-muted-foreground">
                    {r.home_country_code ?? "—"}{r.current_country_code && r.current_country_code !== r.home_country_code ? `→${r.current_country_code}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">
          {selected ? `Verification history — ${selected.first_name ?? selected.id.slice(0, 8)}` : "Select a user"}
        </div>
        {!selected ? (
          <div className="p-6 text-sm text-muted-foreground">Click a user on the left to see their full verification history.</div>
        ) : (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <Field label="Home country" value={selected.home_country_code} />
              <Field label="Current country" value={selected.current_country_code} />
              <Field label="Verified country" value={selected.verified_country_code} />
              <Field label="Travel status" value={selected.travel_status} />
              <Field label="Trust level" value={selected.trust_level} />
              <Field label="Risk score" value={String(selected.location_risk_score ?? 0)} />
            </div>
            <div className="max-h-[55vh] overflow-y-auto rounded-xl border border-border">
              <table className="w-full text-xs">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1.5">When</th>
                    <th>Result</th>
                    <th>Risk</th>
                    <th>Profile</th>
                    <th>Device</th>
                    <th>IP</th>
                    <th>GPS</th>
                    <th>TZ</th>
                    <th>VPN</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 && (
                    <tr><td colSpan={9} className="px-2 py-4 text-center text-muted-foreground">No verifications yet.</td></tr>
                  )}
                  {history.map((h) => (
                    <tr key={h.id} className="border-t border-border">
                      <td className="px-2 py-1.5 whitespace-nowrap">{new Date(h.verified_at ?? h.created_at).toLocaleString()}</td>
                      <td><MatchPill result={h.match_result} /></td>
                      <td><RiskPillName level={h.risk_level} /></td>
                      <td>{h.profile_country_code ?? "—"}</td>
                      <td>{h.device_country_code ?? "—"}</td>
                      <td>{h.ip_country_code ?? "—"}</td>
                      <td>{h.gps_country_code ?? "—"}</td>
                      <td className="text-muted-foreground">{h.device_timezone ?? "—"}</td>
                      <td>{h.vpn_suspected ? <span className="text-destructive">⚠</span> : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-lg border border-border bg-surface/40 px-3 py-2">
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm">{value ?? "—"}</div>
    </div>
  );
}

function TrustPill({ level }: { level: string | null }) {
  const map: Record<string, { cls: string; icon: any; label: string }> = {
    unverified:        { cls: "bg-muted text-muted-foreground", icon: AlertTriangle, label: "Unverified" },
    verified:          { cls: "bg-primary/10 text-primary",     icon: ShieldCheck,   label: "Verified" },
    trusted:           { cls: "bg-accent/10 text-accent",       icon: BadgeCheck,    label: "Trusted" },
    identity_verified: { cls: "bg-emerald-500/10 text-emerald-500", icon: BadgeCheck, label: "ID" },
  };
  const m = map[level ?? "unverified"] ?? map.unverified;
  const Icon = m.icon;
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono uppercase ${m.cls}`}><Icon className="h-3 w-3" />{m.label}</span>;
}

function RiskPill({ score }: { score: number }) {
  const cls = score >= 80 ? "bg-destructive/10 text-destructive" : score >= 40 ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500";
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-mono ${cls}`}>{score}</span>;
}

function RiskPillName({ level }: { level: string }) {
  const cls = level === "high" ? "bg-destructive/10 text-destructive" : level === "medium" ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500";
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-mono uppercase ${cls}`}>{level}</span>;
}

function MatchPill({ result }: { result: string }) {
  const cls = result === "match" ? "bg-emerald-500/10 text-emerald-500" : result === "partial" ? "bg-amber-500/10 text-amber-500" : "bg-destructive/10 text-destructive";
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-mono uppercase ${cls}`}>{result}</span>;
}
