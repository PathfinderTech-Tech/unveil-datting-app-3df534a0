// Thoughts: send a short message to another user; if mutual, delivers as a chat message.
import { supabase } from "@/integrations/supabase/client";

export async function sendThought(targetUserId: string, content: string) {
  const { data: u } = await supabase.auth.getUser();
  const myId = u.user?.id;
  if (!myId) return { error: "Sign in required.", mutual: false, conversationId: null as string | null };
  if (targetUserId === myId) return { error: "You can't send a thought to yourself.", mutual: false, conversationId: null };
  const trimmed = content.trim();
  if (!trimmed) return { error: "Write a short thought first.", mutual: false, conversationId: null };
  if (trimmed.length > 280) return { error: "Keep it under 280 characters.", mutual: false, conversationId: null };

  const { data, error } = await supabase.rpc("send_thought", { _target: targetUserId, _content: trimmed } as never);
  if (error) {
    console.error("[unveil] send_thought failed", error);
    if (error.message?.includes("THOUGHT_RATE_LIMIT")) {
      return { error: "You've sent a lot of thoughts. Take a breath and try again later.", mutual: false, conversationId: null };
    }
    return { error: error.message || "Couldn't send thought.", mutual: false, conversationId: null };
  }
  const row = Array.isArray(data) ? data[0] : data;
  return {
    error: null,
    mutual: !!row?.mutual,
    conversationId: (row?.conversation_id as string | null) ?? null,
  };
}

export type Thought = {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
};

export async function loadIncomingThoughts(limit = 50): Promise<Thought[]> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return [];
  const { data } = await (supabase as any)
    .from("thoughts")
    .select("id, sender_id, recipient_id, content, created_at, read_at")
    .eq("recipient_id", uid)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Thought[];
}

export async function markThoughtRead(id: string) {
  await (supabase as any).from("thoughts").update({ read_at: new Date().toISOString() }).eq("id", id);
}
