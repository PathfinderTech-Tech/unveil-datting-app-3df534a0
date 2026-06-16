import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Configurable model — single source of truth for Phase 1.
// Swap here to upgrade later (e.g. google/gemini-2.5-pro).
const AI_MODEL = process.env.AI_INSIGHTS_MODEL || "google/gemini-3-flash-preview";
const CACHE_TTL_HOURS = 24;

export type CompatibilityInsight = {
  overallCompatibility: number;
  romanticPotential: number;
  friendshipPotential: number;
  longTermPotential: number;
  communicationScore: number;
  sharedInterestsScore: number;
  compatibilityLabel: string;            // "Strong Match", "Promising Match", etc.
  relationshipStage: string;             // e.g. "Early Spark", "Growing Connection"
  aiSummary: string;                     // 1–2 sentence insight using real name
  suggestedNextStep: string;             // 1 sentence action
  dateIdeas: { title: string; reason: string }[]; // 3 ideas
  matchName: string;
  computedAt: string;
};

export type InsightResponse =
  | { ok: true; insight: CompatibilityInsight; cached: boolean }
  | { error: string };

async function callGateway(systemPrompt: string, userPrompt: string): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    // Log technical detail internally; never surface to users.
    let detail = "";
    try { detail = await res.text(); } catch { /* noop */ }
    console.error("[ai-compatibility] gateway failure", { status: res.status, detail: detail.slice(0, 500) });
    // Single sanitized, user-safe message for every upstream failure
    // (rate limit, billing, model, workspace, network, parse, etc.)
    throw new Error("AI_SERVICE_UNAVAILABLE");
  }
  const j = await res.json();
  return j.choices?.[0]?.message?.content ?? "{}";
}

function clamp(n: unknown, def = 50): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return def;
  return Math.max(0, Math.min(100, Math.round(v)));
}

function parseInsight(raw: string, fallbackName: string): Omit<CompatibilityInsight, "computedAt"> | null {
  const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    const j = JSON.parse(cleaned);
    const ideas = Array.isArray(j.dateIdeas) ? j.dateIdeas.slice(0, 3) : [];
    return {
      overallCompatibility: clamp(j.overallCompatibility, 60),
      romanticPotential: clamp(j.romanticPotential, 60),
      friendshipPotential: clamp(j.friendshipPotential, 60),
      longTermPotential: clamp(j.longTermPotential, 55),
      communicationScore: clamp(j.communicationScore, 60),
      sharedInterestsScore: clamp(j.sharedInterestsScore, 55),
      compatibilityLabel: String(j.compatibilityLabel ?? "Promising Match").slice(0, 40),
      relationshipStage: String(j.relationshipStage ?? "Early Spark").slice(0, 40),
      aiSummary: String(j.aiSummary ?? "").slice(0, 400),
      suggestedNextStep: String(j.suggestedNextStep ?? "").slice(0, 240),
      dateIdeas: ideas
        .filter((d: any) => d && typeof d.title === "string")
        .map((d: any) => ({
          title: String(d.title).slice(0, 60),
          reason: String(d.reason ?? "").slice(0, 200),
        })),
      matchName: fallbackName,
    };
  } catch {
    return null;
  }
}

async function computeInsight(args: {
  supabase: any;
  userId: string;
  peerId: string;
}): Promise<CompatibilityInsight> {
  const { supabase, userId, peerId } = args;

  // Verify mutual match — defense in depth
  const { data: matchRow } = await supabase
    .from("matches")
    .select("id, compatibility_score, chemistry_score, connection_score, interaction_count")
    .or(`and(user_id.eq.${userId},matched_user_id.eq.${peerId}),and(user_id.eq.${peerId},matched_user_id.eq.${userId})`)
    .eq("mutual_interest", true)
    .limit(1)
    .maybeSingle();
  if (!matchRow) throw new Error("NOT_MUTUAL");

  const [me, them, compat, recentMsgs, mineAns, theirAns] = await Promise.all([
    supabase.from("profiles").select("first_name,interests,archetype,relationship_intent,bio,values_top").eq("id", userId).maybeSingle(),
    (supabase as any).rpc("get_public_match_profiles", { _targets: [peerId] }).then((r: any) => ({ data: (r.data ?? [])[0] ?? null })),
    supabase.rpc("compute_compatibility", { _a: userId, _b: peerId }).maybeSingle(),
    supabase.from("messages")
      .select("sender_id, content, created_at")
      .or(`and(sender_id.eq.${userId}),and(sender_id.eq.${peerId})`)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("daily_answers").select("answer, daily_questions(prompt,category)").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
    supabase.from("daily_answers").select("answer, daily_questions(prompt,category)").eq("user_id", peerId).order("created_at", { ascending: false }).limit(5),
  ]);

  const meP: any = me.data ?? {};
  const themP: any = them.data ?? {};
  const c: any = compat.data ?? {};
  const themName = themP.first_name ?? "Your match";
  const sharedInterests = ((meP.interests ?? []) as string[]).filter((i) => (themP.interests ?? []).includes(i));

  const msgs = (recentMsgs.data ?? []) as { sender_id: string; content: string }[];
  const msgSnippet = msgs.slice(0, 10).map((m) => `${m.sender_id === userId ? "Me" : themName}: ${String(m.content ?? "").slice(0, 120)}`).join("\n");

  const contextBlock = [
    `My name: ${meP.first_name ?? "user"}. Interests: ${(meP.interests ?? []).join(", ") || "—"}. Archetype: ${meP.archetype ?? "—"}. Intent: ${meP.relationship_intent ?? "—"}.`,
    meP.bio ? `My bio: ${String(meP.bio).slice(0, 240)}` : "",
    `Their name: ${themName}. Interests: ${(themP.interests ?? []).join(", ") || "—"}. Archetype: ${themP.archetype ?? "—"}. Intent: ${themP.relationship_intent ?? "—"}.`,
    themP.bio ? `Their bio: ${String(themP.bio).slice(0, 240)}` : "",
    sharedInterests.length ? `Shared interests: ${sharedInterests.join(", ")}.` : "No overlapping interests listed.",
    `Internal compatibility score ${c.overall ?? matchRow.compatibility_score ?? "n/a"}/100. Chemistry ${matchRow.chemistry_score ?? "n/a"}. Connection ${matchRow.connection_score ?? "n/a"}. Interactions ${matchRow.interaction_count ?? 0}.`,
    mineAns.data?.length ? `My recent reflections: ${mineAns.data.map((r: any) => `${r.daily_questions?.category}:${r.answer}`).join(" | ")}` : "",
    theirAns.data?.length ? `Their recent reflections: ${theirAns.data.map((r: any) => `${r.daily_questions?.category}:${r.answer}`).join(" | ")}` : "",
    msgSnippet ? `Recent conversation (newest first):\n${msgSnippet}` : "No conversation history yet.",
  ].filter(Boolean).join("\n");

  const system = `You are UNVEIL's relationship intelligence engine. Analyze the compatibility between two people for slow, intentional dating.
Return STRICT JSON only — no prose, no markdown fences. Schema:
{
  "overallCompatibility": 0-100,
  "romanticPotential": 0-100,
  "friendshipPotential": 0-100,
  "longTermPotential": 0-100,
  "communicationScore": 0-100,
  "sharedInterestsScore": 0-100,
  "compatibilityLabel": "Strong Match" | "Promising Match" | "Growing Match" | "Early Spark",
  "relationshipStage": "Early Spark" | "Growing Connection" | "Deepening Bond" | "Strong Resonance",
  "aiSummary": "1-2 sentence insight USING THEIR REAL FIRST NAME (${themName}). Specific, warm, never generic.",
  "suggestedNextStep": "1 sentence concrete next action for the conversation.",
  "dateIdeas": [
    { "title": "short date title", "reason": "1 sentence why it fits THIS pair" }
  ]
}
Use the real name "${themName}" — never "User A", "Match A", "your match". Provide exactly 3 dateIdeas chosen to fit their actual interests and personalities (examples: Coffee Date, Art Gallery, Museum, Jazz Night, Cooking Class, Park Walk, Bookstore Date, Hiking Trail, Pottery Class, Sunset Picnic).`;

  const raw = await callGateway(system, contextBlock);
  const parsed = parseInsight(raw, themName);
  if (!parsed) throw new Error("AI returned unparseable response — please refresh.");
  if (parsed.dateIdeas.length < 1) parsed.dateIdeas = [{ title: "Coffee Date", reason: "A calm first IRL step that fits an early connection." }];

  return { ...parsed, computedAt: new Date().toISOString() };
}

export const getCompatibilityInsight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { peerId: string; force?: boolean }) => {
    if (!/^[0-9a-f-]{36}$/i.test(data.peerId)) throw new Error("Invalid peerId");
    return data;
  })
  .handler(async ({ data, context }): Promise<InsightResponse> => {
    const { supabase, userId } = context;
    try {
      // Premium gate — server-authoritative
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("status, current_period_end")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const isPremium = !!sub && ["active", "trialing"].includes(sub.status ?? "") &&
        (!sub.current_period_end || new Date(sub.current_period_end) > new Date());
      if (!isPremium) return { error: "PREMIUM_REQUIRED" };

      if (!data.force) {
        const { data: cached } = await supabase
          .from("ai_compatibility_insights")
          .select("payload, computed_at")
          .eq("user_id", userId)
          .eq("match_user_id", data.peerId)
          .maybeSingle();
        if (cached?.computed_at) {
          const age = (Date.now() - new Date(cached.computed_at).getTime()) / 36e5;
          if (age < CACHE_TTL_HOURS) {
            return { ok: true, cached: true, insight: cached.payload as CompatibilityInsight };
          }
        }
      }

      const insight = await computeInsight({ supabase, userId, peerId: data.peerId });

      await supabase.from("ai_compatibility_insights").upsert({
        user_id: userId,
        match_user_id: data.peerId,
        payload: insight,
        model: AI_MODEL,
        computed_at: insight.computedAt,
      }, { onConflict: "user_id,match_user_id" });

      try {
        await supabase.from("analytics_events").insert({
          event: "ai_compatibility_generated",
          user_id: userId,
          properties: { peerId: data.peerId, model: AI_MODEL, refresh: !!data.force },
        });
      } catch { /* noop */ }

      return { ok: true, cached: false, insight };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed to generate insight" };
    }
  });

export type TopMatchesResponse =
  | { ok: true; bestOverall: CompatibilityInsight | null; bestRomantic: CompatibilityInsight | null; bestFriendship: CompatibilityInsight | null; all: CompatibilityInsight[] }
  | { error: string };

export const getTopAiMatches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TopMatchesResponse> => {
    const { supabase, userId } = context;
    try {
      const { data: sub } = await supabase
        .from("subscriptions").select("status, current_period_end")
        .eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      const isPremium = !!sub && ["active", "trialing"].includes(sub.status ?? "") &&
        (!sub.current_period_end || new Date(sub.current_period_end) > new Date());
      if (!isPremium) return { error: "AI Compatibility Insights are a Premium feature." };

      // Read cached insights only — never auto-fan-out AI calls to many matches.
      const { data: rows } = await supabase
        .from("ai_compatibility_insights")
        .select("payload, match_user_id")
        .eq("user_id", userId)
        .order("computed_at", { ascending: false })
        .limit(50);

      const all = (rows ?? []).map((r: any) => r.payload as CompatibilityInsight);
      const byKey = (k: keyof CompatibilityInsight) =>
        all.slice().sort((a, b) => (b[k] as number) - (a[k] as number))[0] ?? null;

      return {
        ok: true,
        bestOverall: byKey("overallCompatibility"),
        bestRomantic: byKey("romanticPotential"),
        bestFriendship: byKey("friendshipPotential"),
        all,
      };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed to load top matches" };
    }
  });
