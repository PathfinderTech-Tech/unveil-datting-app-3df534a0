import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Heart, Brain, MapPin, Award, Star, Footprints,
  Flame, Clock, Share2, Sparkles, Plus, BookMarked, Trophy,
  User, Compass, Loader2, ArrowRight, Check, X, Users, ChevronLeft,
  Search, BadgeCheck, Circle,
} from "lucide-react";
import {
  listMyJourneys, getJourney, createSoloJourney, createCoupleJourney,
  listInvitableMatches, listMyInvites, respondToInvite,
  logWalk, updateJourneySettings, leaveJourney, listRoutePresets,
} from "@/lib/journey.functions";

export const Route = createFileRoute("/journey")({
  head: () => ({
    meta: [
      { title: "UNVEIL Journey — Walk the World Together" },
      { name: "description", content: "Turn every step into a shared journey across the world. Walk together, unlock landmarks, collect passport stamps." },
    ],
  }),
  component: JourneyPage,
});

/* ============ Root page ============ */
function JourneyPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <Shell><Loading /></Shell>;
  if (!session) {
    return (
      <Shell>
        <div className="mx-auto max-w-md rounded-3xl border border-pink-500/25 bg-white/[0.03] p-8 text-center backdrop-blur">
          <Heart className="mx-auto mb-4 h-8 w-8 text-pink-400" fill="currentColor" />
          <h2 className="font-display text-2xl">Sign in to start your Journey</h2>
          <p className="mt-2 text-sm text-white/60">Walk the world with someone you love — together.</p>
          <button
            onClick={() => navigate({ to: "/login" })}
            className="mt-5 rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500 px-6 py-2.5 text-sm font-medium shadow-[0_0_24px_rgba(236,72,153,0.5)]"
          >Sign in</button>
        </div>
      </Shell>
    );
  }

  return <JourneyApp />;
}

function JourneyApp() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const listFn = useServerFn(listMyJourneys);
  const invitesFn = useServerFn(listMyInvites);
  const list = useQuery({ queryKey: ["journey", "list"], queryFn: () => listFn() });
  const invites = useQuery({ queryKey: ["journey", "invites"], queryFn: () => invitesFn() });

  useEffect(() => {
    // Auto-open the most recent active journey
    if (!selectedId && list.data?.journeys?.length) {
      const active = list.data.journeys.find((j: any) => j.status === "active") ?? list.data.journeys[0];
      if (active) setSelectedId(active.id);
    }
  }, [list.data, selectedId]);

  if (list.isLoading) return <Shell><Loading /></Shell>;

  const journeys = list.data?.journeys ?? [];
  const pendingInvites = (invites.data?.invites ?? []).filter((i: any) => i.status === "pending");

  if (selectedId) {
    return (
      <Shell>
        <button
          onClick={() => setSelectedId(null)}
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/70 hover:bg-white/10"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> All journeys
        </button>
        <JourneyDetail journeyId={selectedId} onLeft={() => setSelectedId(null)} />
      </Shell>
    );
  }

  return (
    <Shell>
      <Header />

      {pendingInvites.length > 0 && (
        <section className="mb-6 space-y-3">
          {pendingInvites.map((i: any) => (
            <InviteCard key={i.id} invite={i} onDone={() => { invites.refetch(); list.refetch(); }} onOpen={(id) => setSelectedId(id)} />
          ))}
        </section>
      )}

      {journeys.length > 0 && (
        <section className="mb-6">
          <div className="mb-3 text-xs uppercase tracking-[0.2em] text-white/60">Your Journeys</div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {journeys.map((j: any) => (
              <button
                key={j.id}
                onClick={() => setSelectedId(j.id)}
                className="group rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left backdrop-blur hover:border-pink-400/40"
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase tracking-widest text-white/50">{j.mode === "couple" ? "Couple" : "Solo"}</div>
                  {j.status === "completed" && <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300">Completed</span>}
                </div>
                <div className="mt-2 font-display text-lg">{j.from_flag} {j.from_city} → {j.to_flag} {j.to_city}</div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-pink-400 to-indigo-400"
                    style={{ width: `${Math.min(100, (j.completed_miles / Number(j.total_miles)) * 100)}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-white/60">
                  <span>{j.completed_miles} / {j.total_miles} mi</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <StartJourneyPanel onCreated={(id) => { list.refetch(); setSelectedId(id); }} />

      <HealthNote />
    </Shell>
  );
}

/* ============ Start journey ============ */
function StartJourneyPanel({ onCreated }: { onCreated: (id: string) => void }) {
  const [mode, setMode] = useState<"solo" | "couple">("solo");
  const [routeId, setRouteId] = useState("paris-london");
  const [role, setRole] = useState<"heart" | "mind">("heart");
  const [partnerId, setPartnerId] = useState<string | null>(null);

  const routesFn = useServerFn(listRoutePresets);
  const routes = useQuery({ queryKey: ["journey", "routes"], queryFn: () => routesFn() });

  const matchesFn = useServerFn(listInvitableMatches);
  const matches = useQuery({
    queryKey: ["journey", "matches"],
    queryFn: () => matchesFn(),
    enabled: mode === "couple",
  });

  const soloFn = useServerFn(createSoloJourney);
  const coupleFn = useServerFn(createCoupleJourney);
  const createSolo = useMutation({
    mutationFn: (v: { routeId: string }) => soloFn({ data: v }),
    onSuccess: (res: any) => { toast.success("Solo journey started"); onCreated(res.journeyId); },
    onError: (e: any) => toast.error(e.message ?? "Could not start journey"),
  });
  const createCouple = useMutation({
    mutationFn: (v: { routeId: string; partnerId: string; myRole: "heart" | "mind" }) => coupleFn({ data: v }),
    onSuccess: (res: any) => { toast.success("Invite sent to your partner"); onCreated(res.journeyId); },
    onError: (e: any) => toast.error(e.message ?? "Could not start journey"),
  });

  const start = () => {
    if (mode === "solo") return createSolo.mutate({ routeId });
    if (!partnerId) return toast.error("Choose a match to invite");
    createCouple.mutate({ routeId, partnerId, myRole: role });
  };

  const selected = routes.data?.find((r: any) => r.id === routeId);

  return (
    <section className="rounded-3xl border border-pink-500/25 bg-white/[0.03] p-6 backdrop-blur">
      <div className="mb-4 flex items-center gap-2">
        <Compass className="h-4 w-4 text-pink-300" />
        <h2 className="font-display text-xl">Start a new Journey</h2>
      </div>

      {/* Mode */}
      <div className="mb-4 inline-flex rounded-full border border-white/10 bg-white/5 p-1">
        <ModePill active={mode === "solo"} onClick={() => setMode("solo")} icon={<User className="h-4 w-4" />} label="Solo" />
        <ModePill active={mode === "couple"} onClick={() => setMode("couple")} icon={<Heart className="h-4 w-4" fill={mode === "couple" ? "currentColor" : "none"} />} label="Couple" />
      </div>

      {/* Route */}
      <div className="mb-4">
        <div className="mb-2 text-xs uppercase tracking-widest text-white/60">Choose a route</div>
        <div className="grid gap-2 sm:grid-cols-2">
          {(routes.data ?? []).map((r: any) => (
            <button
              key={r.id}
              onClick={() => setRouteId(r.id)}
              className={`rounded-2xl border p-3 text-left transition ${
                routeId === r.id
                  ? "border-pink-400 bg-pink-500/10"
                  : "border-white/10 bg-white/[0.02] hover:border-white/25"
              }`}
            >
              <div className="font-display text-sm">{r.from_flag} {r.from_city} → {r.to_flag} {r.to_city}</div>
              <div className="text-xs text-white/60">{r.total_miles} mi · {r.total_km} km · {r.landmarks.length} landmarks</div>
            </button>
          ))}
        </div>
      </div>

      {/* Couple picker */}
      {mode === "couple" && (
        <div className="mb-4 space-y-3">
          <div>
            <div className="mb-1 text-xs uppercase tracking-widest text-white/60">You are</div>
            <div className="flex gap-2">
              <RolePill role="heart" active={role === "heart"} onClick={() => setRole("heart")} />
              <RolePill role="mind" active={role === "mind"} onClick={() => setRole("mind")} />
            </div>
          </div>
          <div>
            <div className="mb-2 text-xs uppercase tracking-widest text-white/60">Choose your journey partner</div>
            <PartnerGrid
              loading={matches.isLoading}
              matches={matches.data?.matches ?? []}
              partnerId={partnerId}
              onPick={setPartnerId}
            />
          </div>
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-white/60">
          {selected ? <>{selected.total_miles} mi · Est. {Math.ceil(selected.total_miles / 3.5)} days at 3.5 mi/day</> : null}
        </div>
        <button
          onClick={start}
          disabled={createSolo.isPending || createCouple.isPending}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500 px-6 py-2.5 text-sm font-medium shadow-[0_0_20px_rgba(236,72,153,0.5)] disabled:opacity-50"
        >
          {createSolo.isPending || createCouple.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {mode === "solo" ? "Start Solo Journey" : "Invite & Start"}
        </button>
      </div>
    </section>
  );
}

/* ============ Detail view ============ */
function JourneyDetail({ journeyId, onLeft }: { journeyId: string; onLeft: () => void }) {
  const qc = useQueryClient();
  const getFn = useServerFn(getJourney);
  const q = useQuery({
    queryKey: ["journey", journeyId],
    queryFn: () => getFn({ data: { journeyId } }),
    refetchOnWindowFocus: true,
  });

  const [miles, setMiles] = useState("");
  const [steps, setSteps] = useState("");
  const [activity, setActivity] = useState<"walking" | "running" | "cycling" | "hiking">("walking");

  const logFn = useServerFn(logWalk);
  const settingsFn = useServerFn(updateJourneySettings);
  const leaveFn = useServerFn(leaveJourney);

  const log = useMutation({
    mutationFn: (v: { miles: number; steps?: number; activity: string }) =>
      logFn({ data: { journeyId, ...v } }),
    onSuccess: () => {
      setMiles(""); setSteps("");
      toast.success("Walk logged");
      qc.invalidateQueries({ queryKey: ["journey", journeyId] });
      qc.invalidateQueries({ queryKey: ["journey", "list"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not log"),
  });

  const toggleShare = useMutation({
    mutationFn: (v: boolean) => settingsFn({ data: { journeyId, shareInChat: v } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["journey", journeyId] }),
  });

  const leave = useMutation({
    mutationFn: () => leaveFn({ data: { journeyId } }),
    onSuccess: () => { toast.success("Left journey"); qc.invalidateQueries({ queryKey: ["journey", "list"] }); onLeft(); },
    onError: (e: any) => toast.error(e.message ?? "Could not leave"),
  });

  if (q.isLoading) return <Loading />;
  if (q.isError || !q.data) return <div className="text-center text-sm text-white/60">Could not load journey.</div>;

  const { journey, participants, completed_miles, my_today_miles, my_today_steps } = q.data;
  const totalMiles = Number(journey.total_miles);
  const remaining = Math.max(0, totalMiles - completed_miles);
  const remainingKm = Math.round(remaining * 1.609);
  const pct = Math.min(100, (completed_miles / totalMiles) * 100);
  const landmarks: any[] = Array.isArray(journey.landmarks) ? journey.landmarks : [];
  const reachedIdx = landmarks.reduce((acc, l, i) => (completed_miles >= l.mile ? i : acc), 0);
  const nextLandmark = landmarks[Math.min(reachedIdx + 1, landmarks.length - 1)];
  const me = participants.find((p: any) => p.is_me);
  const partner = participants.find((p: any) => !p.is_me);

  const submit = () => {
    const m = parseFloat(miles);
    if (!Number.isFinite(m) || m <= 0) return toast.error("Enter miles walked today");
    log.mutate({ miles: m, steps: steps ? parseInt(steps, 10) : undefined, activity });
  };

  return (
    <div className="space-y-6">
      <Header title={`${journey.from_flag} ${journey.from_city} → ${journey.to_flag} ${journey.to_city}`} subtitle={journey.mode === "couple" ? "Couple Journey" : "Solo Journey"} />

      {/* Map card */}
      <section className="relative overflow-hidden rounded-3xl border border-pink-500/25 bg-white/[0.03] p-5 backdrop-blur md:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <CityPin side="from" city={journey.from_city} flag={journey.from_flag ?? "🌍"} tone="pink" />
          <div className="flex-1 min-w-[160px] px-2">
            <div className="mx-auto flex max-w-xs items-center justify-center gap-2 rounded-2xl border border-pink-400/30 bg-black/40 px-4 py-3">
              <MapPin className="h-4 w-4 text-pink-400" />
              <div className="text-center">
                <div className="font-display text-lg leading-tight">{remaining.toFixed(0)} mi <span className="text-white/50">/</span> {remainingKm} km</div>
                <div className="text-[10px] uppercase tracking-widest text-white/60">Distance to go</div>
              </div>
            </div>
          </div>
          <CityPin side="to" city={journey.to_city} flag={journey.to_flag ?? "🌍"} tone="indigo" />
        </div>

        <WorldMap progressPct={pct} fromCity={journey.from_city} toCity={journey.to_city} />

        <div className="mt-6 grid gap-4 rounded-2xl border border-white/10 bg-black/40 p-5 md:grid-cols-3">
          <div>
            <div className="text-xs uppercase tracking-widest text-white/60">My progress today</div>
            <div className="mt-1 font-display text-3xl text-pink-300">{my_today_miles.toFixed(1)} <span className="text-sm text-white/60">mi</span></div>
            <div className="text-xs text-white/50">{(my_today_steps ?? 0).toLocaleString()} steps</div>
          </div>
          {journey.mode === "couple" && (
            <div>
              <div className="text-xs uppercase tracking-widest text-white/60">Partner total</div>
              <div className="mt-1 font-display text-3xl text-indigo-300">
                {partner ? partner.total_miles.toFixed(1) : "—"} <span className="text-sm text-white/60">mi</span>
              </div>
              <div className="text-xs text-white/50">{partner ? (partner.profile?.first_name ?? "Partner") : "Waiting for partner…"}</div>
            </div>
          )}
          <div className={journey.mode === "couple" ? "" : "md:col-span-2"}>
            <div className="flex items-baseline justify-between">
              <div className="text-xs uppercase tracking-widest text-white/60">Total journey</div>
              <div className="text-xs text-white/60">{pct.toFixed(0)}%</div>
            </div>
            <div className="mt-1 font-display text-2xl">
              {completed_miles.toFixed(1)} <span className="text-white/50 text-base"> / {totalMiles} mi</span>
            </div>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-pink-400 via-fuchsia-500 to-indigo-400"
                style={{ width: `${pct}%` }}
              />
            </div>
            {nextLandmark && journey.status === "active" && (
              <div className="mt-2 text-xs text-white/60">
                Next: <span className="text-pink-300">{nextLandmark.name}</span> · {Math.max(0, nextLandmark.mile - completed_miles).toFixed(0)} mi away
              </div>
            )}
            {journey.status === "completed" && (
              <div className="mt-2 text-xs text-emerald-300">🎉 You arrived in {journey.to_city}!</div>
            )}
          </div>
        </div>
      </section>

      {/* Log walk */}
      {journey.status === "active" && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur">
          <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/60">
            <Footprints className="h-3.5 w-3.5 text-pink-400" /> Log today's walk
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <label className="text-xs text-white/70">
              Miles
              <input
                inputMode="decimal"
                value={miles}
                onChange={(e) => setMiles(e.target.value)}
                placeholder="4.2"
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white outline-none focus:border-pink-400"
              />
            </label>
            <label className="text-xs text-white/70">
              Steps (optional)
              <input
                inputMode="numeric"
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
                placeholder="6500"
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white outline-none focus:border-pink-400"
              />
            </label>
            <div className="md:col-span-2">
              <div className="text-xs text-white/70">Activity</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {(["walking", "running", "cycling", "hiking"] as const).map((a) => (
                  <button
                    key={a}
                    onClick={() => setActivity(a)}
                    className={`rounded-full border px-3 py-1 text-[11px] capitalize ${activity === a ? "border-pink-400 bg-pink-500/15 text-pink-200" : "border-white/10 bg-white/[0.03] text-white/60 hover:border-pink-400/40"}`}
                  >
                    {a === "walking" ? "🚶" : a === "running" ? "🏃" : a === "cycling" ? "🚴" : "🥾"} {a}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={submit}
              disabled={log.isPending}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500 px-5 py-2.5 text-sm font-medium shadow-[0_0_20px_rgba(236,72,153,0.5)] disabled:opacity-50"
            >
              {log.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Log walk
            </button>
          </div>
        </section>
      )}

      {/* Route highlights */}
      <section>
        <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/70">
          <Compass className="h-3.5 w-3.5 text-pink-400" /> Route highlights
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {landmarks.map((l, i) => {
            const reached = completed_miles >= l.mile;
            const isCurrent = i === reachedIdx && journey.status === "active";
            return (
              <div
                key={l.key}
                className={`relative overflow-hidden rounded-2xl border p-4 backdrop-blur ${
                  isCurrent ? "border-amber-300/60 bg-amber-500/5" : reached ? "border-pink-400/40 bg-white/[0.03]" : "border-white/10 bg-white/[0.02] opacity-70"
                }`}
              >
                {reached && !isCurrent && (
                  <div className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-pink-500/30 text-pink-200 text-[10px]">✓</div>
                )}
                {isCurrent && <div className="absolute right-2 top-2 text-amber-300"><MapPin className="h-4 w-4" fill="currentColor" /></div>}
                <div className="grid h-16 w-full place-items-center rounded-xl bg-gradient-to-br from-indigo-900/60 to-black/60 text-3xl">{l.emoji}</div>
                <div className="mt-3 font-display text-sm">{l.name}</div>
                <div className="mt-0.5 text-[10px] uppercase tracking-widest text-white/60">{l.label}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Rewards + Share + Members */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-4 text-center text-xs uppercase tracking-[0.2em] text-white/60">Journey Rewards</div>
          <div className="grid grid-cols-4 gap-3 text-center">
            <RewardTile icon={<BookMarked className="h-6 w-6 text-amber-200" />} value={String(landmarks.filter(l => completed_miles >= l.mile).length)} label="Stamps" ring="from-amber-500/30 to-amber-800/20" />
            <RewardTile icon={<Heart className="h-6 w-6 text-pink-300" fill="currentColor" />} value={String(Math.round(completed_miles * 10))} label="Love pts" ring="from-pink-500/30 to-fuchsia-800/20" />
            <RewardTile icon={<Star className="h-6 w-6 text-yellow-300" fill="currentColor" />} value={String(Math.round(completed_miles * 25))} label="XP" ring="from-yellow-500/30 to-amber-800/20" />
            <RewardTile icon={<Award className="h-6 w-6 text-emerald-300" />} value={journey.status === "completed" ? "1" : "0"} label="Badges" ring="from-emerald-500/30 to-teal-800/20" />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-4 text-center text-xs uppercase tracking-[0.2em] text-white/60">
            {journey.mode === "couple" ? "Share Journey" : "Privacy"}
          </div>
          {journey.mode === "couple" ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center gap-2 text-sm">
                <Share2 className="h-4 w-4 text-pink-300" />
                <div>
                  <div>Share progress</div>
                  <div className="text-[11px] text-white/60">in your conversation</div>
                </div>
              </div>
              <Toggle on={!!journey.share_in_chat} onChange={(v) => toggleShare.mutate(v)} />
            </div>
          ) : (
            <div className="text-center text-sm text-white/60">Your solo journey stays private.</div>
          )}

          <div className="mt-4 space-y-2">
            {participants.map((p: any) => (
              <div key={p.user_id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-2">
                <Avatar tone={p.role === "mind" ? "indigo" : "pink"} icon={p.role === "mind" ? <Brain className="h-4 w-4" /> : <Heart className="h-4 w-4" fill="currentColor" />} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{p.is_me ? "You" : (p.profile?.first_name ?? "Partner")}</div>
                  <div className="text-[11px] text-white/50 capitalize">{p.role} · {p.total_miles.toFixed(1)} mi</div>
                </div>
              </div>
            ))}
            {journey.mode === "solo" && (
              <div className="flex items-center gap-3 rounded-xl border border-dashed border-pink-400/40 bg-pink-500/5 p-2">
                <div className="grid h-10 w-10 place-items-center rounded-full border border-pink-400/50 bg-white/[0.03] text-pink-300 shadow-[0_0_18px_-4px_rgba(236,72,153,0.7)]">
                  <Plus className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-white/90">Invite a match anytime</div>
                  <div className="text-[11px] text-white/55">Turn this into a shared walk later.</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-4 text-center text-xs uppercase tracking-[0.2em] text-white/60">Journey Actions</div>
          <button
            onClick={() => { if (confirm("Leave this journey?")) leave.mutate(); }}
            disabled={leave.isPending}
            className="w-full rounded-full border border-white/10 bg-white/5 py-2.5 text-sm text-white/80 hover:bg-white/10 disabled:opacity-50"
          >
            Leave journey
          </button>
        </div>
      </section>

      <HealthNote />
    </div>
  );
}

/* ============ Invite card ============ */
function InviteCard({ invite, onDone, onOpen }: { invite: any; onDone: () => void; onOpen: (id: string) => void }) {
  const respondFn = useServerFn(respondToInvite);
  const respond = useMutation({
    mutationFn: (action: "accept" | "decline" | "cancel") => respondFn({ data: { inviteId: invite.id, action } }),
    onSuccess: (res: any, action) => {
      if (action === "accept") { toast.success("Journey joined"); if (res?.journeyId) onOpen(res.journeyId); }
      else toast.success(action === "decline" ? "Declined" : "Invite cancelled");
      onDone();
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
  const isReceived = invite.direction === "received";
  const other = isReceived ? invite.from_profile : invite.to_profile;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-400/30 bg-gradient-to-r from-amber-500/10 to-pink-500/10 p-4">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-amber-500/20 text-amber-300"><Users className="h-5 w-5" /></div>
        <div>
          <div className="text-sm">
            {isReceived
              ? <><b>{other?.first_name ?? "Someone"}</b> invited you to walk <b>{invite.journey?.from_city} → {invite.journey?.to_city}</b> as <b className="capitalize">{invite.role_offered}</b></>
              : <>Waiting for <b>{other?.first_name ?? "your match"}</b> to accept <b>{invite.journey?.from_city} → {invite.journey?.to_city}</b></>}
          </div>
          <div className="text-[11px] text-white/50">{invite.journey?.total_miles} mi journey</div>
        </div>
      </div>
      <div className="flex gap-2">
        {isReceived ? (
          <>
            <button onClick={() => respond.mutate("accept")} disabled={respond.isPending} className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-xs font-medium disabled:opacity-50">
              <Check className="h-3.5 w-3.5" /> Accept
            </button>
            <button onClick={() => respond.mutate("decline")} disabled={respond.isPending} className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs text-white/80 hover:bg-white/10 disabled:opacity-50">
              <X className="h-3.5 w-3.5" /> Decline
            </button>
          </>
        ) : (
          <button onClick={() => respond.mutate("cancel")} disabled={respond.isPending} className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs text-white/80 hover:bg-white/10 disabled:opacity-50">
            <X className="h-3.5 w-3.5" /> Cancel invite
          </button>
        )}
      </div>
    </div>
  );
}

/* ============ Reusables ============ */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#07061a] text-foreground">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full opacity-40 blur-3xl" style={{ background: "radial-gradient(circle, #d946ef 0%, transparent 60%)" }} />
        <div className="absolute top-1/3 -right-52 h-[620px] w-[620px] rounded-full opacity-30 blur-3xl" style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 60%)" }} />
        <div className="absolute bottom-0 left-1/3 h-[520px] w-[520px] rounded-full opacity-25 blur-3xl" style={{ background: "radial-gradient(circle, #ec4899 0%, transparent 60%)" }} />
      </div>
      <UnveilNav />
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">{children}</div>
    </div>
  );
}

function Header({ title, subtitle }: { title?: string; subtitle?: string } = {}) {
  return (
    <header className="mb-8 flex flex-col items-center gap-2 text-center">
      <h1 className="font-display text-4xl font-light tracking-wide md:text-5xl">
        <span className="text-gradient-hero">{title ?? "UNVEIL JOURNEY"}</span>
      </h1>
      <p className="flex items-center gap-2 text-sm text-white/70">
        <Heart className="h-4 w-4 text-pink-400" fill="currentColor" />
        {subtitle ?? "Walk the world. Together."}
        <Sparkles className="h-4 w-4 text-amber-300" />
      </p>
    </header>
  );
}

function Loading() {
  return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="h-6 w-6 animate-spin text-pink-400" />
    </div>
  );
}

function ModePill({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm transition ${
        active ? "bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white shadow-[0_0_20px_rgba(236,72,153,0.5)]" : "text-white/70 hover:text-white"
      }`}
    >
      {icon}{label}
    </button>
  );
}

function RolePill({ role, active, onClick }: { role: "heart" | "mind"; active: boolean; onClick: () => void }) {
  const isHeart = role === "heart";
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs capitalize transition ${
        active
          ? (isHeart ? "border-pink-400 bg-pink-500/15 text-pink-200" : "border-indigo-400 bg-indigo-500/15 text-indigo-200")
          : "border-white/10 text-white/60 hover:border-white/25"
      }`}
    >
      {isHeart ? <Heart className="h-3 w-3" fill="currentColor" /> : <Brain className="h-3 w-3" />}
      {role}
    </button>
  );
}

function CityPin({ side, city, flag, tone }: { side: "from" | "to"; city: string; flag: string; tone: "pink" | "indigo"; }) {
  const ring = tone === "pink" ? "ring-pink-400/70 shadow-[0_0_32px_rgba(236,72,153,0.5)]" : "ring-indigo-400/70 shadow-[0_0_32px_rgba(99,102,241,0.5)]";
  const tint = tone === "pink" ? "text-pink-300" : "text-indigo-300";
  return (
    <div className="flex items-center gap-3">
      {side === "from" && (
        <div className={`grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-indigo-900 to-black text-2xl ring-2 ${ring}`}>🌆</div>
      )}
      <div className={side === "to" ? "text-right" : ""}>
        <div className={`text-[10px] uppercase tracking-[0.2em] ${tint}`}>{side === "from" ? "FROM" : "TO"}</div>
        <div className="font-display text-2xl leading-tight">{flag} {city}</div>
      </div>
      {side === "to" && (
        <div className={`grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-indigo-900 to-black text-2xl ring-2 ${ring}`}>🎡</div>
      )}
    </div>
  );
}

function WorldMap({ progressPct, fromCity, toCity }: { progressPct: number; fromCity: string; toCity: string }) {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-indigo-500/25 bg-[radial-gradient(circle_at_30%_30%,rgba(99,102,241,0.25),transparent_60%),radial-gradient(circle_at_70%_60%,rgba(236,72,153,0.2),transparent_60%),#0a0824]">
      <svg viewBox="0 0 800 320" className="h-56 w-full md:h-72" preserveAspectRatio="none">
        <defs>
          <linearGradient id="routeGrad" x1="0" x2="1">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="50%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>
          <radialGradient id="cityGlowPink"><stop offset="0%" stopColor="#f472b6" stopOpacity="0.9" /><stop offset="100%" stopColor="#f472b6" stopOpacity="0" /></radialGradient>
          <radialGradient id="cityGlowBlue"><stop offset="0%" stopColor="#60a5fa" stopOpacity="0.9" /><stop offset="100%" stopColor="#60a5fa" stopOpacity="0" /></radialGradient>
        </defs>
        <g fill="rgba(148,163,255,0.14)" stroke="rgba(148,163,255,0.25)" strokeWidth="1">
          <path d="M 60 120 Q 140 80, 240 110 T 380 140 Q 420 180, 380 220 T 240 240 Q 140 240, 60 200 Z" />
          <path d="M 460 90 Q 560 70, 640 110 T 760 160 Q 720 220, 640 240 T 480 220 Q 440 170, 460 90 Z" />
        </g>
        <path d="M 180 200 Q 320 100, 460 170 T 660 150" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" strokeDasharray="4 6" />
        <path
          d="M 180 200 Q 320 100, 460 170 T 660 150"
          fill="none" stroke="url(#routeGrad)" strokeWidth="3.5"
          strokeDasharray="1000" strokeDashoffset={1000 - (progressPct / 100) * 1000}
          strokeLinecap="round"
          style={{ filter: "drop-shadow(0 0 6px rgba(236,72,153,0.7))", transition: "stroke-dashoffset 0.8s ease" }}
        />
        <circle cx="180" cy="200" r="24" fill="url(#cityGlowPink)" />
        <circle cx="180" cy="200" r="6" fill="#f472b6" />
        <text x="180" y="235" textAnchor="middle" fill="white" fontSize="12" fontWeight="500">{fromCity}</text>
        <circle cx="660" cy="150" r="24" fill="url(#cityGlowBlue)" />
        <circle cx="660" cy="150" r="6" fill="#60a5fa" />
        <text x="660" y="185" textAnchor="middle" fill="white" fontSize="12" fontWeight="500">{toCity}</text>
      </svg>
    </div>
  );
}

function RewardTile({ icon, value, label, ring }: { icon: React.ReactNode; value: string; label: string; ring: string; }) {
  return (
    <div>
      <div className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-gradient-to-br ${ring}`}>{icon}</div>
      <div className="mt-2 font-display text-sm">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-white/60">{label}</div>
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void; }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 rounded-full transition ${on ? "bg-gradient-to-r from-pink-500 to-fuchsia-500" : "bg-white/15"}`}
      aria-pressed={on}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${on ? "left-[calc(100%-1.375rem)]" : "left-0.5"}`} />
    </button>
  );
}

function Avatar({ tone, icon }: { tone: "pink" | "indigo"; icon: React.ReactNode; }) {
  const cls = tone === "pink"
    ? "from-pink-500 to-fuchsia-600 ring-pink-300/60"
    : "from-indigo-500 to-blue-600 ring-indigo-300/60";
  return <div className={`grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br ${cls} text-white ring-2`}>{icon}</div>;
}

function HealthNote() {
  const [consent, setConsent] = useState<boolean | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !alive) return;
      const { data } = await supabase
        .from("profiles")
        .select("journey_health_consent")
        .eq("id", user.id)
        .maybeSingle();
      if (!alive) return;
      setConsent(!!(data as { journey_health_consent?: boolean } | null)?.journey_health_consent);
      try {
        setConnected(typeof window !== "undefined" && window.localStorage.getItem("unveil.health.connected") === "1");
      } catch { /* ignore */ }
    })();
    return () => { alive = false; };
  }, []);

  async function enable() {
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); return; }
    const { error } = await supabase
      .from("profiles")
      .update({ journey_health_consent: true, journey_health_consent_at: new Date().toISOString() } as never)
      .eq("id", user.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setConsent(true);
    toast.success("Consent saved. We'll ask your device for permission next.");
  }

  async function connect() {
    setBusy(true);
    // Native HealthKit / Health Connect bridge lands with the mobile build.
    // Web fallback: mark connected locally so the UI reflects the user's intent.
    await new Promise((r) => setTimeout(r, 400));
    try { window.localStorage.setItem("unveil.health.connected", "1"); } catch { /* ignore */ }
    setConnected(true);
    setBusy(false);
    toast.success("Health tracking connected. On mobile you'll see the native permission prompt.");
  }

  const status = consent === null
    ? "Loading…"
    : !consent
      ? "Not connected"
      : connected
        ? "Connected"
        : "Not connected";

  const tone = connected
    ? "border-emerald-400/30 from-emerald-500/5"
    : consent
      ? "border-pink-400/30 from-pink-500/5"
      : "border-amber-400/30 from-amber-500/5";

  return (
    <section className={`mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border ${tone} bg-gradient-to-r to-transparent p-5`}>
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-white/5 text-pink-300">
          <Footprints className="h-5 w-5" />
        </div>
        <div>
          <div className="font-display text-base">Health tracking · <span className="text-white/70">{status}</span></div>
          <div className="text-xs text-white/60">
            Movement data only (steps, walking/running distance). Your exact location is never tracked. Manual logging is always available.
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {consent === false && (
          <button
            disabled={busy}
            onClick={enable}
            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs hover:bg-white/10 disabled:opacity-50"
          >
            Allow health tracking
          </button>
        )}
        {consent === true && !connected && (
          <button
            disabled={busy}
            onClick={connect}
            className="rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500 px-4 py-2 text-xs font-medium shadow-[0_0_18px_rgba(236,72,153,0.45)] disabled:opacity-50"
          >
            Connect Health Tracking
          </button>
        )}
        {connected && (
          <span className="rounded-full border border-emerald-300/40 bg-white/[0.03] px-3 py-1 text-[10px] uppercase tracking-widest text-emerald-200">
            Connected
          </span>
        )}
      </div>
    </section>
  );
}

/* ============ Partner Grid ============ */
type MatchRow = {
  id: string;
  first_name: string | null;
  age: number | null;
  city: string | null;
  country: string | null;
  verified: boolean;
  bio: string | null;
  photo_url: string | null;
};

const FILTERS = [
  { id: "all",      label: "All matches" },
  { id: "verified", label: "Verified" },
  { id: "nearby",   label: "Nearby" },
  { id: "photo",    label: "With photo" },
] as const;
type FilterId = typeof FILTERS[number]["id"];

function PartnerGrid({
  loading, matches, partnerId, onPick,
}: {
  loading: boolean;
  matches: MatchRow[];
  partnerId: string | null;
  onPick: (id: string | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");
  const [myCity, setMyCity] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: prof } = await supabase.from("profiles").select("city").eq("id", data.user.id).maybeSingle();
      if (alive) setMyCity((prof as any)?.city ?? null);
    });
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return matches.filter((m) => {
      if (q && !(`${m.first_name ?? ""} ${m.city ?? ""} ${m.country ?? ""}`.toLowerCase().includes(q))) return false;
      if (filter === "verified" && !m.verified) return false;
      if (filter === "photo" && !m.photo_url) return false;
      if (filter === "nearby" && !(myCity && m.city && m.city.toLowerCase() === myCity.toLowerCase())) return false;
      return true;
    });
  }, [matches, query, filter, myCity]);

  if (loading) {
    return <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-xs text-white/50">Loading your matches…</div>;
  }
  if (matches.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/60">
        You don't have any mutual matches yet. Match with someone in Discover, then invite them here.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search matches…"
            className="w-full rounded-full border border-white/10 bg-white/[0.04] py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/40 focus:border-pink-400/50 focus:outline-none"
          />
        </div>
      </div>
      <div className="-mx-1 flex gap-1.5 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs transition ${
              filter === f.id ? "border-pink-400 bg-pink-500/15 text-pink-100" : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/25"
            }`}
          >{f.label}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 p-4 text-center text-xs text-white/50">
          No matches fit that filter.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((m) => (
            <PartnerCard
              key={m.id}
              m={m}
              selected={partnerId === m.id}
              onPick={() => onPick(partnerId === m.id ? "" : m.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PartnerCard({ m, selected, onPick }: { m: MatchRow; selected: boolean; onPick: () => void }) {
  const initial = (m.first_name ?? "?")[0]?.toUpperCase() ?? "?";
  return (
    <div
      className={`rounded-2xl border transition ${
        selected ? "border-pink-400 bg-pink-500/10 shadow-[0_0_24px_-8px_rgba(236,72,153,0.6)]" : "border-white/10 bg-white/[0.03] hover:border-white/25"
      }`}
    >
      <button onClick={onPick} className="flex w-full items-center gap-3 p-3 text-left">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-white/10">
          {m.photo_url
            ? <img src={m.photo_url} alt={m.first_name ?? "match"} className="h-full w-full object-cover" />
            : <div className="grid h-full w-full place-items-center text-lg font-medium">{initial}</div>}
          {m.verified && (
            <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full border-2 border-[#141221] bg-cyan-400 text-[#0b0715]" title="Verified">
              <BadgeCheck className="h-3 w-3" />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-sm">
            <span className="truncate font-medium text-white">{m.first_name ?? "Match"}</span>
            {m.age != null && <span className="text-white/60">, {m.age}</span>}
          </div>
          <div className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-white/60">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{[m.city, m.country].filter(Boolean).join(", ") || "Location private"}</span>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-medium ${
          selected ? "bg-white text-[#0b0715]" : "bg-white/10 text-white"
        }`}>{selected ? "Selected" : "Invite"}</span>
      </button>
      {selected && (
        <div className="border-t border-white/10 px-4 py-3">
          {m.bio ? (
            <p className="text-xs leading-relaxed text-white/75 line-clamp-3">{m.bio}</p>
          ) : (
            <p className="text-xs text-white/50">No bio yet. Start the journey — walking together tells its own story.</p>
          )}
          <div className="mt-2 flex items-center gap-1 text-[11px] text-white/50">
            <Circle className="h-2 w-2 fill-emerald-400 text-emerald-400" /> Ready to walk
          </div>
        </div>
      )}
    </div>
  );
}
