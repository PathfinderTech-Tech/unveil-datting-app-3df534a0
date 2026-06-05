import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type FailureRow = {
  id: string;
  category: string;
  severity: string;
  user_id: string | null;
  message: string;
  context: string | null;
  created_at: string;
};

export type FailureStat = {
  category: string;
  severity: string;
  count: number;
  lastAt: string;
};

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden");
}

export const getFailureStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const rpc = await (supabaseAdmin as any).rpc("admin_failure_stats", { _hours: 24 });
    const stats: FailureStat[] = (rpc.data ?? []).map((r: any) => ({
      category: r.category,
      severity: r.severity,
      count: Number(r.count),
      lastAt: r.last_at,
    }));
    const recent = await (supabaseAdmin.from("failure_logs" as any) as any)
      .select("id,category,severity,user_id,message,context,created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    const recentRows = (recent.data ?? []) as any[];
    const recentSerialized: FailureRow[] = recentRows.map((r) => ({
      id: String(r.id),
      category: String(r.category),
      severity: String(r.severity),
      user_id: r.user_id ?? null,
      message: String(r.message ?? ""),
      context: r.context == null ? null : JSON.stringify(r.context),
      created_at: String(r.created_at),
    }));
    return { stats, recent: recentSerialized };
  });
