import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type HiddenMatch = {
  id: string;
  firstName: string | null;
  age: number | null;
  city: string | null;
  country: string | null;
  archetype: string | null;
  bio: string | null;
  photoUrl: string | null;
  similarityScore: number;
  complementaryScore: number;
  sharedValues: string[];
  growthOpportunities: string[];
  locked: boolean;
};

export type WhyWeMatch = {
  similarity: number;
  complementary: number;
  sharedValues: string[];
  growthOpportunities: string[];
  communicationDynamics: string;
  strengths: string[];
  challenges: string[];
  insight: string;
  topics: string[];
};

const FREE_VISIBLE = 3;

async function isPremium(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("subscriptions")
    .select("status,current_period_end")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return false;
  const active = ["active", "trialing"].includes(data.status ?? "");
  const live = !data.current_period_end || new Date(data.current_period_end) > new Date();
  return active && live;
}

export const loadHiddenMatches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { limit?: number }) => ({ limit: Math.max(1, Math.min(50, d?.limit ?? 20)) }))
  .handler(async ({ data, context }): Promise<{ matches: HiddenMatch[]; total: number; premium: boolean; }> => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase.rpc("discover_hidden_matches", { _limit: data.limit });
    if (error) throw new Error(error.message);
    const premium = await isPremium(supabase, userId);

    const all = (rows ?? []) as any[];
    // Overlay the real selfie (private bucket) over the public photo_url
    // which may be a generated initial-style avatar.
    const ids = all.map((r) => r.id).filter(Boolean);
    const realPhotos = new Map<string, string | null>();
    if (ids.length) {
      const { data: pp } = await supabase
        .from("profiles")
        .select("id, profile_photo_url")
        .in("id", ids);
      for (const row of (pp ?? []) as Array<{ id: string; profile_photo_url: string | null }>) {
        realPhotos.set(row.id, row.profile_photo_url);
      }
    }
    const matches: HiddenMatch[] = all.map((r, idx) => {
      const lock = !premium && idx >= FREE_VISIBLE;
      const realPhoto = realPhotos.get(r.id) ?? null;
      return {
        id: r.id,
        firstName: lock ? null : r.first_name,
        age: lock ? null : r.age,
        city: lock ? null : r.city,
        country: lock ? null : r.country,
        archetype: lock ? null : r.archetype,
        bio: lock ? null : r.bio,
        photoUrl: lock ? null : (realPhoto ?? r.photo_url),
        similarityScore: r.similarity_score ?? 0,
        complementaryScore: r.complementary_score ?? 0,
        sharedValues: lock ? [] : (r.shared_values ?? []),
        growthOpportunities: lock ? [] : (r.growth_opportunities ?? []),
        locked: lock,
      };
    });
    return { matches, total: all.length, premium };
  });

export const whyWeMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { peerId: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(d.peerId)) throw new Error("Invalid peerId");
    return d;
  })
  .handler(async ({ data, context }): Promise<{ data: WhyWeMatch } | { error: string }> => {
    const { supabase, userId } = context;
    try {
      const { data: rows, error } = await supabase.rpc("compute_why_we_match", { _a: userId, _b: data.peerId });
      if (error) throw new Error(error.message);
      const r: any = Array.isArray(rows) ? rows[0] : rows;

      // AI insight via Lovable Gateway
      let insight = "Strong potential lies in your complementary rhythms — explore where you naturally differ.";
      let topics: string[] = [];
      const key = process.env.LOVABLE_API_KEY;
      if (key) {
        try {
          const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              temperature: 0.7,
              messages: [
                {
                  role: "system",
                  content: 'You are UNVEIL Relationship Intelligence. Return JSON {"insight": string (max 280 chars, warm, specific, no clichés), "topics": string[] (4 short conversation topics, max 50 chars each)}. No markdown.',
                },
                {
                  role: "user",
                  content: `Similarity ${r?.similarity_score}/100, complementary ${r?.complementary_score}/100.
Shared values: ${(r?.shared_values ?? []).join(", ") || "—"}.
Growth opportunities: ${(r?.growth_opportunities ?? []).join(", ") || "—"}.
Communication: ${r?.communication_dynamics ?? "—"}.
Strengths: ${(r?.strengths ?? []).join(", ") || "—"}.
Challenges: ${(r?.challenges ?? []).join(", ") || "—"}.`,
                },
              ],
            }),
          });
          if (res.ok) {
            const j = await res.json();
            const raw = (j.choices?.[0]?.message?.content ?? "").replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
            const parsed = JSON.parse(raw);
            if (parsed?.insight) insight = String(parsed.insight).slice(0, 320);
            if (Array.isArray(parsed?.topics)) topics = parsed.topics.slice(0, 4).map((t: any) => String(t).slice(0, 80));
          }
        } catch { /* keep fallback */ }
      }

      // Analytics
      try {
        await supabase.from("analytics_events").insert({
          event: "why_we_match_open",
          user_id: userId,
          properties: { peerId: data.peerId, similarity: r?.similarity_score, complementary: r?.complementary_score },
        });
      } catch { /* noop */ }

      return {
        data: {
          similarity: r?.similarity_score ?? 0,
          complementary: r?.complementary_score ?? 0,
          sharedValues: r?.shared_values ?? [],
          growthOpportunities: r?.growth_opportunities ?? [],
          communicationDynamics: r?.communication_dynamics ?? "",
          strengths: r?.strengths ?? [],
          challenges: r?.challenges ?? [],
          insight,
          topics,
        },
      };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed" };
    }
  });

export const logHiddenMatchView = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { peerId: string; kind: "view" | "unlock" | "message" }) => {
    if (!/^[0-9a-f-]{36}$/i.test(d.peerId)) throw new Error("Invalid peerId");
    if (!["view", "unlock", "message"].includes(d.kind)) throw new Error("Invalid kind");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("hidden_match_views").insert({
      user_id: userId,
      target_user_id: data.peerId,
      kind: data.kind,
    });
    return { ok: true };
  });
