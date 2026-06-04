import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const STYLES = {
  communication_style: ["Direct", "Reflective", "Playful", "Diplomatic"],
  attachment_style: ["Secure", "Anxious", "Avoidant", "Fearful"],
  conflict_style: ["Lean in", "Pause", "Repair quickly", "Need space"],
  leadership_style: ["Initiator", "Collaborator", "Strategist", "Supporter"],
  relationship_style: ["Devoted partnership", "Independent bond", "Adventurous", "Slow-burn"],
} as const;

export const STYLE_OPTIONS = STYLES;

export const getBlueprint = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId?: string }) => d ?? {})
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const target = data.userId && /^[0-9a-f-]{36}$/i.test(data.userId) ? data.userId : userId;
    if (target !== userId) {
      // Defense in depth: require mutual match to view another user's blueprint
      const { data: m } = await supabase
        .from("matches")
        .select("id")
        .or(`and(user_id.eq.${userId},matched_user_id.eq.${target}),and(user_id.eq.${target},matched_user_id.eq.${userId})`)
        .eq("mutual_interest", true)
        .limit(1)
        .maybeSingle();
      if (!m) return { blueprint: null, isOwner: false };
    }
    const { data: bp } = await supabase
      .from("personality_blueprint")
      .select("*")
      .eq("user_id", target)
      .maybeSingle();
    return { blueprint: bp, isOwner: target === userId };
  });

export const updateBlueprint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Partial<Record<keyof typeof STYLES, string>>) => {
    const out: Record<string, string | null> = {};
    for (const k of Object.keys(STYLES) as (keyof typeof STYLES)[]) {
      const v = d[k];
      if (v == null) continue;
      if (typeof v !== "string" || v.length > 64) throw new Error(`Invalid ${k}`);
      out[k] = v;
    }
    return out;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("personality_blueprint")
      .upsert({ user_id: userId, ...data, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    await supabase.rpc("compute_readiness_score", { _uid: userId });
    return { ok: true };
  });
