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
};

export type RealMatch = SynapseProfile & {
  userId: string;
  verified: boolean;
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

function toSynapse(row: DiscoverRow): RealMatch {
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

export async function loadRealMatches(limit = 30): Promise<RealMatch[]> {
  const { data, error } = await supabase.rpc("discover_profiles", { _limit: limit });
  if (error) {
    console.warn("[unveil] discover_profiles failed", error);
    return [];
  }
  return (data ?? []).map((r) => toSynapse(r as DiscoverRow));
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
