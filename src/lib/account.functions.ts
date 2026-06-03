import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Permanently delete the authenticated user's account.
 * - Records the deletion in account_deletions to enforce a 24h re-registration cooldown.
 * - Removes user-owned rows from public tables.
 * - Deletes the auth user (which cascades to remaining rows via FKs to auth.users).
 */
export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: true } | { error: string }> => {
    const { userId, supabase } = context;
    try {
      const { data: u } = await supabase.auth.getUser();
      const email = u.user?.email ?? null;
      const provider = (u.user?.app_metadata?.provider as string) || "email";

      // Record deletion (used by handle_new_user trigger to enforce cooldown).
      if (email) {
        await supabaseAdmin
          .from("account_deletions")
          .insert({ email, user_id: userId, provider });
      }

      // Best-effort cleanup of user-owned rows that don't cascade.
      // (Tables with user_id columns — RLS bypassed via service role.)
      const tables = [
        "thoughts",
        "messages",
        "message_reactions",
        "message_reads",
        "typing_indicators",
        "shared_contacts",
        "saved_profiles",
        "blocks",
        "reports",
        "date_plans",
        "reveal_progress",
        "first_impression_responses",
        "spark_answers",
        "daily_answers",
        "content_completions",
        "challenge_results",
        "game_results",
        "puzzle_scores",
        "hidden_match_views",
        "personality_blueprint",
        "onboarding_answers",
        "user_badges",
        "device_tokens",
        "analytics_events",
        "feedback",
        "matches",
        "conversations",
        "subscriptions",
        "verification_payments",
        "transactions",
        "user_roles",
        "profiles",
      ];
      for (const t of tables) {
        try {
          // user_id-keyed
          // @ts-expect-error dynamic table name
          await supabaseAdmin.from(t).delete().or(
            t === "blocks"
              ? `blocker_id.eq.${userId},blocked_id.eq.${userId}`
              : t === "reports"
              ? `reporter_id.eq.${userId},reported_user_id.eq.${userId}`
              : t === "matches"
              ? `user_id.eq.${userId},matched_user_id.eq.${userId}`
              : t === "conversations"
              ? `user_a.eq.${userId},user_b.eq.${userId}`
              : t === "shared_contacts"
              ? `user_id.eq.${userId},matched_user_id.eq.${userId}`
              : t === "thoughts"
              ? `sender_id.eq.${userId},recipient_id.eq.${userId}`
              : t === "messages"
              ? `sender_id.eq.${userId}`
              : t === "date_plans"
              ? `proposer_id.eq.${userId},invitee_id.eq.${userId}`
              : t === "first_impression_responses" ||
                t === "message_reactions" ||
                t === "message_reads" ||
                t === "typing_indicators"
              ? `user_id.eq.${userId}`
              : t === "saved_profiles" || t === "hidden_match_views"
              ? `user_id.eq.${userId},target_user_id.eq.${userId}`
              : t === "profiles"
              ? `id.eq.${userId}`
              : `user_id.eq.${userId}`,
          );
        } catch {
          // continue best-effort
        }
      }

      // Finally, delete the auth user.
      const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (delErr) return { error: delErr.message };

      return { ok: true };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed to delete account" };
    }
  });
