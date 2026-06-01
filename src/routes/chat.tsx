import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, ArrowRight, Send } from "lucide-react";

export const Route = createFileRoute("/chat")({
  head: () => ({ meta: [{ title: "Conversations — UNVEIL" }] }),
  component: Chat,
});

type Conv = { id: string; user_a: string; user_b: string; last_message_at: string | null };
type Msg = { id: string; sender_id: string; content: string; created_at: string };

function Chat() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [active, setActive] = useState<Conv | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("conversations").select("*").order("last_message_at", { ascending: false })
      .then(({ data }) => setConvs(data ?? []));
  }, [user]);

  useEffect(() => {
    if (!active) return;
    supabase.from("messages").select("*").eq("conversation_id", active.id).order("created_at")
      .then(({ data }) => setMsgs(data ?? []));
    const ch = supabase
      .channel(`msg-${active.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${active.id}` },
        (p) => setMsgs((m) => [...m, p.new as Msg]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [active]);

  const send = async () => {
    if (!active || !user || !draft.trim()) return;
    const content = draft.trim();
    setDraft("");
    await supabase.from("messages").insert({ conversation_id: active.id, sender_id: user.id, content });
    await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", active.id);
  };

  if (loading || !user) {
    return <div className="min-h-screen"><UnveilNav /><div className="p-12 text-center text-muted-foreground">…</div></div>;
  }

  return (
    <div className="min-h-screen">
      <UnveilNav />
      <div className="mx-auto grid max-w-6xl gap-4 px-6 py-10 md:grid-cols-[320px_1fr]">
        <aside className="rounded-3xl border border-border bg-card p-4">
          <div className="mb-3 font-mono text-xs uppercase tracking-luxury text-muted-foreground">Open threads</div>
          {convs.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No conversations yet. Find someone in <Link to="/matches" className="text-primary">your band</Link>.
            </div>
          )}
          <div className="space-y-1">
            {convs.map((c) => (
              <button key={c.id} onClick={() => setActive(c)}
                className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left text-sm transition-colors ${active?.id === c.id ? "bg-primary/15" : "hover:bg-surface"}`}>
                <MessageCircle className="h-4 w-4 text-accent" />
                <span className="truncate">Thread · {c.id.slice(0, 6)}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="flex min-h-[60vh] flex-col rounded-3xl border border-border bg-card">
          {!active ? (
            <div className="m-auto p-12 text-center text-muted-foreground">
              <h2 className="font-display text-2xl font-light">Select a thread</h2>
              <p className="mt-2 text-sm">Conversations unfold here — slow, intentional, voice-first.</p>
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-2 overflow-y-auto p-6">
                {msgs.map((m) => {
                  const mine = m.sender_id === user.id;
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${mine ? "bg-gradient-hero text-primary-foreground" : "bg-surface"}`}>
                        {m.content}
                      </div>
                    </div>
                  );
                })}
                {msgs.length === 0 && <div className="text-center text-xs text-muted-foreground">Send the first thought.</div>}
              </div>
              <form onSubmit={(e) => { e.preventDefault(); send(); }}
                className="flex items-center gap-2 border-t border-border p-4">
                <input value={draft} onChange={(e) => setDraft(e.target.value)}
                  placeholder="A thought, gently…"
                  className="flex-1 rounded-full border border-border bg-surface px-4 py-2 text-sm outline-none focus:border-primary" />
                <button type="submit" className="rounded-full bg-gradient-hero px-4 py-2 text-primary-foreground shadow-glow">
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
