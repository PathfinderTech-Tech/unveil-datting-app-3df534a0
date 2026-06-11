import { Link } from "@tanstack/react-router";
import logoAsset from "@/assets/unveil-logo-transparent.png.asset.json";

export function LogoMark({
  size = 36,
  className = "",
  glow = "soft",
}: {
  size?: number;
  className?: string;
  /** Glow intensity. "soft" = nav/inline, "ambient" = hero. */
  glow?: "none" | "soft" | "ambient";
}) {
  const filter =
    glow === "none"
      ? undefined
      : glow === "ambient"
      ? "drop-shadow(0 0 36px color-mix(in oklch, var(--logo-magenta) 55%, transparent)) drop-shadow(0 0 28px color-mix(in oklch, var(--logo-purple) 50%, transparent)) drop-shadow(0 0 22px color-mix(in oklch, var(--logo-gold) 32%, transparent))"
      : "drop-shadow(0 0 14px color-mix(in oklch, var(--logo-magenta) 50%, transparent)) drop-shadow(0 0 10px color-mix(in oklch, var(--logo-gold) 34%, transparent))";
  return (
    <img
      src={logoAsset.url}
      alt="UNVEIL"
      width={size}
      height={size}
      className={`object-contain bg-transparent ${className}`}
      style={{ filter }}
    />
  );
}

export function LogoWordmark({ size = 28 }: { size?: number }) {
  return (
    <span
      className="font-display font-light tracking-luxury text-gradient-aura"
      style={{ fontSize: size }}
    >
      UNVEIL
    </span>
  );
}

export function LogoHeader({ to = "/" }: { to?: string }) {
  return (
    <Link to={to} className="flex items-center gap-3">
      <LogoMark size={36} />
      <LogoWordmark size={20} />
    </Link>
  );
}
