import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { REVEAL_STAGES } from "@/lib/reveal.functions";

const POLL_MS = 60_000;
const STORAGE_KEY = "unveil-reveal-seen-v1";

type Mine = { id: string; matched_user_id: string; user_id: string };

function loadSeen(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}"); } catch { return {}; }
}
function saveSeen(map: Record<string, number>) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(map)); } catch { /* noop */ }
}

/** Polls reveal_progress and toasts when a new stage becomes available. */
export function useRevealNotifications() {
  const { user } = useAuth();
  const seenRef = useRef<Record<string, number>>(loadSeen());

  useEffect(() => {
    if (!user) return;
    let alive = true;

    async function check() {
      const { data: matches } = await supabase
        .from("matches")
        .select("id, user_id, matched_user_id, mutual_interest")
        .eq("mutual_interest", true);
      const mine = (matches ?? []) as Mine[];
      if (!alive || !mine.length) return;

      const ids = mine.map((m) => m.id);
      const { data: progress } = await supabase
        .from("reveal_progress")
        .select("match_id, user_id, day, unlocked_at")
        .in("match_id", ids)
        .eq("user_id", user!.id);

      const byMatch = new Map<string, number>();
      for (const r of (progress ?? []) as any[]) {
        byMatch.set(r.match_id, Math.max(byMatch.get(r.match_id) ?? 0, r.day));
      }

      // Build peer names
      const peerIds = mine.map((m) => (m.user_id === user!.id ? m.matched_user_id : m.user_id));
      const { data: profs } = peerIds.length
        ? await supabase.from("profiles").select("id, first_name").in("id", peerIds)
        : { data: [] as any[] };
      const nameMap = new Map((profs ?? []).map((p: any) => [p.id, p.first_name as string | null]));

      const seen = { ...seenRef.current };
      const now = Date.now();
      for (const m of mine) {
        const lastDay = byMatch.get(m.id) ?? 0;
        const lastUnlock = (progress ?? []).find((p: any) => p.match_id === m.id && p.day === lastDay);
        const lastTs = lastUnlock ? new Date(lastUnlock.unlocked_at).getTime() : 0;
        const nextDay = lastDay + 1;
        if (nextDay > 7) continue;
        const availableAt = lastTs ? lastTs + 20 * 3_600_000 : now;
        if (availableAt > now) continue;
        const seenKey = `${m.id}:${nextDay}`;
        if (seen[seenKey]) continue;

        const peerId = m.user_id === user!.id ? m.matched_user_id : m.user_id;
        const peerName = nameMap.get(peerId) ?? "your match";
        const stage = REVEAL_STAGES.find((s) => s.day === nextDay);
        toast(`Reveal ready — Day ${nextDay} with ${peerName}`, {
          description: stage ? `${stage.title}: ${stage.subtitle}` : undefined,
        });
        seen[seenKey] = now;
      }
      seenRef.current = seen;
      saveSeen(seen);
    }

    check();
    const t = setInterval(check, POLL_MS);
    return () => { alive = false; clearInterval(t); };
  }, [user]);
}
