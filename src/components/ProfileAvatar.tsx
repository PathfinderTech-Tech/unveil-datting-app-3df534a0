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
}: Props) {
  const fallback = getAvatarFallback(userId ?? name ?? "unveil", name ?? null);
  const initial = resolveProfileImage({
    discoveryMode: discoveryMode ?? null,
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

  return (
    <img
      src={src}
      alt={alt ?? `${name ?? "Profile"} avatar`}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setSrc(fallback)}
      className={`${radius} object-cover ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
