// Real DB-backed matching. Calls the discover_profiles / like_profile RPCs
// and maps the rows to the SynapseProfile shape used by the UI.
import { supabase } from "@/integrations/supabase/client";
import {
  computeComposite, deriveArchetype, type CharacterDNA, type SynapseProfile,
  type Profession,
} from "@/lib/synapse-store";

type DiscoverRow = {
  id: string;
  first_name: string | null;
  age: number | null;
  city: string | null;
  gender: string | null;
  intention: string | null;
  interested_in: string | null;
  bio: string | null;
  archetype: string | null;
  photo_url: string | null;
  photo_reveal_stage: string | null;
  compatibility_score: number | null;
  curiosity_level: number | null;
  emotional_rhythm: Record<string, number> | null;
  verified: boolean | null;
  country: string | null;
  preferred_language: string | null;
  relationship_intent: string | null;
  location_enabled: boolean | null;
  location_privacy: string | null;
  lat_approx: number | null;
  lng_approx: number | null;
  distance_km: number | null;
  strengths: string[] | null;
};

export type MatchTag = "Nearby" | "Same City" | "Same Country" | "Global Match" | "Travel Match" | "Language Match";

export type RealMatch = SynapseProfile & {
  userId: string;
  verified: boolean;
  country: string | null;
  language: string | null;
  relationshipIntent: string | null;
  locationEnabled: boolean;
  locationPrivacy: string;
  distanceKm: number | null;
  tags: MatchTag[];
  strengths: string[];
  pairScore: number;
};

export type DiscoverFilters = {
  limit?: number;
  nearbyOnly?: boolean;
  radiusKm?: number | null;
  country?: string | null;
  language?: string | null;
  intent?: string | null;
  ageMin?: number | null;
  ageMax?: number | null;
};

function characterFrom(row: DiscoverRow): CharacterDNA {
  const er = row.emotional_rhythm ?? {};
  const clamp = (n: unknown) =>
    typeof n === "number" && Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 50;
  return {
    warmth: clamp(er.warmth),
    curiosity: clamp(er.curiosity ?? row.curiosity_level),
    adventure: clamp(er.adventure),
    loyalty: clamp(er.loyalty),
    humor: clamp(er.humor),
    ambition: clamp(er.ambition),
  };
}

type Me = {
  country: string | null;
  language: string | null;
  city: string | null;
  locationEnabled: boolean;
};

function tagsFor(row: DiscoverRow, me: Me): MatchTag[] {
  const tags: MatchTag[] = [];
  const d = row.distance_km;
  if (me.locationEnabled && row.location_enabled && d != null && d <= 80) tags.push("Nearby");
  if (me.city && row.city && row.city.toLowerCase() === me.city.toLowerCase()) tags.push("Same City");
  if (me.country && row.country && row.country === me.country) tags.push("Same Country");
  if (me.country && row.country && row.country !== me.country) {
    tags.push(d != null && d > 800 ? "Travel Match" : "Global Match");
  }
  if (me.language && row.preferred_language && row.preferred_language === me.language) tags.push("Language Match");
  return tags;
}

function toSynapse(row: DiscoverRow, me: Me): RealMatch {
  const character = characterFrom(row);
  const mindScore = Math.max(20, Math.min(99, row.compatibility_score ?? 65));
  const faceHarmony = 70;
  const archetype = deriveArchetype(character, mindScore);
  const base = {
    name: row.first_name || "Someone",
    age: row.age ?? 25,
    city: row.city || "—",
    profession: "creative" as Profession,
    professionLabel: row.intention ? labelForIntention(row.intention) : "Open",
    faceHarmony,
    mindScore,
    character,
    archetype,
    bio: row.bio || undefined,
    avatar: `${row.id.slice(0, 6)}-180`,
  };
  return {
    ...base,
    composite: computeComposite(base),
    userId: row.id,
    verified: !!row.verified,
    country: row.country,
    language: row.preferred_language,
    relationshipIntent: row.relationship_intent,
    locationEnabled: !!row.location_enabled,
    locationPrivacy: row.location_privacy || "distance",
    distanceKm: row.distance_km != null ? Number(row.distance_km) : null,
    tags: tagsFor(row, me),
  };
}

function labelForIntention(i: string): string {
  switch (i) {
    case "serious": return "Long-term";
    case "open": return "Open";
    case "friendship": return "Friendship";
    case "exploring": return "Exploring";
    default: return i;
  }
}

async function loadMe(): Promise<Me> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return { country: null, language: null, city: null, locationEnabled: false };
  const { data } = await supabase
    .from("profiles")
    .select("country, preferred_language, city, location_enabled")
    .eq("id", uid)
    .maybeSingle();
  return {
    country: data?.country ?? null,
    language: data?.preferred_language ?? null,
    city: data?.city ?? null,
    locationEnabled: !!data?.location_enabled,
  };
}

export async function loadRealMatches(filters: DiscoverFilters | number = 40): Promise<RealMatch[]> {
  const f: DiscoverFilters = typeof filters === "number" ? { limit: filters } : filters;
  const me = await loadMe();
  const { data, error } = await supabase.rpc("discover_profiles", {
    _limit: f.limit ?? 40,
    _radius_km: f.radiusKm ?? null,
    _nearby_only: !!f.nearbyOnly,
    _country: f.country ?? null,
    _language: f.language ?? null,
    _intent: f.intent ?? null,
    _age_min: f.ageMin ?? null,
    _age_max: f.ageMax ?? null,
  } as never);
  if (error) {
    console.warn("[unveil] discover_profiles failed", error);
    return [];
  }
  return (data ?? []).map((r) => toSynapse(r as DiscoverRow, me));
}

export function distanceLabel(km: number | null): string | null {
  if (km == null) return null;
  if (km < 1) return "Same area";
  const mi = km / 1.609;
  if (km <= 8) return `Within ${Math.max(1, Math.round(mi))} miles`;
  if (km <= 16) return "Within 10 miles";
  if (km <= 40) return "Within 25 miles";
  if (km <= 80) return "Within 50 miles";
  if (km <= 160) return "Within 100 miles";
  return `Around ${Math.round(mi / 10) * 10} miles away`;
}

export async function likeProfile(targetUserId: string) {
  const { data, error } = await supabase.rpc("like_profile", { _target: targetUserId });
  if (error) return { error: error.message, mutual: false, conversationId: null as string | null };
  const row = Array.isArray(data) ? data[0] : data;
  return {
    error: null,
    mutual: !!row?.mutual,
    conversationId: (row?.conversation_id as string | null) ?? null,
  };
}
