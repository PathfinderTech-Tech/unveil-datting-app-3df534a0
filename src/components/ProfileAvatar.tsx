import { useState, useEffect } from "react";
import { getAvatarFallback, resolveProfileImage } from "@/lib/avatar-fallback";
import { getDisplayPhotoUrl } from "@/lib/photos";

type Props = {
  userId?: string | null;
  name?: string | null;
  discoveryMode?: "avatar" | "photo" | null;
  avatarUrl?: string | null;
  photoUrl?: string | null;
  size?: number;
  className?: string;
  rounded?: "full" | "2xl";
  alt?: string;
  /**
   * When true, render the real photo behind a luxurious silk/frosted-glass
   * veil. Used on Discover, match cards, match-list, and pre-conversation
   * surfaces. Unveil drops the moment the first message is exchanged.
   */
  veiled?: boolean;
};

/**
 * Universal profile image renderer. Never blank: when no URL is available
 * or the network image fails to load, we fall back to a deterministic
 * gradient + initial SVG via `getAvatarFallback`.
 *
 * Storage-bucket aware: when the resolved URL points at the private
 * `profile-photos` bucket (legacy public URL or bare path), we sign it
 * via `getDisplayPhotoUrl` before rendering. Data URLs and external URLs
 * pass through unchanged.
 */
export function ProfileAvatar({
  userId,
  name,
  discoveryMode,
  avatarUrl,
  photoUrl,
  size = 56,
  className = "",
  rounded = "full",
  alt,
  veiled = false,
}: Props) {
  const fallback = getAvatarFallback(userId ?? name ?? "unveil", name ?? null);
  // Always prefer a real photo when one exists — initials/placeholder circles
  // are only used as a last-resort fallback.
  const initial = resolveProfileImage({
    discoveryMode: photoUrl ? "photo" : discoveryMode ?? null,
    avatarUrl: avatarUrl ?? null,
    photoUrl: photoUrl ?? null,
    seed: userId ?? name ?? "unveil",
    label: name ?? null,
  });
  const [src, setSrc] = useState<string>(initial);

  useEffect(() => {
    let alive = true;
    setSrc(initial);
    if (initial.startsWith("data:")) return;
    (async () => {
      try {
        const signed = await getDisplayPhotoUrl(initial);
        if (alive && signed) setSrc(signed);
      } catch {
        if (alive) setSrc(fallback);
      }
    })();
    return () => { alive = false; };
  }, [initial, fallback]);

  const radius = rounded === "full" ? "rounded-full" : "rounded-2xl";

  const img = (
    <img
      src={src}
      alt={alt ?? `${name ?? "Profile"} avatar`}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setSrc(fallback)}
      className={`${radius} object-cover ${veiled ? "" : className}`}
      style={{ width: size, height: size }}
    />
  );

  if (!veiled) return img;

  // Veiled state: real photo behind a luxurious silk / frosted-glass overlay.
  // Goal: silhouette + hair + clothing readable; fine facial detail softened.
  return (
    <div
      className={`relative isolate inline-block overflow-hidden ${radius} ${className}`}
      style={{ width: size, height: size }}
      aria-label={`${name ?? "Profile"} (veiled)`}
    >
      <img
        src={src}
        alt={alt ?? `${name ?? "Profile"} (veiled)`}
        width={size}
        height={size}
        loading="lazy"
        onError={() => setSrc(fallback)}
        className={`${radius} object-cover h-full w-full`}
        style={{ filter: "blur(2.5px) saturate(1.05) contrast(0.98)" }}
      />
      {/* Silk gradient veil — indigo → purple → gold, kept subtle */}
      <div
        className={`pointer-events-none absolute inset-0 ${radius}`}
        style={{
          background:
            "linear-gradient(135deg, color-mix(in oklch, var(--logo-violet) 28%, transparent) 0%, color-mix(in oklch, var(--logo-purple) 22%, transparent) 45%, color-mix(in oklch, var(--logo-gold) 18%, transparent) 100%)",
          mixBlendMode: "soft-light",
        }}
      />
      {/* Lace / frosted shimmer — fine diagonal threads */}
      <div
        className={`pointer-events-none absolute inset-0 ${radius} opacity-60`}
        style={{
          background:
            "repeating-linear-gradient(135deg, rgba(255,255,255,0.06) 0 1px, transparent 1px 4px), repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 5px)",
        }}
      />
      {/* Inner glow ring */}
      <div
        className={`pointer-events-none absolute inset-0 ${radius}`}
        style={{
          boxShadow:
            "inset 0 0 0 1px color-mix(in oklch, var(--logo-gold) 35%, transparent), inset 0 0 14px color-mix(in oklch, var(--logo-purple) 30%, transparent)",
        }}
      />
    </div>
  );
}
