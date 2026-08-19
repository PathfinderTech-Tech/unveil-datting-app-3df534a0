import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertAdmin, isAdminUser } from "@/lib/admin-auth.server";

const uuid = z.string().uuid();

export type AdminDashboardStats = {
  users: number;
  waitlistTotal: number;
  waitlistPending: number;
  approved: number;
  rejected: number;
  pendingVerif: number;
  premium: number;
  reports: number;
  messagesToday: number;
  passesToday: number;
  activePasses: number;
  verifiedBadges: number;
};

export type AdminDashboardPayload = {
  stats: AdminDashboardStats;
  verifications: any[];
  payments: any[];
  reports: any[];
  waitlist: any[];
  feedback: any[];
};

/** UI gate helper — does not throw; returns false for non-admins. */
export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const isAdmin = await isAdminUser(context.userId);
    return { isAdmin };
  });

/**
 * Load admin dashboard data. Server asserts admin role before any query;
 * uses service-role client so access does not depend on fragile client RLS alone.
 */
export const loadAdminDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminDashboardPayload> => {
    await assertAdmin(context.userId);

    const [u, wlt, wlp, wla, wlr, vp, r, p, v, pay, rep, wl, fb, mon] =
      await Promise.all([
        supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
        supabaseAdmin.from("waitlist").select("id", { count: "exact", head: true }),
        supabaseAdmin.from("waitlist").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabaseAdmin.from("waitlist").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabaseAdmin.from("waitlist").select("id", { count: "exact", head: true }).eq("status", "rejected"),
        supabaseAdmin
          .from("verification_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending_review"),
        supabaseAdmin.from("reports").select("id", { count: "exact", head: true }),
        supabaseAdmin.from("subscriptions").select("id", { count: "exact", head: true }).neq("tier", "free"),
        supabaseAdmin
          .from("verification_requests")
          .select("*")
          .in("status", ["pending_review", "submitted", "approved", "rejected"])
          .order("submitted_at", { ascending: false })
          .limit(50),
        supabaseAdmin
          .from("transactions")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50),
        supabaseAdmin
          .from("reports")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(20),
        supabaseAdmin
          .from("waitlist")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200),
        supabaseAdmin
          .from("feedback")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50),
        (supabaseAdmin as any).rpc("admin_monetization_stats"),
      ]);

    const m = Array.isArray(mon.data) ? mon.data[0] : mon.data;

    return {
      stats: {
        users: u.count || 0,
        waitlistTotal: wlt.count || 0,
        waitlistPending: wlp.count || 0,
        approved: wla.count || 0,
        rejected: wlr.count || 0,
        pendingVerif: vp.count || 0,
        premium: p.count || 0,
        reports: r.count || 0,
        messagesToday: Number(m?.messages_today ?? 0),
        passesToday: Number(m?.daily_passes_today ?? 0),
        activePasses: Number(m?.active_message_passes ?? 0),
        verifiedBadges: Number(m?.verified_badges ?? 0),
      },
      verifications: (v.data || []) as any[],
      payments: (pay.data || []) as any[],
      reports: (rep.data || []) as any[],
      waitlist: (wl.data || []) as any[],
      feedback: (fb.data || []) as any[],
    };
  });

export const adminReviewWaitlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: uuid,
        status: z.enum(["approved", "rejected"]),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const patch = {
      status: data.status,
      reviewed_at: new Date().toISOString(),
      ...(data.status === "approved" ? { approved_at: new Date().toISOString() } : {}),
    };
    const { error } = await supabaseAdmin.from("waitlist").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminReviewVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: uuid,
        userId: uuid,
        decision: z.enum(["approved", "rejected"]),
        notes: z.string().max(2000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);

    const { error: vErr } = await supabaseAdmin
      .from("verification_requests")
      .update({
        status: data.decision,
        reviewer_notes: data.notes ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (vErr) throw new Error(vErr.message);

    if (data.decision === "approved") {
      const { error: pErr } = await supabaseAdmin
        .from("profiles")
        .update({
          verified: true,
          trust_score: 100,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.userId);
      if (pErr) throw new Error(pErr.message);
    }

    return { ok: true as const };
  });

export const loadAdminTrustProfiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    // Query via service role directly — do not call admin_list_trust_profiles RPC,
    // which checks auth.uid() and fails when invoked with the service-role client.
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, first_name, trust_level, location_risk_score, location_mismatch_count, travel_status, travel_expires_at, travel_warning_count, account_restricted, home_country_code, current_country_code, verified_country_code, verified",
      )
      .order("location_risk_score", { ascending: false, nullsFirst: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { rows: (data ?? []) as any[] };
  });

export const loadAdminLocationHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: uuid }).parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { data: rows, error } = await supabaseAdmin
      .from("location_verifications")
      .select("*")
      .eq("user_id", data.userId)
      .order("verified_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return { rows: (rows ?? []) as any[] };
  });
