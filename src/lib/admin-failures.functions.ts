import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type FailureRow = {
  id: string;
  category: string;
  severity: string;
  user_id: string | null;
  message: string;
  context: Record<string, unknown> | null;
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
    return { stats, recent: (recent.data ?? []) as FailureRow[] };
  });
