import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type GiftCatalogItem = {
  slug: string;
  name: string;
  emoji: string;
  gemCost: number;
  tier: "free" | "premium" | "milestone";
  defaultMessage: string;
  sortOrder: number;
  locked: boolean;
  lockReason: string | null;
};

export type GiftQuota = {
  used: number;
  limit: number; // -1 = unlimited
  resetsAt: string;
  unlimited: boolean;
};

export type SendGiftResult =
  | { ok: true; sendId: string; messageId: string }
  | { error: "NOT_MATCHED" | "GIFT_LOCKED" | "GIFT_QUOTA_EXHAUSTED" | "UNKNOWN" };

export type GiftJourney = {
  stage: "first_gift" | "meaningful" | "deep_connection";
  totalGifts: number;
  streakDays: number;
  lastGiftAt: string | null;
};

const FREE_WEEKLY_LIMIT = 3;

function weekStart(d: Date = new Date()): string {
  const day = d.getUTCDay(); // 0 Sun
  const diff = (day + 6) % 7; // Monday-start
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diff));
  return monday.toISOString().slice(0, 10);
}

function nextWeekStartISO(): string {
  const d = new Date();
  const day = d.getUTCDay();
  const diff = 7 - ((day + 6) % 7);
  const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diff));
  return next.toISOString();
}

async function isPremium(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("subscriptions")
    .select("status,current_period_end")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return false;
  const active = ["active", "trialing"].includes(data.status ?? "");
  if (!active) return false;
  if (!data.current_period_end) return true;
  return new Date(data.current_period_end) > new Date();
}

async function getJourneyStage(supabase: any, a: string, b: string): Promise<GiftJourney> {
  const [u1, u2] = a < b ? [a, b] : [b, a];
  const { data } = await supabase
    .from("gift_journey")
    .select("stage,total_gifts,streak_days,last_gift_at")
    .eq("user_a", u1)
    .eq("user_b", u2)
    .maybeSingle();
  return {
    stage: (data?.stage as GiftJourney["stage"]) ?? "first_gift",
    totalGifts: data?.total_gifts ?? 0,
    streakDays: data?.streak_days ?? 0,
    lastGiftAt: data?.last_gift_at ?? null,
  };
}

export const listGiftCatalog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { peerId?: string } | undefined) => data ?? {})
  .handler(async ({ data, context }): Promise<{ items: GiftCatalogItem[]; isPremium: boolean }> => {
    const { supabase, userId } = context;
    const premium = await isPremium(supabase, userId);
    const journey = data.peerId
      ? await getJourneyStage(supabase, userId, data.peerId)
      : { stage: "first_gift" as const, totalGifts: 0, streakDays: 0, lastGiftAt: null };

    const { data: rows } = await supabase
      .from("gift_catalog")
      .select("slug,name,emoji,gem_cost,tier,default_message,sort_order")
      .eq("active", true)
      .order("sort_order");

    const items: GiftCatalogItem[] = (rows ?? []).map((r: any) => {
      let locked = false;
      let lockReason: string | null = null;
      if (r.tier === "premium" && !premium) {
        locked = true;
        lockReason = "Upgrade to Premium to send this gift.";
      } else if (r.tier === "milestone") {
        if (!premium) {
          locked = true;
          lockReason = "Upgrade to Premium to send this gift.";
        } else if (journey.stage !== "deep_connection") {
          locked = true;
          lockReason = "Continue building your connection to unlock this gift.";
        }
      }
      return {
        slug: r.slug,
        name: r.name,
        emoji: r.emoji,
        gemCost: r.gem_cost,
        tier: r.tier,
        defaultMessage: r.default_message,
        sortOrder: r.sort_order,
        locked,
        lockReason,
      };
    });
    return { items, isPremium: premium };
  });

export const getGiftQuota = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<GiftQuota> => {
    const { supabase, userId } = context;
    const premium = await isPremium(supabase, userId);
    if (premium) {
      return { used: 0, limit: -1, resetsAt: nextWeekStartISO(), unlimited: true };
    }
    const wk = weekStart();
    const { data } = await supabase
      .from("gift_weekly_usage")
      .select("sent_count")
      .eq("user_id", userId)
      .eq("week_start", wk)
      .maybeSingle();
    return {
      used: data?.sent_count ?? 0,
      limit: FREE_WEEKLY_LIMIT,
      resetsAt: nextWeekStartISO(),
      unlimited: false,
    };
  });

export const getGiftJourney = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { peerId: string }) => data)
  .handler(async ({ data, context }): Promise<GiftJourney> => {
    return getJourneyStage(context.supabase, context.userId, data.peerId);
  });

export const sendGift = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { peerId: string; slug: string; note?: string }) => data)
  .handler(async ({ data, context }): Promise<SendGiftResult> => {
    const { supabase, userId } = context;
    const peerId = data.peerId;
    const note = (data.note ?? "").trim().slice(0, 140);

    // Verify mutual match
    const { data: matchRow } = await supabase
      .from("matches")
      .select("id")
      .or(`and(user_id.eq.${userId},matched_user_id.eq.${peerId}),and(user_id.eq.${peerId},matched_user_id.eq.${userId})`)
      .eq("mutual_interest", true)
      .limit(1)
      .maybeSingle();
    if (!matchRow) return { error: "NOT_MATCHED" };

    // Fetch gift + journey + entitlements
    const [{ data: gift }, journey, premium] = await Promise.all([
      supabase.from("gift_catalog").select("slug,name,emoji,tier,default_message").eq("slug", data.slug).eq("active", true).maybeSingle(),
      getJourneyStage(supabase, userId, peerId),
      isPremium(supabase, userId),
    ]);
    if (!gift) return { error: "GIFT_LOCKED" };

    if (gift.tier === "premium" && !premium) return { error: "GIFT_LOCKED" };
    if (gift.tier === "milestone" && (!premium || journey.stage !== "deep_connection")) return { error: "GIFT_LOCKED" };

    // Free-tier weekly quota
    const wk = weekStart();
    if (!premium) {
      const { data: usage } = await supabase
        .from("gift_weekly_usage")
        .select("sent_count")
        .eq("user_id", userId)
        .eq("week_start", wk)
        .maybeSingle();
      if ((usage?.sent_count ?? 0) >= FREE_WEEKLY_LIMIT) return { error: "GIFT_QUOTA_EXHAUSTED" };
    }

    // Find / create conversation (same RLS pattern as chat)
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .or(`and(user_a.eq.${userId},user_b.eq.${peerId}),and(user_a.eq.${peerId},user_b.eq.${userId})`)
      .limit(1)
      .maybeSingle();
    let conversationId = existing?.id as string | undefined;
    if (!conversationId) {
      const { data: created, error: convErr } = await supabase
        .from("conversations")
        .insert({ user_a: userId, user_b: peerId })
        .select("id")
        .single();
      if (convErr || !created) {
        console.error("[gifts] conv create failed", convErr);
        return { error: "UNKNOWN" };
      }
      conversationId = created.id;
    }

    // Insert message marker. Use message_type='gift'; content holds slug + optional note.
    const safeNote = note.length > 0 ? note : gift.default_message;
    const content = `[[gift:${gift.slug}]] ${safeNote}`.trim();
    const { data: msg, error: msgErr } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        content,
        message_type: "gift",
      })
      .select("id")
      .single();
    if (msgErr || !msg) {
      console.error("[gifts] message insert failed", msgErr);
      return { error: "UNKNOWN" };
    }

    // Privileged writes for journey + usage + send log
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const nowIso = new Date().toISOString();

    await supabaseAdmin.from("gift_sends").insert({
      sender_id: userId,
      recipient_id: peerId,
      conversation_id: conversationId,
      gift_slug: gift.slug,
      note: safeNote,
      message_id: msg.id,
    });

    if (!premium) {
      const { data: cur } = await supabaseAdmin
        .from("gift_weekly_usage")
        .select("sent_count")
        .eq("user_id", userId)
        .eq("week_start", wk)
        .maybeSingle();
      const nextCount = (cur?.sent_count ?? 0) + 1;
      await supabaseAdmin
        .from("gift_weekly_usage")
        .upsert(
          { user_id: userId, week_start: wk, sent_count: nextCount, updated_at: nowIso },
          { onConflict: "user_id,week_start" }
        );
    }


    // Journey upsert
    const [u1, u2] = userId < peerId ? [userId, peerId] : [peerId, userId];
    const { data: jrow } = await supabaseAdmin
      .from("gift_journey")
      .select("total_gifts,last_gift_at,streak_days")
      .eq("user_a", u1)
      .eq("user_b", u2)
      .maybeSingle();
    const total = (jrow?.total_gifts ?? 0) + 1;
    const last = jrow?.last_gift_at ? new Date(jrow.last_gift_at) : null;
    const today = new Date();
    let streak = jrow?.streak_days ?? 0;
    if (!last) streak = 1;
    else {
      const diffDays = Math.floor((today.getTime() - last.getTime()) / 86400000);
      if (diffDays === 0) streak = Math.max(streak, 1);
      else if (diffDays === 1) streak = streak + 1;
      else streak = 1;
    }
    const stage =
      total >= 10 ? "deep_connection" : total >= 3 ? "meaningful" : "first_gift";

    await supabaseAdmin
      .from("gift_journey")
      .upsert(
        { user_a: u1, user_b: u2, total_gifts: total, last_gift_at: nowIso, streak_days: streak, stage, updated_at: nowIso },
        { onConflict: "user_a,user_b" }
      );

    return { ok: true, sendId: msg.id, messageId: msg.id };
  });

export function giftErrorMessage(code: string): string {
  switch (code) {
    case "NOT_MATCHED":
      return "You can only send gifts to mutual matches.";
    case "GIFT_LOCKED":
      return "Continue building your connection to unlock this gift.";
    case "GIFT_QUOTA_EXHAUSTED":
      return "Upgrade to Premium to send more meaningful gifts.";
    default:
      return "Something went wrong sending that gift. Please try again.";
  }
}

export function parseGiftMessage(content: string): { slug: string; note: string } | null {
  const m = content.match(/^\[\[gift:([a-z0-9_]+)\]\]\s?(.*)$/i);
  if (!m) return null;
  return { slug: m[1], note: m[2] ?? "" };
}
