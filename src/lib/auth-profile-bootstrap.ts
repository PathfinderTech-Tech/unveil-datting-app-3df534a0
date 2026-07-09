import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

function firstNonEmpty(values: Array<unknown>): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return null;
}

function deriveFirstName(user: User): string | null {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const explicit = firstNonEmpty([
    meta.first_name,
    meta.given_name,
    meta.name,
    meta.full_name,
    user.email,
    user.phone,
  ]);
  if (!explicit) return null;
  // Keep only the leading token so the UI can render a friendly short name.
  return explicit.split(/\s+/)[0] || null;
}

/**
 * Ensure every authenticated account has a usable profile row, regardless of
 * provider (phone/email/google/apple). This is a client-side safety net when
 * auth trigger execution or legacy users leave gaps.
 */
export async function ensureProfileForUser(user: User): Promise<void> {
  const firstName = deriveFirstName(user);
  const phone = typeof user.phone === "string" && user.phone.trim() ? user.phone.trim() : null;

  // 1) Ensure row existence without clobbering existing profile data.
  const { error: upsertError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        first_name: firstName,
        phone_number: phone,
        verified_phone: phone,
        phone_verified_at: phone ? new Date().toISOString() : null,
      },
      { onConflict: "id", ignoreDuplicates: true },
    );
  if (upsertError) {
    console.warn("[auth-profile-bootstrap] upsert failed", upsertError);
    return;
  }

  // 2) Backfill missing core fields for existing rows only when empty.
  const { data: row, error: rowError } = await supabase
    .from("profiles")
    .select("first_name, phone_number, verified_phone")
    .eq("id", user.id)
    .maybeSingle();
  if (rowError || !row) {
    if (rowError) console.warn("[auth-profile-bootstrap] profile read failed", rowError);
    return;
  }

  const patch: Record<string, string | null> = {};
  if (!row.first_name && firstName) patch.first_name = firstName;
  if (!row.phone_number && phone) patch.phone_number = phone;
  if (!row.verified_phone && phone) {
    patch.verified_phone = phone;
    patch.phone_verified_at = new Date().toISOString();
  }
  if (Object.keys(patch).length === 0) return;

  const { error: patchError } = await supabase
    .from("profiles")
    .update(patch as never)
    .eq("id", user.id);
  if (patchError) console.warn("[auth-profile-bootstrap] profile patch failed", patchError);
}
