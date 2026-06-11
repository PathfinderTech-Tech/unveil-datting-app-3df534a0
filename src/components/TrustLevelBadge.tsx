import { ShieldCheck, ShieldAlert, BadgeCheck, Shield } from "lucide-react";

export type TrustLevel = "unverified" | "verified" | "trusted" | "identity_verified";

const META: Record<TrustLevel, { label: string; icon: typeof Shield; cls: string }> = {
  unverified:        { label: "Unverified",        icon: ShieldAlert, cls: "bg-muted text-muted-foreground" },
  verified:          { label: "Verified",          icon: ShieldCheck, cls: "bg-primary/10 text-primary" },
  trusted:           { label: "Trusted",           icon: BadgeCheck,  cls: "bg-accent/10 text-accent" },
  identity_verified: { label: "Identity Verified", icon: BadgeCheck,  cls: "bg-emerald-500/10 text-emerald-500" },
};

export function TrustLevelBadge({ level, size = "sm" }: { level: TrustLevel; size?: "xs" | "sm" }) {
  if (level === "unverified") return null;
  const m = META[level];
  const Icon = m.icon;
  const dim = size === "xs" ? "text-[9px] px-1.5 py-0.5" : "text-[10px] px-2 py-0.5";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-mono uppercase tracking-wider ${m.cls} ${dim}`}>
      <Icon className="h-3 w-3" /> {m.label}
    </span>
  );
}
