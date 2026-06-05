// Server function to load a public-safe slice of a profile for the Passport
// share page. Uses supabaseAdmin so the page works for visitors regardless of
// session / RLS state, but only returns non-sensitive display fields.
import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type PublicPassport = {
  id: string;
  firstName: string | null;
  city: string | null;
  country: string | null;
  archetype: string | null;
  readinessScore: number | null;
  avatarUrl: string | null;
  photoUrl: string | null;
  profilePhotoUrl: string | null;
  verified: boolean;
};

async function signIfNeeded(input: string | null): Promise<string | null> {
  if (!input) return null;
  if (input.startsWith("data:") || /^https?:\/\//i.test(input) === false && !/^[0-9a-f-]{8,}\//i.test(input)) {
    return input;
  }
  if (/^https?:/i.test(input) && !input.includes("/profile-photos/")) return input;
  // Extract bucket path
  const m = input.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/profile-photos\/([^?]+)/);
  const path = m ? decodeURIComponent(m[1]) : input;
  const { data } = await supabaseAdmin.storage.from("profile-photos").createSignedUrl(path, 60 * 60 * 24 * 7);
  return data?.signedUrl ?? null;
}

export const loadPublicPassport = createServerFn({ method: "GET" })
  .inputValidator((d: { userId: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(d.userId)) throw new Error("Invalid userId");
    return d;
  })
  .handler(async ({ data }): Promise<PublicPassport | null> => {
    const { data: row } = await supabaseAdmin
      .from("profiles")
      .select("id, first_name, city, country, archetype, readiness_score, avatar_url, photo_url, profile_photo_url")
      .eq("id", data.userId)
      .maybeSingle();
    if (!row) return null;
    const [avatar, photo, profilePhoto] = await Promise.all([
      signIfNeeded(row.avatar_url ?? null),
      signIfNeeded(row.photo_url ?? null),
      signIfNeeded(row.profile_photo_url ?? null),
    ]);
    return {
      id: row.id,
      firstName: row.first_name ?? null,
      city: row.city ?? null,
      country: row.country ?? null,
      archetype: row.archetype ?? null,
      readinessScore: row.readiness_score ?? null,
      avatarUrl: avatar,
      photoUrl: photo,
      profilePhotoUrl: profilePhoto,
    };
  });
