import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useUnreadCount } from "@/hooks/use-unread";

/**
 * Exact-count badges for bottom-nav surfaces:
 *  - messages: unread conversation count (delegates to useUnreadCount)
 *  - matches:  new mutual matches the user hasn't opened (no conversation yet OR opened within 7d)
 *  - discover: incoming likes pending the user's action (someone liked me, not mutual, not passed)
 */
export function useNavBadges() {
  const { user } = useAuth();
  const messages = useUnreadCount();
  const [matches, setMatches] = useState(0);
  const [discover, setDiscover] = useState(0);
  const channelSuffixRef = useRef(Math.random().toString(36).slice(2, 10));
  const userId = user?.id;

  const refresh = useCallback(async () => {
    if (!userId) { setMatches(0); setDiscover(0); return; }
    const [{ data: mutuals }, { data: incoming }] = await Promise.all([
      supabase.from("matches")
        .select("id, created_at, user_id, matched_user_id")
        .eq("mutual_interest", true)
        .gte("created_at", new Date(Date.now() - 7 * 86400_000).toISOString()),
      supabase.from("matches")
        .select("id")
        .eq("matched_user_id", userId)
        .eq("user_interested", true)
        .eq("mutual_interest", false)
        .eq("passed", false),
    ]);
    setMatches((mutuals ?? []).length);
    setDiscover((incoming ?? []).length);
  }, [userId]);

  useEffect(() => {
    refresh();
    if (!userId) return;
    const ch = supabase.channel(`nav-badges-${userId}-${channelSuffixRef.current}`)
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "matches" }, refresh as any)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, refresh]);

  return { messages, matches, discover };
}
