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
        background: `conic-gradient(from ${hue}deg, var(--logo-violet), var(--logo-magenta), var(--logo-gold), var(--logo-purple))`,
        boxShadow: `0 0 ${size / 2}px -${size / 4}px color-mix(in oklch, var(--logo-purple) 70%, transparent)`,
      }}
    >
      {initials}
    </div>
  );
}
