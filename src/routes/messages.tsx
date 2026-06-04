import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { SignedImage } from "@/components/SignedImage";
import { useAuth } from "@/hooks/use-auth";
import { useRequireOnboarding } from "@/hooks/use-require-onboarding";

import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, Search } from "lucide-react";

export const Route = createFileRoute("/messages")({
  head: () => ({
    meta: [
      { title: "Messages — UNVEIL" },
      { name: "description", content: "Your conversations on UNVEIL — slow, voice-first dating." },
    ],
  }),
  component: MessagesPage,
});

type Row = {
  id: string;
  user_a: string;
  user_b: string;
  last_message_at: string | null;
  peer_id: string;
  peer_name: string | null;
  peer_photo: string | null;
  last_text: string | null;
  unread: number;
};

function MessagesPage() {
  const { checking } = useRequireOnboarding();
  const { user, loading } = useAuth();

  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    let alive = true;

    async function load() {
      const { data: convs } = await supabase
        .from("conversations")
        .select("id, user_a, user_b, last_message_at")
        .order("last_message_at", { ascending: false });

      if (!alive || !convs?.length) {
        setRows([]);
        return;
      }

      const peerIds = convs.map((c: any) => (c.user_a === user!.id ? c.user_b : c.user_a));
      const convIds = convs.map((c: any) => c.id);

      const [{ data: profs }, { data: msgs }, { data: reads }] = await Promise.all([
        supabase.from("profiles").select("id, first_name, photo_url, avatar_url").in("id", peerIds),
        supabase
          .from("messages")
          .select("id, conversation_id, content, sender_id, created_at")
          .in("conversation_id", convIds)
          .order("created_at", { ascending: false }),
        supabase.from("message_reads").select("message_id").eq("user_id", user!.id),
      ]);

      const readSet = new Set((reads ?? []).map((r: any) => r.message_id));
      const lastByConv = new Map<string, any>();
      const unreadByConv = new Map<string, number>();
      for (const m of msgs ?? []) {
        if (!lastByConv.has(m.conversation_id)) lastByConv.set(m.conversation_id, m);
        if (m.sender_id !== user!.id && !readSet.has(m.id)) {
          unreadByConv.set(m.conversation_id, (unreadByConv.get(m.conversation_id) ?? 0) + 1);
        }
      }

      const profMap = new Map<string, any>();
      for (const p of profs ?? []) profMap.set(p.id, p);

      const built: Row[] = convs.map((c: any) => {
        const peerId = c.user_a === user!.id ? c.user_b : c.user_a;
        const peer = profMap.get(peerId);
        const last = lastByConv.get(c.id);
        return {
          id: c.id,
          user_a: c.user_a,
          user_b: c.user_b,
          last_message_at: c.last_message_at,
          peer_id: peerId,
          peer_name: peer?.first_name ?? null,
          peer_photo: peer?.avatar_url ?? peer?.photo_url ?? null,
          last_text: last?.content ?? null,
          unread: unreadByConv.get(c.id) ?? 0,
        };
      });
      if (alive) setRows(built);
    }

    load();
    const channel = supabase
      .channel(`inbox-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reads" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, load)
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  const filtered = rows.filter((r) => {
    if (!q) return true;
    const hay = `${r.peer_name ?? ""} ${r.last_text ?? ""}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  if (checking || loading) {
    return (
      <div className="min-h-screen bg-background">
        <UnveilNav />
        <div className="p-8 text-muted-foreground">Loading…</div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-0">
      <UnveilNav />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Messages</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Conversations with people who matched with you.
          </p>
        </header>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="search"
            placeholder="Search messages"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full rounded-full border border-border bg-surface/60 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-primary"
            aria-label="Search messages"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface/40 p-10 text-center">
            <MessageCircle className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden />
            <h2 className="mt-4 text-lg font-medium">No conversations yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              When you and someone you like both show interest, you can start a conversation here.
            </p>
            <Link
              to="/discover"
              className="mt-6 inline-flex items-center rounded-full bg-gradient-hero px-5 py-2 text-sm font-medium text-primary-foreground shadow-glow"
            >
              Discover people
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface/40">
            {filtered.map((r) => (
              <li key={r.id}>
                <Link
                  to="/chat"
                  search={{ c: r.id }}
                  className="flex items-center gap-3 p-4 transition-colors hover:bg-surface"
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
                    {r.peer_photo ? (
                      <SignedImage src={r.peer_photo} alt="" className="h-full w-full object-cover" fallback={
                        <div className="flex h-full w-full items-center justify-center text-sm font-medium text-muted-foreground">
                          {(r.peer_name ?? "?").slice(0, 1).toUpperCase()}
                        </div>
                      } />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-medium text-muted-foreground">
                        {(r.peer_name ?? "?").slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    {r.unread > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                        {r.unread > 9 ? "9+" : r.unread}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium">{r.peer_name ?? "Match"}</span>
                      {r.last_message_at && (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatTime(r.last_message_at)}
                        </span>
                      )}
                    </div>
                    <p className={`truncate text-sm ${r.unread > 0 ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                      {r.last_text ?? "Say hi"}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays < 7) return d.toLocaleDateString(undefined, { weekday: "short" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
