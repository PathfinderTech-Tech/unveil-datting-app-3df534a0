import logoAsset from "@/assets/unveil-logo-v2.png.asset.json";

type Variant = "corner" | "center" | "edge";

/**
 * Subtle UNVEIL veil watermark for cards, hero sections, loaders.
 * Decorative only — never blocks content (pointer-events: none, low opacity).
 */
export function VeilBackdrop({
  variant = "corner",
  opacity = 0.07,
  className = "",
}: {
  variant?: Variant;
  opacity?: number;
  className?: string;
}) {
  const position =
    variant === "center"
      ? "center center"
      : variant === "edge"
      ? "center right -15%"
      : "bottom -15% right -15%";
  const size = variant === "center" ? "60%" : "50%";
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      style={{
        backgroundImage: `url(${logoAsset.url})`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: position,
        backgroundSize: `${size} auto`,
        opacity,
        mixBlendMode: "screen",
      }}
    />
  );
}

/** Compact inline veil mark — for loaders, badges, inline accents. */
export function VeilPulse({ size = 64 }: { size?: number }) {
  return (
    <div
      className="relative inline-flex items-center justify-center animate-pulse-glow rounded-full"
      style={{ width: size, height: size }}
    >
      <img
        src={logoAsset.url}
        alt=""
        aria-hidden
        className="object-contain animate-float"
        style={{
          width: size * 0.8,
          height: size * 0.8,
          filter: "drop-shadow(0 0 16px color-mix(in oklch, var(--logo-magenta) 62%, transparent)) drop-shadow(0 0 10px color-mix(in oklch, var(--logo-gold) 38%, transparent))",
        }}
      />
    </div>
  );
}
