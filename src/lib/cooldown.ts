import { supabase } from "@/integrations/supabase/client";

/**
 * Returns the timestamp (ms) at which the email may re-register, or null if not in cooldown.
 */
export async function getEmailCooldown(email: string): Promise<number | null> {
  if (!email) return null;
  const { data, error } = await supabase.rpc("check_email_cooldown", { _email: email });
  if (error || !data) return null;
  const t = new Date(data as string).getTime();
  return t > Date.now() ? t : null;
}

export function formatCooldownRemaining(untilMs: number): string {
  const ms = Math.max(0, untilMs - Date.now());
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function cooldownMessage(untilMs: number): string {
  return `You recently deleted this account. You can create a new account again after 24 hours (about ${formatCooldownRemaining(untilMs)} remaining). Need help? Contact support@unveil.best`;
}

export async function logDeletionAttempt(email: string, provider: string, outcome: string) {
  try {
    await supabase.rpc("log_deletion_attempt", {
      _email: email,
      _provider: provider,
      _outcome: outcome,
    });
  } catch {
    // best effort
  }
}
