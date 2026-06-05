import { useState, useEffect } from "react";
import { getAvatarFallback, resolveProfileImage } from "@/lib/avatar-fallback";

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
  const initial = resolveProfileImage({
    discoveryMode: discoveryMode ?? null,
    avatarUrl: avatarUrl ?? null,
    photoUrl: photoUrl ?? null,
    seed: userId ?? name ?? "unveil",
    label: name ?? null,
  });
  const [src, setSrc] = useState<string>(initial);

  useEffect(() => {
    setSrc(initial);
  }, [initial]);

  const radius = rounded === "full" ? "rounded-full" : "rounded-2xl";

  return (
    <img
      src={src}
      alt={alt ?? `${name ?? "Profile"} avatar`}
      width={size}
      height={size}
      loading="lazy"
      onError={() =>
        setSrc(getAvatarFallback(userId ?? name ?? "unveil", name ?? null))
      }
      className={`${radius} object-cover ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
