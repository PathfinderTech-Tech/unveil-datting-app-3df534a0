import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

type UnreadMessage = {
  id: string;
  sender_id: string;
  conversation_id: string;
};

type MessageRead = {
  message_id: string;
};

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
      const convIds = convs.map((c) => c.id);
      const { data: msgs } = await supabase
        .from("messages")
        .select("id, sender_id, conversation_id")
        .in("conversation_id", convIds)
        .neq("sender_id", user!.id);
      if (!alive) return;
      const messageRows = (msgs ?? []) as UnreadMessage[];
      const messageIds = messageRows.map((m) => m.id);
      if (!messageIds.length) {
        setCount(0);
        return;
      }
      const { data: reads } = await supabase
        .from("message_reads")
        .select("message_id")
        .eq("user_id", user!.id)
        .in("message_id", messageIds);
      const readRows = (reads ?? []) as MessageRead[];
      const readSet = new Set(readRows.map((r) => r.message_id));
      const unreadConvs = new Set(
        messageRows
          .filter((m) => !readSet.has(m.id))
          .map((m) => m.conversation_id)
      );
      setCount(unreadConvs.size);
    }

    refresh();
    const channelName = `unread-${user.id}-${Math.random().toString(36).slice(2, 10)}`;
    const channel = supabase.channel(channelName);
    channel
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => { void refresh(); },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "message_reads" },
        () => { void refresh(); },
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  return count;
}
