import { Link } from "@tanstack/react-router";
import logoAsset from "@/assets/unveil-logo.png.asset.json";

export function LogoMark({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <img
      src={logoAsset.url}
      alt="UNVEIL"
      width={size}
      height={size}
      className={`object-contain ${className}`}
      style={{ filter: "drop-shadow(0 0 12px oklch(0.65 0.22 305 / 0.5))" }}
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
