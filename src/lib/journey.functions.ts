import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type LandmarkRow = {
  key: string;
  name: string;
  label: string;
  mile: number;
  emoji: string;
};

export const ROUTE_PRESETS: Array<{
  id: string;
  from_city: string;
  from_country: string;
  from_flag: string;
  to_city: string;
  to_country: string;
  to_flag: string;
  total_miles: number;
  total_km: number;
  landmarks: LandmarkRow[];
}> = [
  {
    id: "paris-london",
    from_city: "Paris", from_country: "France", from_flag: "🇫🇷",
    to_city: "London", to_country: "United Kingdom", to_flag: "🇬🇧",
    total_miles: 344, total_km: 554,
    landmarks: [
      { key: "paris",   name: "Paris",           label: "STARTED",      mile: 0,   emoji: "🗼" },
      { key: "eiffel",  name: "Eiffel Tower",    label: "DISCOVERED",   mile: 6,   emoji: "🗼" },
      { key: "calais",  name: "Calais",          label: "NEXT STOP",    mile: 185, emoji: "⚓" },
      { key: "channel", name: "English Channel", label: "CROSSING",     mile: 210, emoji: "🚢" },
      { key: "dover",   name: "Dover",           label: "ALMOST THERE", mile: 234, emoji: "🌊" },
      { key: "london",  name: "London",          label: "DESTINATION",  mile: 344, emoji: "🎡" },
    ],
  },
  {
    id: "rome-venice",
    from_city: "Rome", from_country: "Italy", from_flag: "🇮🇹",
    to_city: "Venice", to_country: "Italy", to_flag: "🇮🇹",
    total_miles: 327, total_km: 526,
    landmarks: [
      { key: "rome",     name: "Rome",       label: "STARTED",      mile: 0,   emoji: "🏛️" },
      { key: "florence", name: "Florence",   label: "NEXT STOP",    mile: 170, emoji: "🎨" },
      { key: "bologna",  name: "Bologna",    label: "HALFWAY",      mile: 236, emoji: "🍝" },
      { key: "padua",    name: "Padua",      label: "ALMOST THERE", mile: 300, emoji: "⛪" },
      { key: "venice",   name: "Venice",     label: "DESTINATION",  mile: 327, emoji: "🚤" },
    ],
  },
  {
    id: "nyc-boston",
    from_city: "New York", from_country: "USA", from_flag: "🇺🇸",
    to_city: "Boston", to_country: "USA", to_flag: "🇺🇸",
    total_miles: 215, total_km: 346,
    landmarks: [
      { key: "nyc",       name: "New York",   label: "STARTED",      mile: 0,   emoji: "🗽" },
      { key: "stamford",  name: "Stamford",   label: "NEXT STOP",    mile: 40,  emoji: "🌉" },
      { key: "hartford",  name: "Hartford",   label: "HALFWAY",      mile: 115, emoji: "🏙️" },
      { key: "providence",name: "Providence", label: "ALMOST THERE", mile: 180, emoji: "⛵" },
      { key: "boston",    name: "Boston",     label: "DESTINATION",  mile: 215, emoji: "🎡" },
    ],
  },
  {
    id: "tokyo-kyoto",
    from_city: "Tokyo", from_country: "Japan", from_flag: "🇯🇵",
    to_city: "Kyoto", to_country: "Japan", to_flag: "🇯🇵",
    total_miles: 285, total_km: 458,
    landmarks: [
      { key: "tokyo",    name: "Tokyo",       label: "STARTED",      mile: 0,   emoji: "🗼" },
      { key: "fuji",     name: "Mt. Fuji",    label: "DISCOVERED",   mile: 60,  emoji: "🗻" },
      { key: "shizuoka", name: "Shizuoka",    label: "NEXT STOP",    mile: 110, emoji: "🍵" },
      { key: "nagoya",   name: "Nagoya",      label: "HALFWAY",      mile: 180, emoji: "🏯" },
      { key: "kyoto",    name: "Kyoto",       label: "DESTINATION",  mile: 285, emoji: "⛩️" },
    ],
  },
];

export const listRoutePresets = createServerFn({ method: "GET" })
  .handler(async () => ROUTE_PRESETS);

/* ---------- List my journeys + summary ---------- */
export const listMyJourneys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: parts, error: pe } = await supabase
      .from("journey_participants")
      .select("journey_id, role, joined_at")
      .eq("user_id", userId);
    if (pe) throw new Error(pe.message);
    const ids = (parts ?? []).map((p) => p.journey_id);
    if (ids.length === 0) return { journeys: [] as any[], invites: [] as any[] };

    const { data: journeys, error: je } = await supabase
      .from("journeys")
      .select("*")
      .in("id", ids)
      .order("created_at", { ascending: false });
    if (je) throw new Error(je.message);

    // Aggregate distances per journey
    const { data: logs } = await supabase
      .from("journey_logs")
      .select("journey_id, user_id, miles")
      .in("journey_id", ids);

    const totals = new Map<string, number>();
    for (const l of logs ?? []) {
      totals.set(l.journey_id, (totals.get(l.journey_id) ?? 0) + Number(l.miles));
    }

    return {
      journeys: (journeys ?? []).map((j) => ({
        ...j,
        completed_miles: +(totals.get(j.id) ?? 0).toFixed(2),
        my_role: parts?.find((p) => p.journey_id === j.id)?.role ?? "solo",
      })),
      invites: [] as any[],
    };
  });

/* ---------- Get one journey (details) ---------- */
export const getJourney = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { journeyId: string }) => {
    if (!d?.journeyId || !UUID.test(d.journeyId)) throw new Error("Invalid journey id");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: journey, error } = await supabase
      .from("journeys")
      .select("*")
      .eq("id", data.journeyId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!journey) throw new Error("Journey not found");

    const { data: participants } = await supabase
      .from("journey_participants")
      .select("user_id, role, joined_at")
      .eq("journey_id", data.journeyId);

    const { data: logs } = await supabase
      .from("journey_logs")
      .select("id, user_id, miles, steps, activity, logged_on, created_at")
      .eq("journey_id", data.journeyId)
      .order("logged_on", { ascending: false });

    // Get participant profile names
    const uids = (participants ?? []).map((p) => p.user_id);
    let profiles: Array<{ id: string; first_name: string | null; avatar_url: string | null; photo_url: string | null }> = [];
    if (uids.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, first_name, avatar_url, photo_url")
        .in("id", uids);
      profiles = profs ?? [];
    }

    const totalsByUser = new Map<string, number>();
    for (const l of logs ?? []) {
      totalsByUser.set(l.user_id, (totalsByUser.get(l.user_id) ?? 0) + Number(l.miles));
    }

    const completedMiles = Array.from(totalsByUser.values()).reduce((a, b) => a + b, 0);
    const myLogs = (logs ?? []).filter((l) => l.user_id === userId);
    const today = new Date().toISOString().slice(0, 10);
    const myToday = myLogs.filter((l) => l.logged_on === today).reduce((a, l) => a + Number(l.miles), 0);
    const myTodaySteps = myLogs.filter((l) => l.logged_on === today).reduce((a, l) => a + (l.steps ?? 0), 0);

    return {
      journey,
      participants: (participants ?? []).map((p) => ({
        ...p,
        profile: profiles.find((pr) => pr.id === p.user_id) ?? null,
        total_miles: +(totalsByUser.get(p.user_id) ?? 0).toFixed(2),
        is_me: p.user_id === userId,
      })),
      logs: logs ?? [],
      completed_miles: +completedMiles.toFixed(2),
      my_today_miles: +myToday.toFixed(2),
      my_today_steps: myTodaySteps,
    };
  });

/* ---------- Create a solo journey ---------- */
export const createSoloJourney = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { routeId: string }) => {
    if (!d?.routeId) throw new Error("routeId required");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const preset = ROUTE_PRESETS.find((r) => r.id === data.routeId);
    if (!preset) throw new Error("Unknown route");
    const { data: j, error } = await supabase
      .from("journeys")
      .insert({
        created_by: userId,
        mode: "solo",
        from_city: preset.from_city, from_country: preset.from_country, from_flag: preset.from_flag,
        to_city: preset.to_city, to_country: preset.to_country, to_flag: preset.to_flag,
        total_miles: preset.total_miles, total_km: preset.total_km,
        landmarks: preset.landmarks as any,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    const { error: pe } = await supabase
      .from("journey_participants")
      .insert({ journey_id: j.id, user_id: userId, role: "solo" });
    if (pe) throw new Error(pe.message);
    return { journeyId: j.id };
  });

/* ---------- Create a couple journey + invite ---------- */
export const createCoupleJourney = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { routeId: string; partnerId: string; myRole: "heart" | "mind" }) => {
    if (!d?.routeId) throw new Error("routeId required");
    if (!d?.partnerId || !UUID.test(d.partnerId)) throw new Error("partnerId invalid");
    if (d.myRole !== "heart" && d.myRole !== "mind") throw new Error("invalid role");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.partnerId === userId) throw new Error("Cannot invite yourself");
    const preset = ROUTE_PRESETS.find((r) => r.id === data.routeId);
    if (!preset) throw new Error("Unknown route");

    // Verify mutual match
    const { data: match } = await supabase
      .from("matches")
      .select("id")
      .or(`and(user_id.eq.${userId},matched_user_id.eq.${data.partnerId}),and(user_id.eq.${data.partnerId},matched_user_id.eq.${userId})`)
      .eq("mutual_interest", true)
      .limit(1)
      .maybeSingle();
    if (!match) throw new Error("Not a mutual match");

    const partnerRole = data.myRole === "heart" ? "mind" : "heart";

    const { data: j, error } = await supabase
      .from("journeys")
      .insert({
        created_by: userId,
        mode: "couple",
        from_city: preset.from_city, from_country: preset.from_country, from_flag: preset.from_flag,
        to_city: preset.to_city, to_country: preset.to_country, to_flag: preset.to_flag,
        total_miles: preset.total_miles, total_km: preset.total_km,
        landmarks: preset.landmarks as any,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    const { error: pe } = await supabase
      .from("journey_participants")
      .insert({ journey_id: j.id, user_id: userId, role: data.myRole });
    if (pe) throw new Error(pe.message);

    const { error: ie } = await supabase
      .from("journey_invites")
      .insert({
        journey_id: j.id,
        from_user_id: userId,
        to_user_id: data.partnerId,
        role_offered: partnerRole,
      });
    if (ie) throw new Error(ie.message);

    return { journeyId: j.id };
  });

/* ---------- List matches available to invite ---------- */
export const listInvitableMatches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: matches, error } = await supabase
      .from("matches")
      .select("user_id, matched_user_id")
      .or(`user_id.eq.${userId},matched_user_id.eq.${userId}`)
      .eq("mutual_interest", true);
    if (error) throw new Error(error.message);
    const partnerIds = Array.from(
      new Set(
        (matches ?? []).map((m) => (m.user_id === userId ? m.matched_user_id : m.user_id))
      )
    );
    if (partnerIds.length === 0) return { matches: [] as any[] };
    const { data: profs } = await supabase.rpc("get_public_match_profiles", { _targets: partnerIds });
    return {
      matches: (profs ?? []).map((p: any) => ({
        id: p.id, first_name: p.first_name, city: p.city, country: p.country,
        photo_url: p.photo_url ?? p.profile_photo_url ?? p.avatar_url ?? null,
      })),
    };
  });

/* ---------- Invites (received / sent) ---------- */
export const listMyInvites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: invites, error } = await supabase
      .from("journey_invites")
      .select("*")
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const list = invites ?? [];
    const journeyIds = Array.from(new Set(list.map((i) => i.journey_id)));
    const userIds = Array.from(new Set(list.flatMap((i) => [i.from_user_id, i.to_user_id])));
    let journeys: any[] = [];
    let profiles: any[] = [];
    if (journeyIds.length > 0) {
      const { data } = await supabase.from("journeys").select("id, from_city, to_city, total_miles").in("id", journeyIds);
      journeys = data ?? [];
    }
    if (userIds.length > 0) {
      const { data } = await supabase.rpc("get_public_match_profiles", { _targets: userIds });
      profiles = data ?? [];
    }
    return {
      invites: list.map((i) => ({
        ...i,
        journey: journeys.find((j) => j.id === i.journey_id) ?? null,
        from_profile: profiles.find((p: any) => p.id === i.from_user_id) ?? null,
        to_profile: profiles.find((p: any) => p.id === i.to_user_id) ?? null,
        direction: i.from_user_id === userId ? "sent" : "received",
      })),
    };
  });

export const respondToInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { inviteId: string; action: "accept" | "decline" | "cancel" }) => {
    if (!d?.inviteId || !UUID.test(d.inviteId)) throw new Error("inviteId invalid");
    if (!["accept", "decline", "cancel"].includes(d.action)) throw new Error("invalid action");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: inv, error } = await supabase
      .from("journey_invites")
      .select("*")
      .eq("id", data.inviteId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!inv) throw new Error("Invite not found");
    if (inv.status !== "pending") throw new Error("Invite already handled");

    if (data.action === "accept") {
      if (inv.to_user_id !== userId) throw new Error("Not your invite");
      const { error: pe } = await supabase
        .from("journey_participants")
        .insert({ journey_id: inv.journey_id, user_id: userId, role: inv.role_offered });
      if (pe) throw new Error(pe.message);
      await supabase.from("journey_invites")
        .update({ status: "accepted", responded_at: new Date().toISOString() })
        .eq("id", inv.id);
      return { ok: true, journeyId: inv.journey_id };
    }
    if (data.action === "decline") {
      if (inv.to_user_id !== userId) throw new Error("Not your invite");
      await supabase.from("journey_invites")
        .update({ status: "declined", responded_at: new Date().toISOString() })
        .eq("id", inv.id);
      return { ok: true };
    }
    // cancel
    if (inv.from_user_id !== userId) throw new Error("Only sender can cancel");
    await supabase.from("journey_invites")
      .update({ status: "cancelled", responded_at: new Date().toISOString() })
      .eq("id", inv.id);
    return { ok: true };
  });

/* ---------- Log a walk ---------- */
export const logWalk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { journeyId: string; miles: number; steps?: number; activity?: string }) => {
    if (!d?.journeyId || !UUID.test(d.journeyId)) throw new Error("journeyId invalid");
    const miles = Number(d.miles);
    if (!Number.isFinite(miles) || miles <= 0 || miles > 100) throw new Error("miles must be between 0 and 100");
    const steps = d.steps == null ? null : Math.max(0, Math.min(200_000, Math.floor(Number(d.steps))));
    const activity = d.activity && ["walking","running","cycling","hiking"].includes(d.activity) ? d.activity : "walking";
    return { journeyId: d.journeyId, miles, steps, activity };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("journey_logs").insert({
      journey_id: data.journeyId,
      user_id: userId,
      miles: data.miles,
      steps: data.steps ?? null,
      activity: data.activity,
    });
    if (error) throw new Error(error.message);

    // Mark journey complete if we've hit the total
    const [{ data: journey }, { data: logs }] = await Promise.all([
      supabase.from("journeys").select("total_miles, status, id, mode").eq("id", data.journeyId).maybeSingle(),
      supabase.from("journey_logs").select("miles").eq("journey_id", data.journeyId),
    ]);
    const total = (logs ?? []).reduce((a, l) => a + Number(l.miles), 0);
    if (journey && journey.status === "active" && total >= Number(journey.total_miles)) {
      await supabase.from("journeys")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", data.journeyId);
    }

    // Optionally post to conversation
    if (journey?.mode === "couple") {
      const { data: fullJourney } = await supabase
        .from("journeys").select("share_in_chat, from_city, to_city").eq("id", data.journeyId).maybeSingle();
      if (fullJourney?.share_in_chat) {
        const { data: parts } = await supabase
          .from("journey_participants").select("user_id").eq("journey_id", data.journeyId);
        const partner = (parts ?? []).find((p) => p.user_id !== userId);
        if (partner) {
          const a = userId < partner.user_id ? userId : partner.user_id;
          const b = userId < partner.user_id ? partner.user_id : userId;
          const { data: conv } = await supabase
            .from("conversations").select("id").eq("user_a", a).eq("user_b", b).maybeSingle();
          if (conv) {
            await supabase.from("messages").insert({
              conversation_id: conv.id,
              sender_id: userId,
              content: `🚶 Walked ${data.miles} mi today on our journey to ${fullJourney.to_city}. Total now: ${total.toFixed(1)} mi.`,
              message_type: "system",
            });
          }
        }
      }
    }
    return { ok: true, total: +total.toFixed(2) };
  });

/* ---------- Update settings (share_in_chat) ---------- */
export const updateJourneySettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { journeyId: string; shareInChat?: boolean }) => {
    if (!d?.journeyId || !UUID.test(d.journeyId)) throw new Error("journeyId invalid");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    if (typeof data.shareInChat !== "boolean") return { ok: true };
    const { error } = await supabase
      .from("journeys")
      .update({ share_in_chat: data.shareInChat })
      .eq("id", data.journeyId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------- Leave / delete journey ---------- */
export const leaveJourney = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { journeyId: string }) => {
    if (!d?.journeyId || !UUID.test(d.journeyId)) throw new Error("journeyId invalid");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("journey_participants")
      .delete()
      .eq("journey_id", data.journeyId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
