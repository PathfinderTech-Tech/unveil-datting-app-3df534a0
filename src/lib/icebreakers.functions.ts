import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Icebreaker = { text: string; kind: "opener" | "compatibility" | "voice" };

async function callGateway(prompt: string): Promise<string> {
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
        {
          role: "system",
          content:
            "You are UNVEIL's conversation coach. Voice-first, intentional, slow dating. " +
            "Generate exactly 5 conversation starters as a JSON array of objects with keys: " +
            `'text' (max 140 chars, warm, specific, no clichés, no pickup lines, no contact info) and ` +
            `'kind' (one of "opener" | "compatibility" | "voice"). ` +
            'Include at least 1 voice-first prompt (asking them to share a voice note) and 1 compatibility-based prompt. ' +
            'Return ONLY the JSON array, no prose, no markdown fences.',
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.9,
    }),
  });
  if (res.status === 429) throw new Error("Rate limit — try again in a moment.");
  if (res.status === 402) throw new Error("AI credits exhausted. Add credits in workspace settings.");
  if (!res.ok) throw new Error(`AI gateway error ${res.status}`);
  const j = await res.json();
  return j.choices?.[0]?.message?.content ?? "[]";
}

function parseIcebreakers(raw: string): Icebreaker[] {
  const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    const arr = JSON.parse(cleaned);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x) => x && typeof x.text === "string")
      .slice(0, 5)
      .map((x) => ({
        text: String(x.text).slice(0, 200),
        kind: (["opener", "compatibility", "voice"].includes(x.kind) ? x.kind : "opener") as Icebreaker["kind"],
      }));
  } catch {
    return [];
  }
}

export const generateIcebreakers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { peerId: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(data.peerId)) throw new Error("Invalid peerId");
    return data;
  })
  .handler(async ({ data, context }): Promise<{ icebreakers: Icebreaker[] } | { error: string }> => {
    const { supabase, userId } = context;
    try {
      const [me, them, compat] = await Promise.all([
        supabase.from("profiles").select("first_name,interests,archetype,relationship_intent,bio").eq("id", userId).maybeSingle(),
        supabase.from("profiles").select("first_name,interests,archetype,relationship_intent,bio").eq("id", data.peerId).maybeSingle(),
        supabase.rpc("compute_compatibility", { _a: userId, _b: data.peerId }).maybeSingle(),
      ]);

      const meP: any = me.data ?? {};
      const themP: any = them.data ?? {};
      const c: any = compat.data ?? {};

      const prompt = [
        `My name: ${meP.first_name ?? "user"}.`,
        `My interests: ${(meP.interests ?? []).join(", ") || "unspecified"}.`,
        `My archetype: ${meP.archetype ?? "unspecified"}. My intent: ${meP.relationship_intent ?? "unspecified"}.`,
        ``,
        `Their name: ${themP.first_name ?? "match"}.`,
        `Their interests: ${(themP.interests ?? []).join(", ") || "unspecified"}.`,
        `Their archetype: ${themP.archetype ?? "unspecified"}. Their intent: ${themP.relationship_intent ?? "unspecified"}.`,
        `Their bio: ${(themP.bio ?? "").slice(0, 300)}`,
        ``,
        `Compatibility ${c.overall ?? "n/a"}/100. Strengths: ${(c.strengths ?? []).join("; ") || "n/a"}.`,
        ``,
        `Write 5 first-message ideas I could send them. Reference one shared interest or strength when possible.`,
      ].join("\n");

      const raw = await callGateway(prompt);
      const icebreakers = parseIcebreakers(raw);
      if (icebreakers.length === 0) {
        return { error: "Couldn't parse suggestions — please try again." };
      }
      return { icebreakers };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed to generate icebreakers" };
    }
  });
