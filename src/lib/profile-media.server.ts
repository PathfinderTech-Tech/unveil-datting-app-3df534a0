const BUCKET = "profile-photos";

export type PrimaryProfileMedia = {
  id: string;
  firstName: string | null;
  photoUrl: string | null;
  avatarUrl: string | null;
  discoveryMode: "avatar" | "photo" | null;
  hasUploadedPhoto: boolean;
};

type ProfileRow = {
  id: string;
  first_name: string | null;
  profile_photo_url: string | null;
  photo_url: string | null;
  avatar_url: string | null;
  discovery_mode: string | null;
  onboarding_complete: boolean | null;
};

const PHOTO_EXT = /\.(avif|gif|heic|heif|jpe?g|png|svg|webp)$/i;

export async function loadPrimaryProfileMedia(
  supabaseAdmin: any,
  viewerId: string,
  userIds: string[],
): Promise<PrimaryProfileMedia[]> {
  const ids = Array.from(new Set(userIds.filter(Boolean))).slice(0, 100);
  if (!ids.length) return [];

  const [{ data: rows }, { data: blocks }] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("id, first_name, profile_photo_url, photo_url, avatar_url, discovery_mode, onboarding_complete")
      .in("id", ids),
    supabaseAdmin
      .from("blocks")
      .select("blocker_id, blocked_id")
      .or(`blocker_id.eq.${viewerId},blocked_id.eq.${viewerId}`),
  ]);

  const blocked = new Set<string>();
  for (const b of blocks ?? []) {
    if (b.blocker_id === viewerId) blocked.add(b.blocked_id);
    if (b.blocked_id === viewerId) blocked.add(b.blocker_id);
  }

  const out: PrimaryProfileMedia[] = [];
  for (const row of (rows ?? []) as ProfileRow[]) {
    if (blocked.has(row.id)) continue;
    if (row.id !== viewerId && row.onboarding_complete !== true) continue;

    const explicitPhoto = firstNonNull(
      await signStoredPhoto(supabaseAdmin, row.profile_photo_url, true),
      await findLatestUploadedPhoto(supabaseAdmin, row.id),
      await signStoredPhoto(supabaseAdmin, row.photo_url, false),
      await signStoredPhoto(supabaseAdmin, row.avatar_url, false),
    );
    const avatarUrl = await signStoredPhoto(supabaseAdmin, row.avatar_url, false);

    out.push({
      id: row.id,
      firstName: cleanName(row.first_name),
      photoUrl: explicitPhoto,
      avatarUrl,
      discoveryMode: (row.discovery_mode === "avatar" || row.discovery_mode === "photo") ? row.discovery_mode : null,
      hasUploadedPhoto: !!explicitPhoto,
    });
  }

  return out;
}

function cleanName(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function firstNonNull(...values: Array<string | null>): string | null {
  return values.find((v): v is string => !!v) ?? null;
}

function extractPhotoPath(input: string | null | undefined): string | null {
  if (!input || input.startsWith("data:") || input.startsWith("blob:")) return null;
  const m = input.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/profile-photos\/([^?]+)/);
  if (m) return decodeURIComponent(m[1]);
  if (!/^https?:/i.test(input) && /^[0-9a-f-]{8,}\//i.test(input)) return input;
  return null;
}

async function signStoredPhoto(supabaseAdmin: any, input: string | null | undefined, allowAvatarFolder: boolean): Promise<string | null> {
  if (!input || input.startsWith("data:") || input.startsWith("blob:")) return null;
  if (!allowAvatarFolder && input.includes("/avatars/")) return null;

  const path = extractPhotoPath(input);
  if (!path) return input;
  if (!allowAvatarFolder && path.includes("/avatars/")) return null;

  const { data } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

async function findLatestUploadedPhoto(supabaseAdmin: any, userId: string): Promise<string | null> {
  for (const folder of [userId, `${userId}/photos`, `${userId}/selfies`]) {
    const { data } = await supabaseAdmin.storage
      .from(BUCKET)
      .list(folder, { limit: 100, sortBy: { column: "created_at", order: "desc" } });
    const file = (data ?? []).find((f: any) =>
      f?.name && f.name !== "avatars" && !f.name.startsWith(".") && PHOTO_EXT.test(f.name)
    );
    if (file?.name) {
      const path = `${folder}/${file.name}`;
      const { data: signed } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(path, 3600);
      if (signed?.signedUrl) return signed.signedUrl;
    }
  }
  return null;
}