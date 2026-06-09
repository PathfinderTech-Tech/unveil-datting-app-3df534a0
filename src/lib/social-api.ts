// Mutual-match + share + date-plan wiring against real Supabase tables.
import { supabase } from "@/integrations/supabase/client";
import { getPrimaryProfileMedia } from "@/lib/profile-media.functions";

export type Partner = {
  userId: string;
  name: string;
  city: string | null;
  country: string | null;
  avatar: string | null;
  matchId: string;
  shareUserConsent: boolean;     // current user consent
  shareMatchedConsent: boolean;  // partner consent
  shareUnlocked: boolean;
  interactionCount: number;
  chemistryScore: number;
};

export async function loadMutualPartners(): Promise<Partner[]> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return [];
  const { data: rows } = await supabase
    .from("matches")
    .select("id, matched_user_id, share_user_consent, share_matched_consent, share_unlocked, interaction_count, chemistry_score")
    .eq("user_id", uid)
    .eq("mutual_interest", true);
  if (!rows?.length) return [];
  const ids = rows.map((r) => r.matched_user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, city, country, photo_url, profile_photo_url")
    .in("id", ids);
  const map = new Map((profiles ?? []).map((p) => [p.id, p]));
  const media = new Map((await getPrimaryProfileMedia({ data: { userIds: ids } })).map((p) => [p.id, p]));
  return rows.map((r) => {
    const p = map.get(r.matched_user_id);
    const m = media.get(r.matched_user_id);
    return {
      userId: r.matched_user_id,
      name: m?.firstName || p?.first_name?.trim() || "Someone",
      city: p?.city ?? null,
      country: p?.country ?? null,
      avatar: m?.photoUrl ?? p?.profile_photo_url ?? p?.photo_url ?? null,
      matchId: r.id,
      shareUserConsent: !!r.share_user_consent,
      shareMatchedConsent: !!r.share_matched_consent,
      shareUnlocked: !!r.share_unlocked,
      interactionCount: r.interaction_count ?? 0,
      chemistryScore: r.chemistry_score ?? 0,
    };
  });
}

export async function loadPartner(partnerUserId: string): Promise<Partner | null> {
  const all = await loadMutualPartners();
  return all.find((p) => p.userId === partnerUserId) ?? null;
}

export async function giveShareConsent(partnerUserId: string): Promise<{ unlocked: boolean; error: string | null }> {
  const { data, error } = await supabase.rpc("consent_share_contact", { _match_user: partnerUserId });
  if (error) return { unlocked: false, error: error.message };
  const row = Array.isArray(data) ? data[0] : data;
  return { unlocked: !!row?.unlocked, error: null };
}

export async function saveMyContact(partnerUserId: string, channels: { phone?: string; whatsapp?: string; instagram?: string; telegram?: string }) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { error: "not-signed-in" };
  const { error } = await supabase.from("shared_contacts").upsert(
    {
      user_id: u.user.id,
      matched_user_id: partnerUserId,
      phone: channels.phone ?? null,
      whatsapp: channels.whatsapp ?? null,
      instagram: channels.instagram ?? null,
      telegram: channels.telegram ?? null,
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: "user_id,matched_user_id" } as never,
  );
  return { error: error?.message ?? null };
}

export async function loadPartnerContact(partnerUserId: string) {
  const { data } = await supabase
    .from("shared_contacts")
    .select("phone, whatsapp, instagram, telegram")
    .eq("user_id", partnerUserId)
    .maybeSingle();
  return data ?? null;
}

export async function loadMyContact(partnerUserId: string) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data } = await supabase
    .from("shared_contacts")
    .select("phone, whatsapp, instagram, telegram")
    .eq("user_id", u.user.id)
    .eq("matched_user_id", partnerUserId)
    .maybeSingle();
  return data ?? null;
}

/* ---------- Date plans ---------- */

export type DatePlan = {
  id: string;
  proposerId: string;
  inviteeId: string;
  dateType: string;
  location: string | null;
  proposedAt: string | null;
  notes: string | null;
  status: string;
};

export async function proposeDate(input: { inviteeId: string; dateType: string; location?: string; notes?: string; proposedAt?: string | null }) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { error: "not-signed-in", plan: null };
  const { data, error } = await supabase.from("date_plans").insert({
    proposer_id: u.user.id,
    invitee_id: input.inviteeId,
    date_type: input.dateType,
    location: input.location ?? null,
    notes: input.notes ?? null,
    proposed_at: input.proposedAt ?? null,
    status: "pending",
  } as never).select().maybeSingle();
  if (error) return { error: error.message, plan: null };
  return { error: null, plan: data as never };
}

export async function loadDatePlans(): Promise<DatePlan[]> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return [];
  const { data } = await supabase
    .from("date_plans")
    .select("id, proposer_id, invitee_id, date_type, location, proposed_at, notes, status")
    .order("created_at", { ascending: false });
  return (data ?? []).map((d) => ({
    id: d.id,
    proposerId: d.proposer_id,
    inviteeId: d.invitee_id,
    dateType: d.date_type,
    location: d.location,
    proposedAt: d.proposed_at,
    notes: d.notes,
    status: d.status,
  }));
}

export async function respondToDatePlan(planId: string, status: "accepted" | "declined") {
  const { error } = await supabase.from("date_plans").update({ status, updated_at: new Date().toISOString() } as never).eq("id", planId);
  return { error: error?.message ?? null };
}
