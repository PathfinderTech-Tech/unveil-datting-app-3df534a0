import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Marks the authenticated user as verified after they complete a live
 * selfie capture in /avatar. Uses the admin client to bypass the
 * profiles_guard_update trigger, which blocks user-side writes to
 * `verified`. The selfie itself is stored privately in profile-photos
 * and never exposed publicly unless the user picks it as their photo.
 */
export const markSelfieVerified = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ verified: true, updated_at: new Date().toISOString() })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
