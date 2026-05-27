// Deterministic gradient avatar from a seed string.
export function Avatar({ seed, size = 64, label }: { seed: string; size?: number; label?: string }) {
  const hue = parseInt(seed.split("-")[1] ?? "180", 10);
  const initials = (label ?? "S").slice(0, 1).toUpperCase();
  return (
    <div
      className="flex items-center justify-center rounded-full font-display font-bold text-background"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: `conic-gradient(from ${hue}deg, oklch(0.74 0.22 ${hue}), oklch(0.82 0.18 ${(hue + 120) % 360}), oklch(0.7 0.28 ${(hue + 240) % 360}), oklch(0.74 0.22 ${hue}))`,
        boxShadow: `0 0 ${size / 2}px -${size / 4}px oklch(0.74 0.22 ${hue} / 0.8)`,
      }}
    >
      {initials}
    </div>
  );
}
