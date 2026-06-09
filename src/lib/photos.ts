import { supabase } from "@/integrations/supabase/client";

const BUCKET = "profile-photos";

/**
 * Extracts the storage path inside the profile-photos bucket from any
 * legacy/public URL or already-bare path. Returns null when the input does
 * not point at the bucket (e.g. data: URIs, gradient SVGs, external URLs).
 */
export function extractPhotoPath(input: string | null | undefined): string | null {
  if (!input) return null;
  if (input.startsWith("data:") || input.startsWith("blob:")) return null;
  // Match both `/object/public/profile-photos/<path>` and signed-url variants.
  const m = input.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/profile-photos\/([^?]+)/);
  if (m) return decodeURIComponent(m[1]);
  // Bare path like "<userId>/...".
  if (!/^https?:/i.test(input) && /^[0-9a-f-]{8,}\//i.test(input)) return input;
  return null;
}

const cache = new Map<string, { url: string; expires: number }>();

/**
 * Returns a usable image URL for a stored value. If it's a profile-photos
 * URL/path, returns a short-lived signed URL (cached). For data:/external
 * URLs, returns the input unchanged.
 */
export async function getDisplayPhotoUrl(
  input: string | null | undefined,
  expiresInSec = 3600,
): Promise<string | null> {
  if (!input) return null;
  // Server-resolved private photos may already be signed. Do not try to
  // re-sign them in the browser, because pre-conversation veiled photos are
  // intentionally delivered via a safe, short-lived URL.
  if (input.includes("/storage/v1/object/sign/profile-photos/") && input.includes("token=")) return input;
  const path = extractPhotoPath(input);
  if (!path) return input; // data: or external — pass through.

  const now = Date.now();
  const hit = cache.get(path);
  if (hit && hit.expires > now + 60_000) return hit.url;

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresInSec);
  if (error || !data?.signedUrl) return null;
  cache.set(path, { url: data.signedUrl, expires: now + expiresInSec * 1000 });
  return data.signedUrl;
}

export async function getDisplayPhotoUrls(
  inputs: Array<string | null | undefined>,
  expiresInSec = 3600,
): Promise<Array<string | null>> {
  return Promise.all(inputs.map((i) => getDisplayPhotoUrl(i, expiresInSec)));
}
