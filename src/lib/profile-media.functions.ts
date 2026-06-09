import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { loadPrimaryProfileMedia } from "@/lib/profile-media.server";

export const getPrimaryProfileMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userIds: z.array(z.string().uuid()).max(100) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return loadPrimaryProfileMedia(supabaseAdmin, context.userId, data.userIds);
  });