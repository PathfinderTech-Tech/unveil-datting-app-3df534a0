import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type BetaStats = {
  totalUsers: number;
  verifiedUsers: number;
  premiumUsers: number;
  matchesCreated: number;
  messagesSent: number;
  dailyActiveUsers: number;
  verificationPending: number;
  revenueCents: number;
  revenueCurrency: string;
};

export const getBetaStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BetaStats> => {
    const { userId } = context;
    // Verify admin role
    const { data: role } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw new Error("Forbidden");

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [
      users,
      verified,
      premium,
      matches,
      messages,
      verifPending,
      dauMsgs,
      txns,
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).eq("verified", true),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).neq("subscription_tier", "free"),
      supabaseAdmin.from("matches").select("id", { count: "exact", head: true }).eq("mutual_interest", true),
      supabaseAdmin.from("messages").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("verification_requests").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
      supabaseAdmin.from("messages").select("sender_id").gte("created_at", since24h).limit(10000),
      supabaseAdmin.from("transactions").select("amount_cents,currency,status").eq("status", "paid").limit(10000),
    ]);

    const dau = new Set((dauMsgs.data ?? []).map((m: any) => m.sender_id)).size;
    let revenueCents = 0;
    let currency = "usd";
    for (const t of txns.data ?? []) {
      revenueCents += Number((t as any).amount_cents ?? 0);
      if ((t as any).currency) currency = (t as any).currency;
    }

    return {
      totalUsers: users.count ?? 0,
      verifiedUsers: verified.count ?? 0,
      premiumUsers: premium.count ?? 0,
      matchesCreated: matches.count ?? 0,
      messagesSent: messages.count ?? 0,
      dailyActiveUsers: dau,
      verificationPending: verifPending.count ?? 0,
      revenueCents,
      revenueCurrency: currency,
    };
  });
