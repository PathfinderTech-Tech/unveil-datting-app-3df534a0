// Old background watermark removed per request — VeilBackdrop is now a no-op.
// Kept as exports so existing imports continue to compile.
import logoAsset from "@/assets/unveil-logo.png.asset.json";

export function VeilBackdrop(_: {
  variant?: "corner" | "center" | "edge";
  opacity?: number;
  className?: string;
}) {
  return null;
}

/** Compact inline veil mark — floating master logo (no black background). */
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
          mixBlendMode: "screen",
          filter:
            "drop-shadow(0 0 16px color-mix(in oklch, var(--logo-magenta) 62%, transparent)) drop-shadow(0 0 10px color-mix(in oklch, var(--logo-gold) 38%, transparent))",
        }}
      />
    </div>
  );
}
