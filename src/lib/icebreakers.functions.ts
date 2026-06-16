import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type IcebreakerCategory =
  | "fun" | "deep" | "romantic" | "career" | "travel" | "family"
  | "opener" | "compatibility" | "voice";

export type Icebreaker = { text: string; kind: IcebreakerCategory };

const USER_CATEGORIES: IcebreakerCategory[] = ["fun", "deep", "romantic", "career", "travel", "family"];

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
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.9,
    }),
  });
  if (!res.ok) {
    let detail = ""; try { detail = await res.text(); } catch { /* noop */ }
    console.error("[icebreakers] gateway failure", { status: res.status, detail: detail.slice(0, 500) });
    throw new Error("We couldn’t generate suggestions right now. Please try again shortly.");
  }
  const j = await res.json();
  return j.choices?.[0]?.message?.content ?? "[]";
}

function parseIcebreakers(raw: string, fallbackKind: IcebreakerCategory): Icebreaker[] {
  const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    const arr = JSON.parse(cleaned);
    if (!Array.isArray(arr)) return [];
    const allKinds = new Set<IcebreakerCategory>([...USER_CATEGORIES, "opener", "compatibility", "voice"]);
    return arr
      .filter((x) => x && typeof x.text === "string")
      .slice(0, 5)
      .map((x) => ({
        text: String(x.text).slice(0, 200),
        kind: (allKinds.has(x.kind) ? x.kind : fallbackKind) as IcebreakerCategory,
      }));
  } catch {
    return [];
  }
}

function parseOpener(raw: string): string {
  const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    const j = JSON.parse(cleaned);
    if (j && typeof j.opener === "string") return j.opener.slice(0, 240);
  } catch { /* noop */ }
  return cleaned.slice(0, 240);
}

export const generateIcebreakers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { peerId: string; category?: IcebreakerCategory }) => {
    if (!/^[0-9a-f-]{36}$/i.test(data.peerId)) throw new Error("Invalid peerId");
    if (data.category && !["fun","deep","romantic","career","travel","family","opener","compatibility","voice"].includes(data.category)) {
      throw new Error("Invalid category");
    }
    return data;
  })
  .handler(async ({ data, context }): Promise<{ icebreakers: Icebreaker[]; suggestedOpener: string } | { error: string }> => {
    const { supabase, userId } = context;
    try {
      // Defense in depth: require mutual match before generating icebreakers with peer context
      const { data: matchRow } = await supabase
        .from("matches")
        .select("id")
        .or(`and(user_id.eq.${userId},matched_user_id.eq.${data.peerId}),and(user_id.eq.${data.peerId},matched_user_id.eq.${userId})`)
        .eq("mutual_interest", true)
        .limit(1)
        .maybeSingle();
      if (!matchRow) return { error: "You can only generate icebreakers with a mutual match." };
      const [me, them, compat, mineAns, theirAns] = await Promise.all([
        supabase.from("profiles").select("first_name,interests,archetype,relationship_intent,bio").eq("id", userId).maybeSingle(),
        (supabase as any).rpc("get_public_match_profiles", { _targets: [data.peerId] }).then((r: any) => ({ data: (r.data ?? [])[0] ?? null })),
        supabase.rpc("compute_compatibility", { _a: userId, _b: data.peerId }).maybeSingle(),
        supabase.from("daily_answers").select("answer, daily_questions(prompt,category)").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
        supabase.from("daily_answers").select("answer, daily_questions(prompt,category)").eq("user_id", data.peerId).order("created_at", { ascending: false }).limit(5),
      ]);

      const meP: any = me.data ?? {};
      const themP: any = them.data ?? {};
      const c: any = compat.data ?? {};
      const sharedInterests = ((meP.interests ?? []) as string[]).filter((i) => (themP.interests ?? []).includes(i));

      const cat = data.category;
      const contextBlock = [
        `My name: ${meP.first_name ?? "user"}. Interests: ${(meP.interests ?? []).join(", ") || "—"}. Archetype: ${meP.archetype ?? "—"}. Intent: ${meP.relationship_intent ?? "—"}.`,
        `Their name: ${themP.first_name ?? "match"}. Interests: ${(themP.interests ?? []).join(", ") || "—"}. Archetype: ${themP.archetype ?? "—"}. Intent: ${themP.relationship_intent ?? "—"}.`,
        themP.bio ? `Their bio: ${String(themP.bio).slice(0, 240)}` : "",
        sharedInterests.length ? `Shared interests: ${sharedInterests.join(", ")}.` : "",
        `Compatibility ${c.overall ?? "n/a"}/100. Strengths: ${(c.strengths ?? []).join("; ") || "n/a"}.`,
        mineAns.data?.length ? `My recent reflections: ${mineAns.data.map((r: any) => `${r.daily_questions?.category}:${r.answer}`).join(" | ")}` : "",
        theirAns.data?.length ? `Their recent reflections: ${theirAns.data.map((r: any) => `${r.daily_questions?.category}:${r.answer}`).join(" | ")}` : "",
      ].filter(Boolean).join("\n");

      const sysIce = cat && USER_CATEGORIES.includes(cat)
        ? `You are UNVEIL's conversation coach. Voice-first, intentional, slow dating. Produce exactly 5 conversation starters in the "${cat}" category. Each ≤140 chars, warm, specific to the pair, no clichés, no pickup lines, no contact info. Return a JSON array of {text, kind:"${cat}"}. No prose, no markdown fences.`
        : `You are UNVEIL's conversation coach. Voice-first, intentional, slow dating. Produce exactly 5 conversation starters mixing categories from fun, deep, romantic, career, travel, family. Each ≤140 chars, warm, specific to the pair. Include 1 voice-first prompt (kind:"voice"). Return JSON array of {text, kind}. No prose, no markdown fences.`;

      const sysOpener = `You are UNVEIL's conversation coach. Write ONE perfect first message ${themP.first_name ?? "they"} would actually want to reply to. Reference one shared signal (interest, value, archetype). Max 180 chars. Warm, specific, no clichés. Return JSON {"opener":"..."}. No prose, no fences.`;

      const [rawIce, rawOpener] = await Promise.all([
        callGateway(sysIce, contextBlock),
        callGateway(sysOpener, contextBlock),
      ]);

      const icebreakers = parseIcebreakers(rawIce, cat ?? "opener");
      const suggestedOpener = parseOpener(rawOpener);
      if (icebreakers.length === 0 && !suggestedOpener) {
        return { error: "Couldn't parse suggestions — please try again." };
      }

      // Engagement analytics — fire-and-forget
      try {
        await supabase.from("analytics_events").insert({
          event: "icebreaker_generated",
          user_id: userId,
          properties: { peerId: data.peerId, category: cat ?? "mixed", count: icebreakers.length },
        });
      } catch { /* noop */ }

      return { icebreakers, suggestedOpener };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed to generate icebreakers" };
    }
  });
