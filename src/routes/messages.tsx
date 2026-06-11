import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { useAuth } from "@/hooks/use-auth";
import { useRequireOnboarding } from "@/hooks/use-require-onboarding";
import { getPrimaryProfileMedia } from "@/lib/profile-media.functions";

import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, Search } from "lucide-react";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { LocationTrustBadge } from "@/components/LocationTrustBadge";
import { useMyLocationTrust } from "@/components/LocationTrustBadge";

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
  peer_avatar: string | null;
  peer_discovery_mode: "avatar" | "photo" | null;
  peer_verified: boolean;
  peer_travel_status: string | null;
  peer_travel_expires_at: string | null;
  peer_travel_warning_count: number | null;
  peer_account_restricted: boolean | null;
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
      const [{ data: convs }, { data: thoughtsSent }, { data: thoughtsRecv }] = await Promise.all([
        supabase
          .from("conversations")
          .select("id, user_a, user_b, last_message_at")
          .order("last_message_at", { ascending: false, nullsFirst: false }),
        (supabase as any)
          .from("thoughts")
          .select("id, sender_id, recipient_id, content, created_at, read_at, delivered_as_message_id")
          .eq("sender_id", user!.id)
          .is("delivered_as_message_id", null)
          .order("created_at", { ascending: false })
          .limit(50),
        (supabase as any)
          .from("thoughts")
          .select("id, sender_id, recipient_id, content, created_at, read_at, delivered_as_message_id")
          .eq("recipient_id", user!.id)
          .is("delivered_as_message_id", null)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      const convPeerIds = (convs ?? []).map((c: any) => (c.user_a === user!.id ? c.user_b : c.user_a));
      const thoughtPeerIds = [
        ...((thoughtsSent ?? []) as any[]).map((t) => t.recipient_id),
        ...((thoughtsRecv ?? []) as any[]).map((t) => t.sender_id),
      ];
      const peerIds = Array.from(new Set([...convPeerIds, ...thoughtPeerIds]));
      const convIds = (convs ?? []).map((c: any) => c.id);

      const [{ data: profs }, mediaRows, { data: msgs }, { data: reads }] = await Promise.all([
        peerIds.length
          ? supabase.from("profiles").select("id, first_name, photo_url, profile_photo_url, avatar_url, discovery_mode, verified, travel_status, travel_expires_at, travel_warning_count, account_restricted").in("id", peerIds)
          : Promise.resolve({ data: [] as any[] } as any),
        peerIds.length ? getPrimaryProfileMedia({ data: { userIds: peerIds } }) : Promise.resolve([]),
        convIds.length
          ? supabase
              .from("messages")
              .select("id, conversation_id, content, sender_id, created_at, message_type")
              .in("conversation_id", convIds)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [] as any[] } as any),
        supabase.from("message_reads").select("message_id").eq("user_id", user!.id),
      ]);

      const readSet = new Set((reads ?? []).map((r: any) => r.message_id));
      const lastByConv = new Map<string, any>();
      const unreadByConv = new Map<string, number>();
      for (const m of (msgs ?? []) as any[]) {
        if (!lastByConv.has(m.conversation_id)) lastByConv.set(m.conversation_id, m);
        if (m.sender_id !== user!.id && !readSet.has(m.id)) {
          unreadByConv.set(m.conversation_id, (unreadByConv.get(m.conversation_id) ?? 0) + 1);
        }
      }

      const profMap = new Map<string, any>();
      for (const p of (profs ?? []) as any[]) profMap.set(p.id, p);
      const mediaMap = new Map(mediaRows.map((m) => [m.id, m]));

      const previewFor = (m: any): string => {
        if (!m) return "Say hi";
        if (m.message_type === "voice") return "🎙️ Voice message";
        return m.content ?? "Say hi";
      };

      const convRows: Row[] = (convs ?? []).map((c: any) => {
        const peerId = c.user_a === user!.id ? c.user_b : c.user_a;
        const peer = profMap.get(peerId);
        const media = mediaMap.get(peerId);
        const last = lastByConv.get(c.id);
        return {
          id: c.id,
          user_a: c.user_a,
          user_b: c.user_b,
          last_message_at: c.last_message_at ?? last?.created_at ?? null,
          peer_id: peerId,
          peer_name: media?.firstName ?? peer?.first_name?.trim() ?? null,
          peer_photo: media?.photoUrl ?? peer?.profile_photo_url ?? peer?.photo_url ?? null,
          peer_avatar: media?.avatarUrl ?? peer?.avatar_url ?? null,
          peer_discovery_mode: media?.hasUploadedPhoto ? "photo" : ((peer?.discovery_mode as "avatar" | "photo" | null) ?? null),
          peer_verified: !!peer?.verified,
          peer_travel_status: peer?.travel_status ?? null,
          peer_travel_expires_at: peer?.travel_expires_at ?? null,
          peer_travel_warning_count: peer?.travel_warning_count ?? null,
          peer_account_restricted: peer?.account_restricted ?? null,
          last_text: previewFor(last),
          unread: unreadByConv.get(c.id) ?? 0,
        };
      });

      // Pseudo-rows for thoughts (pre-mutual interest pings) so sender + recipient both see activity.
      const peersWithConv = new Set(convRows.map((r) => r.peer_id));
      const thoughtRows: Row[] = [];
      const seenPeers = new Set<string>();
      for (const t of [...(thoughtsRecv ?? []), ...(thoughtsSent ?? [])] as any[]) {
        const peerId = t.sender_id === user!.id ? t.recipient_id : t.sender_id;
        if (peersWithConv.has(peerId) || seenPeers.has(peerId)) continue;
        seenPeers.add(peerId);
        const peer = profMap.get(peerId);
        const media = mediaMap.get(peerId);
        const incoming = t.recipient_id === user!.id;
        thoughtRows.push({
          id: `thought:${peerId}`,
          user_a: user!.id,
          user_b: peerId,
          last_message_at: t.created_at,
          peer_id: peerId,
          peer_name: media?.firstName ?? peer?.first_name?.trim() ?? null,
          peer_photo: media?.photoUrl ?? peer?.profile_photo_url ?? peer?.photo_url ?? null,
          peer_avatar: media?.avatarUrl ?? peer?.avatar_url ?? null,
          peer_discovery_mode: media?.hasUploadedPhoto ? "photo" : ((peer?.discovery_mode as "avatar" | "photo" | null) ?? null),
          peer_verified: !!peer?.verified,
          peer_travel_status: peer?.travel_status ?? null,
          peer_travel_expires_at: peer?.travel_expires_at ?? null,
          peer_travel_warning_count: peer?.travel_warning_count ?? null,
          peer_account_restricted: peer?.account_restricted ?? null,
          last_text: incoming ? `💭 ${t.content}` : `💭 You sent: ${t.content}`,
          unread: incoming && !t.read_at ? 1 : 0,
        });
      }

      const all = [...convRows, ...thoughtRows].sort((a, b) => {
        // Unread conversations always float to the top.
        if ((a.unread > 0) !== (b.unread > 0)) return a.unread > 0 ? -1 : 1;
        const ta = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
        const tb = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
        return tb - ta;
      });
      if (alive) setRows(all);
    }

    load();
    const channel = supabase
      .channel(`inbox-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reads" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "thoughts" }, load)
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
  const totalUnread = rows.reduce((sum, r) => sum + (r.unread || 0), 0);

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
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">Messages</h1>
            <MyTrustBadge />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Conversations with people who matched with you.
          </p>
        </header>

        {/* Verification is NOT required to message. Free users get 5/day, verified get 15/day,
            Daily Pass / Premium are unlimited. DB trigger enforces quota. */}


        {totalUnread > 0 && (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-primary/10 px-4 py-2.5 text-sm">
            <span className="font-medium text-foreground">
              You have {totalUnread} unread {totalUnread === 1 ? "message" : "messages"}
            </span>
            <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
              {totalUnread}
            </span>
          </div>
        )}

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
            {filtered.map((r) => {
              const isThought = r.id.startsWith("thought:");
              // Always route to the chat thread. Real conversations open via ?c=<id>.
              // Thought (pre-mutual) rows open the chat list so the user can reply there
              // — never redirect to a profile/passport page from the inbox.
              const linkProps = isThought
                ? ({ to: "/chat" } as const)
                : ({ to: "/chat", search: { c: r.id } } as const);
              return (
              <li key={r.id}>
                <Link
                  {...(linkProps as any)}
                  className={`flex items-center gap-3 p-4 transition-colors ${
                    r.unread > 0
                      ? "bg-primary/10 border-l-2 border-primary hover:bg-primary/15"
                      : "hover:bg-surface"
                  }`}
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
                    <ProfileAvatar
                      userId={r.peer_id}
                      name={r.peer_name}
                      discoveryMode={r.peer_discovery_mode}
                      avatarUrl={r.peer_avatar}
                      photoUrl={r.peer_photo}
                      size={48}
                      veiled={!r.last_message_at || isThought}
                    />
                    {r.unread > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                        {r.unread > 9 ? "9+" : r.unread}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className={`truncate ${r.unread > 0 ? "font-semibold" : "font-medium"}`}>
                          {r.peer_name ?? "Match"}
                        </span>
                        {r.peer_verified && <VerifiedBadge size="xs" />}
                        <LocationTrustBadge
                          profile={{
                            verified: r.peer_verified,
                            travel_status: r.peer_travel_status,
                            travel_expires_at: r.peer_travel_expires_at,
                            travel_warning_count: r.peer_travel_warning_count,
                            account_restricted: r.peer_account_restricted,
                          }}
                          size="xs"
                          showLabel={false}
                        />

                        {r.unread > 0 && (
                          <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                            New
                          </span>
                        )}
                      </span>
                      {r.last_message_at && (
                        <span className={`shrink-0 text-xs ${r.unread > 0 ? "font-medium text-primary" : "text-muted-foreground"}`}>
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
              );
            })}
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
