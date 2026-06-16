// VeilBackdrop — site-wide ambient watermark using the transparent UNVEIL logo.
// Renders a fixed, very low-opacity logo behind all content with a radial
// veil-pattern halo. Pointer-events disabled so it never interferes with UI.
import logoAsset from "@/assets/unveil-logo-v3.png.asset.json";

type Variant = "center" | "corner" | "edge";

export function VeilBackdrop({
  variant = "corner",
  opacity = 0.04,
  className = "",
}: {
  variant?: Variant;
  opacity?: number;
  className?: string;
}) {
  // Position / size per variant
  const layout =
    variant === "center"
      ? {
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          size: "min(120vmin, 1100px)",
        }
      : variant === "edge"
      ? {
          top: "50%",
          right: "-12%",
          transform: "translateY(-50%)",
          size: "min(85vmin, 820px)",
        }
      : {
          bottom: "-8%",
          right: "-8%",
          size: "min(70vmin, 680px)",
        };

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden ${className}`}
    >
      {/* Soft radial veil pattern — brand-colored halo, heavily subdued */}
      <div
        className="absolute inset-0"
        style={{
          background:
            variant === "center"
              ? "radial-gradient(ellipse at 50% 45%, color-mix(in oklch, var(--logo-purple) 5%, transparent) 0%, color-mix(in oklch, var(--logo-magenta) 3%, transparent) 35%, transparent 70%)"
              : "radial-gradient(ellipse at 80% 60%, color-mix(in oklch, var(--logo-violet) 4%, transparent) 0%, color-mix(in oklch, var(--logo-gold) 2%, transparent) 40%, transparent 75%)",
        }}
      />
      {/* The watermark itself */}
      <img
        src={logoAsset.url}
        alt=""
        aria-hidden
        className="absolute select-none"
        style={{
          width: layout.size,
          height: layout.size,
          top: (layout as any).top,
          left: (layout as any).left,
          right: (layout as any).right,
          bottom: (layout as any).bottom,
          transform: (layout as any).transform,
          opacity,
          filter:
            "blur(3px) drop-shadow(0 0 48px color-mix(in oklch, var(--logo-purple) 14%, transparent))",
          maskImage:
            "radial-gradient(circle at center, transparent 40%, black 72%, transparent 92%)",
          WebkitMaskImage:
            "radial-gradient(circle at center, transparent 40%, black 72%, transparent 92%)",
        }}
      />
    </div>
  );
}

/** Compact inline veil mark — floating master logo. */
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
          width: size * 0.9,
          height: size * 0.9,
          filter:
            "drop-shadow(0 0 16px color-mix(in oklch, var(--logo-magenta) 62%, transparent)) drop-shadow(0 0 10px color-mix(in oklch, var(--logo-gold) 38%, transparent))",
        }}
      />
    </div>
  );
}
