import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AiQuotaResponse = {
  tier: string;
  dailyLimit: number; // -1 = unlimited
  used: number;
  remaining: number;
  resetsAt: string | null;
  feature: string;
};

export const getAiInsightsQuota = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { feature?: string }) => data ?? {})
  .handler(async ({ data, context }): Promise<AiQuotaResponse> => {
    const { supabase, userId } = context;
    const feature = data.feature ?? "ai_compatibility_insights";

    const { data: gate } = await supabase
      .rpc("check_ai_rate_limit", { _uid: userId, _feature: feature })
      .maybeSingle();

    const tier: string = gate?.tier ?? "free";
    const dailyLimit: number = gate?.daily_limit ?? 0;
    const used: number = gate?.used ?? 0;
    const remaining: number = gate?.remaining ?? 0;

    // Compute soonest reset: oldest success in trailing 24h + 24h
    let resetsAt: string | null = null;
    if (dailyLimit > 0 && used > 0) {
      const { data: oldest } = await supabase
        .from("ai_usage_log")
        .select("created_at")
        .eq("user_id", userId)
        .eq("feature_name", feature)
        .eq("success", true)
        .gt("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString())
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (oldest?.created_at) {
        resetsAt = new Date(new Date(oldest.created_at).getTime() + 24 * 3600 * 1000).toISOString();
      }
    }

    return { tier, dailyLimit, used, remaining, resetsAt, feature };
  });
