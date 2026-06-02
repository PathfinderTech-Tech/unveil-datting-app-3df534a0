import { useEffect, useState } from "react";
import { loadMutualPartners, type Partner } from "@/lib/social-api";
import { Avatar } from "@/components/Avatar";

export function usePartner(initialId?: string | null) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [partnerId, setPartnerId] = useState<string | null>(initialId ?? null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    loadMutualPartners().then((rows) => {
      if (!alive) return;
      setPartners(rows);
      if (!initialId && rows.length === 1) setPartnerId(rows[0].userId);
      if (initialId && !rows.some((r) => r.userId === initialId)) setPartnerId(null);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [initialId]);

  const partner = partners.find((p) => p.userId === partnerId) ?? null;
  return { partner, partners, partnerId, setPartnerId, loading, refresh: () => loadMutualPartners().then(setPartners) };
}

export function PartnerPicker({
  partners, value, onChange,
}: { partners: Partner[]; value: string | null; onChange: (id: string) => void }) {
  if (partners.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No mutual matches yet. Once someone matches you back, they'll appear here.
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {partners.map((p) => {
        const active = value === p.userId;
        return (
          <button
            key={p.userId}
            onClick={() => onChange(p.userId)}
            className={`flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3 text-sm transition ${
              active ? "border-primary bg-primary/10" : "border-border bg-card hover:border-foreground/30"
            }`}
          >
            <Avatar seed={p.userId.slice(0, 6) + "-180"} size={28} label={p.name} />
            <span>{p.name}</span>
          </button>
        );
      })}
    </div>
  );
}
