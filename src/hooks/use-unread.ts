import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

/**
 * Count of conversations with at least one unread message for the current user.
 */
export function useUnreadCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setCount(0);
      return;
    }
    let alive = true;

    async function refresh() {
      // Pull conversations the user is part of
      const { data: convs } = await supabase
        .from("conversations")
        .select("id");
      if (!alive || !convs?.length) {
        setCount(0);
        return;
      }
      const convIds = convs.map((c: { id: string }) => c.id);
      const { data: msgs } = await supabase
        .from("messages")
        .select("id, sender_id, conversation_id")
        .in("conversation_id", convIds)
        .neq("sender_id", user!.id);
      if (!alive) return;
      const messageIds = (msgs ?? []).map((m: any) => m.id);
      if (!messageIds.length) {
        setCount(0);
        return;
      }
      const { data: reads } = await supabase
        .from("message_reads")
        .select("message_id")
        .eq("user_id", user!.id)
        .in("message_id", messageIds);
      const readSet = new Set((reads ?? []).map((r: any) => r.message_id));
      const unreadConvs = new Set(
        (msgs ?? [])
          .filter((m: any) => !readSet.has(m.id))
          .map((m: any) => m.conversation_id)
      );
      setCount(unreadConvs.size);
    }

    refresh();
    const channel = supabase
      .channel(`unread-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, refresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "message_reads" }, refresh)
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  return count;
}
