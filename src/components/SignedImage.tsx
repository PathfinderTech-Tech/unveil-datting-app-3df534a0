import { useEffect, useState } from "react";
import { getDisplayPhotoUrl } from "@/lib/photos";

type Props = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string | null | undefined;
  fallback?: React.ReactNode;
};

/**
 * Renders an <img> for a stored profile-photos value, automatically signing
 * the URL when needed. Falls back to `fallback` while loading or on error.
 */
export function SignedImage({ src, fallback = null, alt = "", ...rest }: Props) {
  const [resolved, setResolved] = useState<string | null>(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setErrored(false);
    setResolved(null);
    if (!src) return;
    getDisplayPhotoUrl(src)
      .then((u) => { if (!cancelled) setResolved(u); })
      .catch(() => { if (!cancelled) setErrored(true); });
    return () => { cancelled = true; };
  }, [src]);

  if (!src || errored || (resolved === null && src)) {
    if (resolved === null && src && !errored) {
      // Loading: render an empty placeholder div so layout doesn't jump.
      return <>{fallback}</>;
    }
    return <>{fallback}</>;
  }

  return <img {...rest} src={resolved ?? undefined} alt={alt} onError={() => setErrored(true)} />;
}
