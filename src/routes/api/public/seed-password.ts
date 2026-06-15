/**
 * ONE-SHOT admin endpoint to set a password on unveilbest@gmail.com.
 * Hard-coded to that single user + password to limit blast radius.
 * DELETE THIS FILE after running.
 */
import { createFileRoute } from "@tanstack/react-router";

const TARGET_USER_ID = "65bcb848-5d15-4ebe-8331-0b2515f5d66a";
const TARGET_EMAIL = "unveilbest@gmail.com";
const EXPECTED_PASSWORD = "GetUnveil@1369";
const NONCE = "unveil-seed-2026-06-15";

export const Route = createFileRoute("/api/public/seed-password")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as {
          nonce?: string;
          password?: string;
        };
        if (body.nonce !== NONCE) return new Response("forbidden", { status: 403 });
        if (body.password !== EXPECTED_PASSWORD)
          return new Response("password mismatch", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
          TARGET_USER_ID,
          { password: EXPECTED_PASSWORD, email_confirm: true }
        );
        if (error) {
          return Response.json(
            { ok: false, error: error.message, code: error.status },
            { status: 500 }
          );
        }
        return Response.json({
          ok: true,
          user_id: data.user?.id,
          email: data.user?.email,
          target_email: TARGET_EMAIL,
        });
      },
    },
  },
});
