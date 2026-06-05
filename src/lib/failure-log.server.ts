import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type FailureCategory =
  | "avatar_generation"
  | "message_delivery"
  | "payment"
  | "verification"
  | "passport_share"
  | "notification_badge";

export type FailureSeverity = "warn" | "error" | "critical";

/**
 * Server-only helper. Fire-and-forget logger for operational failures
 * surfaced by edge logic (server functions, webhooks). Never throws —
 * monitoring must not take down user-facing flows.
 */
export async function logFailure(args: {
  category: FailureCategory;
  message: string;
  severity?: FailureSeverity;
  userId?: string | null;
  context?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    // Cast through `any` until the generated Supabase types include
    // failure_logs (the table is created by a migration in the same change).
    await (supabaseAdmin.from("failure_logs" as any) as any).insert({
      category: args.category,
      severity: args.severity ?? "error",
      user_id: args.userId ?? null,
      message: args.message.slice(0, 2000),
      context: args.context ?? null,
    });
  } catch (e) {
    // Last-resort: never throw from logger.
    // eslint-disable-next-line no-console
    console.error("[failure-log] insert failed", e);
  }
}
