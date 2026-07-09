import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type MessageQuota = {
  dailyLimit: number;
  used: number;
  remaining: number;
  resetsAt: string | null;
  unlimited: boolean;
  premiumUntil: string | null;
  messagePassUntil: string | null;
  loading: boolean;
};

const DEFAULT: MessageQuota = {
  dailyLimit: 5,
  used: 0,
  remaining: 5,
  resetsAt: null,
  unlimited: false,
  premiumUntil: null,
  messagePassUntil: null,
  loading: true,
};

const QUOTA_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("quota timeout")), ms);
    }),
  ]);
}

export function useMessageQuota() {
  const [quota, setQuota] = useState<MessageQuota>(DEFAULT);

  const refresh = useCallback(async () => {
    try {
      const { data: { user } } = await withTimeout(supabase.auth.getUser(), QUOTA_TIMEOUT_MS);
      if (!user) {
        setQuota({ ...DEFAULT, loading: false });
        return;
      }
      const { data } = await withTimeout<{ data: any }>(
        (supabase as any).rpc("get_message_quota", { _uid: user.id }),
        QUOTA_TIMEOUT_MS,
      );
      const row = Array.isArray(data) ? data[0] : data;
      if (row) {
        setQuota({
          dailyLimit: row.daily_limit ?? 5,
          used: row.used ?? 0,
          remaining: row.remaining ?? 5,
          resetsAt: row.resets_at ?? null,
          unlimited: !!row.unlimited,
          premiumUntil: row.premium_until ?? null,
          messagePassUntil: row.message_pass_until ?? null,
          loading: false,
        });
      } else {
        setQuota({ ...DEFAULT, loading: false });
      }
    } catch (error) {
      console.warn("[quota] failed; using defaults", error);
      setQuota({ ...DEFAULT, loading: false });
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { quota, refresh };
}

export function formatRemainingTime(iso: string | null): string {
  if (!iso) return "";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "expired";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
