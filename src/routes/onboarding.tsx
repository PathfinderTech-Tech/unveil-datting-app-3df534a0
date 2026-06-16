import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { SignedImage } from "@/components/SignedImage";
import {
  PROFESSIONS, DISCOVERY_QUESTIONS, discoveryToCharacter, discoverySummary,
  type DiscoveryProfile, type Profession,
} from "@/lib/synapse-store";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  Camera, ArrowRight, ArrowLeft, Check, Sparkles, Upload, Loader2, X,
  ShieldCheck, Save, MapPin, Languages, Briefcase, Heart, Wand2, Lock,
} from "lucide-react";
import { toast } from "sonner";
import "@/styles/unveil-onboarding.css";
import { LocationPicker } from "@/components/LocationPicker";
import { COUNTRY_BY_CODE, codeForName } from "@/lib/countries";
import { VoiceRecorder } from "@/components/VoiceRecorder";



export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Welcome to UNVEIL" }, { name: "description", content: "Set up your UNVEIL profile in a few guided steps." }] }),
  component: Onboarding,
});

// Country list now lives in src/lib/countries.ts and is rendered by <LocationPicker />.

const GENDERS = ["Woman", "Man", "Non-binary", "Prefer not to say"];
const INTERESTED_IN = ["Women", "Men", "Everyone"];
const INTENTS = [
  { id: "serious", label: "A serious relationship" },
  { id: "open", label: "Open to where it goes" },
  { id: "friendship", label: "Friendship first" },
  { id: "exploring", label: "Just exploring" },
];

// Photo Studio is the only profile-photo flow. No avatar modes, no AI styles.
type AppearanceMode = "real";

const INTERESTS = [
  "Travel","Music","Books","Movies","Fitness","Yoga","Cooking","Foodie","Coffee","Wine",
  "Art","Photography","Design","Tech","Startups","Science","Nature","Hiking","Beach",
  "Dogs","Cats","Gaming","Dancing","Concerts","Theater","Volunteering","Languages","Meditation",
];

const LIFESTYLE_OPTS = [
  { id: "active",    label: "Active & outdoors" },
  { id: "balanced",  label: "Balanced" },
  { id: "creative",  label: "Creative & expressive" },
  { id: "homebody",  label: "Homebody & cozy" },
  { id: "social",    label: "Social & nightlife" },
];

const LANGUAGES = ["English","Spanish","French","German","Italian","Portuguese","Russian","Chinese","Japanese","Korean","Arabic","Hindi","Turkish","Hebrew","Dutch"];

const WORK_CATEGORIES = [
  "Tech","Design","Finance","Healthcare","Education","Arts","Hospitality","Engineering","Science","Law","Media","Trades","Student","Other",
];

// Step 5 — Compatibility foundation
type CompatQ = { key: string; prompt: string; options: readonly string[]; optional?: boolean };
const COMPAT_QUESTIONS: readonly CompatQ[] = [
  { key: "values",      prompt: "Which value matters most to you in a partner?",
    options: ["Honesty","Ambition","Kindness","Loyalty","Independence"] },
  { key: "communication", prompt: "Your ideal communication style:",
    options: ["Direct & clear","Warm & expressive","Calm & measured","Playful & light"] },
  { key: "goals",       prompt: "Where would you like a relationship to lead in the next few years?",
    options: ["Marriage","Long-term partnership","Building a life together, no labels","Taking it as it comes"] },
  { key: "family",      prompt: "Views on family & kids:",
    options: ["Want kids","Open to kids","Don't want kids","Already a parent"] },
  { key: "habits",      prompt: "Lifestyle habits — pick what fits:",
    options: ["No alcohol, no smoking","Social drinker","Occasional drinker","Smoker"] },
  { key: "faith",       prompt: "Faith / worldview (optional):",
    options: ["Spiritual","Religious","Agnostic","Atheist","Prefer not to say"], optional: true },
  { key: "longterm",    prompt: "What's important long-term?",
    options: ["Shared growth","Stability","Adventure together","Independence within partnership"] },
];
type CompatKey = string;


// Step 6 — extra spark prompts (in addition to the 6 discovery binaries)
const SPARK_PROMPTS = [
  { key: "spark_unforgettable", prompt: "What makes someone unforgettable to you?" },
  { key: "spark_sunday",        prompt: "Describe your perfect Sunday in one sentence." },
];

const STEPS = [
  { id: 1,  label: "Welcome",              minutes: 1 },
  { id: 2,  label: "Identity Basics",      minutes: 2 },
  { id: 3,  label: "Profile Photo Studio", minutes: 2 },
  { id: 4,  label: "Voice Prompts",        minutes: 2 },
  { id: 5,  label: "Profile Essentials",   minutes: 3 },
  { id: 6,  label: "Compatibility",        minutes: 3 },
  { id: 7,  label: "Personality & Spark",  minutes: 3 },
  { id: 8,  label: "Safety Basics",        minutes: 1 },
  { id: 9,  label: "Profile Preview",      minutes: 1 },
  { id: 10, label: "Complete",             minutes: 0 },
] as const;

const VOICE_ONBOARDING_PROMPTS = [
  "A small ritual that makes my day feel like mine.",
  "The last idea that kept me up — and why.",
  "Something I could talk about for hours.",
];

const TOTAL = STEPS.length;

type Answers = Record<string, unknown>;

function Onboarding() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [step, setStep] = useState(1);
  const [hydrated, setHydrated] = useState(false);
  const [resumed, setResumed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Step 1
  const [agree18, setAgree18] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeCommunity, setAgreeCommunity] = useState(false);

  // Step 2
  const [name, setName] = useState("");
  const [age, setAge] = useState(28);
  const [gender, setGender] = useState("");
  const [country, setCountry] = useState("");
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [stateRegion, setStateRegion] = useState("");
  const [city, setCity] = useState("");
  const [interestedIn, setInterestedIn] = useState("");
  const [intent, setIntent] = useState("");
  const [email, setEmail] = useState("");

  // Photo Studio is the only flow; appearance is fixed to "real".
  const appearance: AppearanceMode = "real";
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const selfieInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  // Avatar fields kept as constants for legacy schema fields; no UI to set them.
  const avatarStyle = "real" as const;
  const avatarUrl: string | null = null;

  // Step 4
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [lifestyle, setLifestyle] = useState("");
  const [languagesSpoken, setLanguagesSpoken] = useState<string[]>([]);
  const [workCategory, setWorkCategory] = useState("");
  const [profession, setProfession] = useState<Profession | null>(null);

  // Step 5
  const [compat, setCompat] = useState<Record<CompatKey, string>>({
    values: "", communication: "", goals: "", family: "", habits: "", faith: "", longterm: "",
  });

  // Step 6
  const [discovery, setDiscovery] = useState<Partial<DiscoveryProfile>>({});
  const [spark, setSpark] = useState<Record<string, string>>({});

  // Step 7
  // Paid verification removed — auto-skip step 7.
  const verifyChoice = "skip" as const;

  const allDiscoveryAnswered = DISCOVERY_QUESTIONS.every((q) => discovery[q.key]);
  const character = allDiscoveryAnswered
    ? discoveryToCharacter(discovery as DiscoveryProfile)
    : { warmth: 50, curiosity: 50, adventure: 50, loyalty: 50, humor: 50, ambition: 50 };

  // ---------- Hydration ----------
  useEffect(() => {
    if (authLoading) return;
    if (!user) { setHydrated(true); return; }
    let alive = true;
    (async () => {
      const [{ data: prof }, { data: onb }] = await Promise.all([
        supabase.from("profiles")
          .select("first_name, age, gender, country, country_code, state_region, city, intention, relationship_intent, interested_in, bio, interests, photo_url, profile_photo_url, avatar_url, avatar_style, onboarding_complete")
          .eq("id", user.id).maybeSingle(),
        supabase.from("onboarding_answers")
          .select("answers").eq("user_id", user.id).maybeSingle(),
      ]);
      if (!alive) return;

      const isEditing = typeof window !== "undefined" && /[?&]edit=1\b/.test(window.location.search);
      if (prof?.onboarding_complete && !isEditing) { navigate({ to: "/matches", replace: true }); return; }


      if (prof?.first_name) setName(prof.first_name);
      if (typeof prof?.age === "number") setAge(prof.age);
      if (prof?.gender) setGender(prof.gender);
      if (prof?.country) setCountry(prof.country);
      // Backfill country_code from the legacy free-text country if missing
      const initialCode = (prof as { country_code?: string | null } | null)?.country_code ?? codeForName(prof?.country);
      if (initialCode) setCountryCode(initialCode);
      if (prof?.state_region) setStateRegion(prof.state_region);
      if (prof?.city) setCity(prof.city);
      if (prof?.interested_in) setInterestedIn(prof.interested_in);
      const intentVal = prof?.relationship_intent || prof?.intention;
      if (intentVal) setIntent(intentVal);
      if (user.email) setEmail(user.email);
      if (prof?.bio) setBio(prof.bio);
      if (Array.isArray(prof?.interests)) setInterests(prof.interests as string[]);
      const sel = prof?.profile_photo_url || prof?.photo_url;
      if (sel) setPhotoUrl(sel);
      // avatar_url / avatar_style ignored — Photo Studio replaces AI avatars.

      const a = (onb?.answers as Answers | null) ?? null;
      if (a) {
        // appearance is always "real" now — ignored from saved answers.
        if (typeof a.agree18 === "boolean") setAgree18(a.agree18);
        if (typeof a.agreeTerms === "boolean") setAgreeTerms(a.agreeTerms);
        if (typeof a.agreePrivacy === "boolean") setAgreePrivacy(a.agreePrivacy);
        if (typeof a.agreeCommunity === "boolean") setAgreeCommunity(a.agreeCommunity);
        if (typeof a.lifestyle === "string") setLifestyle(a.lifestyle);
        if (Array.isArray(a.languages)) setLanguagesSpoken(a.languages as string[]);
        if (typeof a.workCategory === "string") setWorkCategory(a.workCategory);
        if (typeof a.profession === "string") setProfession(a.profession as Profession);
        if (a.compat && typeof a.compat === "object") {
          setCompat((c) => ({ ...c, ...(a.compat as Record<CompatKey, string>) }));
        }
        if (a.discovery && typeof a.discovery === "object") setDiscovery(a.discovery as Partial<DiscoveryProfile>);
        if (a.spark && typeof a.spark === "object") setSpark(a.spark as Record<string, string>);
        // verifyChoice is auto-skipped — paid verification has been retired.
      }

      // Resume at first incomplete step
      const next = computeResumeStep({
        agree18: a?.agree18 === true || false,
        agreeTerms: a?.agreeTerms === true || false,
        agreePrivacy: a?.agreePrivacy === true || false,
        agreeCommunity: a?.agreeCommunity === true || false,
        name: prof?.first_name ?? "",
        gender: prof?.gender ?? "",
        country: prof?.country ?? "",
        interestedIn: prof?.interested_in ?? "",
        intent: (prof?.relationship_intent || prof?.intention) ?? "",
        email: user.email ?? "",
        photoUrl: sel ?? null,
        bio: prof?.bio ?? "",
        interests: Array.isArray(prof?.interests) ? (prof!.interests as string[]) : [],
        compat: { ...({} as Record<CompatKey, string>), ...((a?.compat as Record<CompatKey, string>) ?? {}) },
        discovery: (a?.discovery as Partial<DiscoveryProfile>) ?? {},
      });
      setStep(next);
      setResumed(next > 1);
      setHydrated(true);
    })();
    return () => { alive = false; };
  }, [user, authLoading, navigate]);

  // ---------- Per-step save ----------
  async function persist(extra: Partial<Answers> = {}, profileUpdate: Record<string, unknown> = {}) {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSaving(false); return; }
      const answers: Answers = {
        agree18, agreeTerms, agreePrivacy, agreeCommunity,
        appearance, avatarStyle,
        lifestyle, languages: languagesSpoken, workCategory, profession,
        compat, discovery, spark,
        verifyChoice,
        ...extra,
      };
      await supabase.from("onboarding_answers").upsert(
        { user_id: user.id, answers: answers as never },
        { onConflict: "user_id" },
      );
      if (Object.keys(profileUpdate).length > 0) {
        await supabase.from("profiles").update(profileUpdate as never).eq("id", user.id);
      }

      setSavedAt(Date.now());
    } catch (e) {
      console.warn("[onboarding] save failed", e);
    } finally {
      setSaving(false);
    }
  }

  async function goNext() {
    // Save based on the step we're leaving
    if (step === 2) {
      await persist({}, {
        first_name: name, age, gender, country,
        country_code: countryCode,
        continent_code: countryCode ? (COUNTRY_BY_CODE[countryCode]?.continent ?? null) : null,
        state_region: stateRegion || null, city: city || null,
        interested_in: interestedIn,
        intention: intent, relationship_intent: intent,
      });
    } else if (step === 4) {
      await persist({}, {
        bio: bio || null,
        interests: interests as unknown as string[],
      });
    } else if (step === 3) {
      const discovery_mode = appearance === "real" ? "photo" : "avatar";
      await persist({}, { discovery_mode });
    } else if (step === 5 || step === 6 || step === 7 || step === 1) {
      await persist();
    }
    setStep((s) => Math.min(TOTAL, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function finishOnboarding(redirect: "discover" | "profile" | "hidden") {
    if (saving) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const lang = (typeof navigator !== "undefined" ? navigator.language?.slice(0, 2) : "en") || "en";
        const summary = allDiscoveryAnswered ? discoverySummary(discovery as DiscoveryProfile) : "";
        await supabase.from("profiles").update({
          first_name: name, age, gender, country,
          country_code: countryCode,
          continent_code: countryCode ? (COUNTRY_BY_CODE[countryCode]?.continent ?? null) : null,
          state_region: stateRegion || null, city: city || null,
          interested_in: interestedIn,
          intention: intent, relationship_intent: intent,
          preferred_language: lang,
          avatar_style: avatarStyle,
          discovery_mode: (appearance === "real" ? "photo" : "avatar"),
          curiosity_level: character.curiosity,
          emotional_rhythm: character as unknown as Record<string, number>,
          bio: bio || summary || null,
          interests: interests as unknown as string[],
          onboarding_complete: true,
        }).eq("id", user.id);
        await persist();
        const { track } = await import("@/lib/analytics");
        await track("profile_completed", { intent, country, appearance });
      }
    } catch (e) { console.warn("[unveil] finish save skipped", e); }
    setSaving(false);
    if (redirect === "discover") navigate({ to: "/matches" });
    else if (redirect === "hidden") navigate({ to: "/matches" });
    else navigate({ to: "/quiz" });
  }

  // ---------- Photo upload ----------
  async function handlePhotoFile(file: File) {
    if (!file) return;
    if (!/^image\//.test(file.type)) { toast.error("Please pick an image file."); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error("Image must be under 8MB."); return; }
    setPhotoUploading(true);
    try {
      const localUrl = URL.createObjectURL(file);
      setPhotoUrl(localUrl);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage
          .from("profile-photos")
          .upload(path, file, { cacheControl: "3600", upsert: true, contentType: file.type });
        if (error) throw error;
        const { data: pub } = supabase.storage.from("profile-photos").getPublicUrl(path);
        setPhotoUrl(pub.publicUrl);
        // Real → public photo; otherwise selfie stays private until an avatar is generated.
        const update: Record<string, unknown> = appearance === "real"
          ? { photo_url: pub.publicUrl, profile_photo_url: pub.publicUrl }
          : { profile_photo_url: pub.publicUrl };
        await supabase.from("profiles").update(update as never).eq("id", user.id);
        toast.success("Selfie saved.");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setPhotoUploading(false);
    }
  }

  // AI avatar generation removed — Photo Studio is the only profile photo flow.

  // ---------- Validation per step ----------
  const canNext = useMemo(() => {
    switch (step) {
      case 1: return agree18 && agreeTerms && agreePrivacy && agreeCommunity;
      case 2: return name.length > 1 && !!gender && !!country && !!interestedIn && !!intent && /\S+@\S+\.\S+/.test(email);
      case 3: return !!photoUrl;
      case 4: return bio.trim().length >= 20 && interests.length >= 3;
      case 5: return COMPAT_QUESTIONS.every((q) => q.optional || !!compat[q.key as CompatKey]);
      case 6: return allDiscoveryAnswered;
      case 7: return true;
      case 8: return true;
      default: return true;
    }
  }, [step, agree18, agreeTerms, agreePrivacy, agreeCommunity, name, gender, country, interestedIn, intent, email, photoUrl, bio, interests, compat, allDiscoveryAnswered]);

  // ---------- Render ----------
  if (authLoading || (user && !hydrated)) {
    return (
      <div className="min-h-screen">
        <UnveilNav />
        <div className="mx-auto max-w-md p-12 text-center text-muted-foreground">Loading your profile…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen">
        <UnveilNav />
        <div className="mx-auto max-w-md p-12 text-center">
          <h1 className="font-display text-3xl font-bold">Sign in to continue</h1>
          <p className="mt-2 text-muted-foreground">Your onboarding progress is saved to your account.</p>
          <a href="/login" className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-hero px-6 py-3 text-primary-foreground shadow-glow">
            Sign in <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    );
  }

  const stepMeta = STEPS[step - 1];
  const pct = Math.round((step / TOTAL) * 100);
  const minsLeft = STEPS.slice(step - 1).reduce((sum, s) => sum + s.minutes, 0);

  return (
    <div className="unveil-onboarding min-h-screen">
      <UnveilNav />
      <div className="relative z-[1] mx-auto max-w-2xl px-6 py-12">


        {/* Welcome-back banner */}
        {resumed && step > 1 && (
          <div className="mb-6 rounded-2xl border border-primary/40 bg-primary/10 p-4 text-sm">
            <div className="font-display text-base font-medium">Welcome back.</div>
            <div className="text-muted-foreground">Let's continue where you left off — Step {step}: {stepMeta.label}.</div>
          </div>
        )}

        {/* Progress header */}
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <div className="font-mono text-[11px] uppercase tracking-luxury text-muted-foreground">
            Step {step} of {TOTAL} · {stepMeta.label}
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px] text-primary">
            <span>{pct}% Complete</span>
            {minsLeft > 0 && <span className="text-muted-foreground">~{minsLeft} min left</span>}
          </div>
        </div>
        <div className="mb-2 h-2 overflow-hidden rounded-full bg-border">
          <div className="h-full bg-gradient-hero transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="mb-8 flex items-center justify-end gap-2 text-[10px] text-muted-foreground">
          {saving ? (
            <><Loader2 className="h-3 w-3 animate-spin" /> Saving…</>
          ) : savedAt ? (
            <><Save className="h-3 w-3" /> Saved</>
          ) : null}
        </div>

        {/* ---------- STEP 1: Welcome ---------- */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h1 className="font-display text-4xl font-bold">Welcome to <span className="uo-accent">UNVEIL</span>.</h1>
              <p className="mt-2 text-muted-foreground">A few guided steps to set up a profile you'll actually be proud of. Your progress is saved as you go.</p>
            </div>
            <div className="space-y-3 rounded-3xl border border-border bg-card p-6">
              <Agree v={agree18} onChange={setAgree18} label="I confirm I am 18 years or older." />
              <Agree v={agreeTerms} onChange={setAgreeTerms} label={<>I accept the <a href="/terms" target="_blank" className="text-primary underline">Terms of Service</a>.</>} />
              <Agree v={agreePrivacy} onChange={setAgreePrivacy} label={<>I've read the <a href="/privacy" target="_blank" className="text-primary underline">Privacy Policy</a>.</>} />
              <Agree v={agreeCommunity} onChange={setAgreeCommunity} label={<>I'll follow the <a href="/community-guidelines" target="_blank" className="text-primary underline">Community Guidelines</a>.</>} />
            </div>
          </div>
        )}

        {/* ---------- STEP 2: Identity ---------- */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h1 className="font-display text-4xl font-bold">Tell us <span className="uo-accent">who you are</span>.</h1>
              <p className="mt-2 text-muted-foreground">The basics for your profile. Phone number is never required.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="First name *"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your first name" className={inputCls} /></Field>
              <Field label="Age *"><input type="number" min={18} value={age} onChange={(e) => setAge(+e.target.value)} className={inputCls} /></Field>
              <Field label="Gender *">
                <select value={gender} onChange={(e) => setGender(e.target.value)} className={inputCls}>
                  <option value="">Select…</option>
                  {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </Field>
              <Field label="Dating preference *">
                <select value={interestedIn} onChange={(e) => setInterestedIn(e.target.value)} className={inputCls}>
                  <option value="">Select…</option>
                  {INTERESTED_IN.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </Field>
              <div className="md:col-span-2">
                <LocationPicker
                  required
                  value={{ country_code: countryCode, country: country || null, state_region: stateRegion || null, city: city || null }}
                  onChange={(v) => {
                    setCountryCode(v.country_code);
                    setCountry(v.country ?? "");
                    setStateRegion(v.state_region ?? "");
                    setCity(v.city ?? "");
                  }}
                />
              </div>
              <div className="md:col-span-2">
                <Field label="Email *"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@email.com" className={inputCls} /></Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Relationship intention *">
                  <div className="grid gap-2 md:grid-cols-2">
                    {INTENTS.map((it) => {
                      const active = intent === it.id;
                      return (
                        <button key={it.id} type="button" onClick={() => setIntent(it.id)}
                          className={`rounded-2xl border p-3 text-left text-sm transition-all ${active ? "border-primary bg-primary/10 shadow-glow" : "border-border bg-surface hover:border-foreground/30"}`}>
                          {it.label}
                        </button>
                      );
                    })}
                  </div>
                </Field>
              </div>
            </div>
          </div>
        )}

        {/* ---------- STEP 3: Profile Photo Studio ---------- */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h1 className="font-display text-4xl font-bold">Profile <span className="uo-accent">Photo Studio</span></h1>
              <p className="mt-2 text-muted-foreground">
                Take a selfie or upload a photo. Real profile photo shows from Day 1 — no AI avatars.
              </p>
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => { e.preventDefault(); setDragActive(false); const f = e.dataTransfer.files?.[0]; if (f) handlePhotoFile(f); }}
              className={`flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed p-8 transition-colors ${dragActive ? "border-primary bg-primary/5" : "border-border bg-card"}`}
            >
              <input ref={selfieInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoFile(f); }} />
              <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoFile(f); }} />

              <div className="relative h-32 w-32 overflow-hidden rounded-full bg-gradient-face shadow-glow ring-2 ring-primary/30">
                {photoUrl ? (
                  <SignedImage src={photoUrl} alt="Selfie" className="h-full w-full object-cover" fallback={<div className="flex h-full w-full items-center justify-center"><Camera className="h-12 w-12 text-primary-foreground/90" /></div>} />
                ) : (
                  <div className="flex h-full w-full items-center justify-center"><Camera className="h-12 w-12 text-primary-foreground/90" /></div>
                )}
                {photoUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
                    <Loader2 className="h-7 w-7 animate-spin text-primary" />
                  </div>
                )}
              </div>

              {photoUrl && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-mono uppercase tracking-luxury text-primary">
                  <ShieldCheck className="h-3 w-3" /> Selfie Checked
                </span>
              )}

              <div className="flex flex-wrap justify-center gap-2">
                <button type="button" onClick={() => selfieInputRef.current?.click()} disabled={photoUploading}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow disabled:opacity-50">
                  <Camera className="h-4 w-4" /> {photoUrl ? "Retake" : "Take selfie"}
                </button>
                <button type="button" onClick={() => galleryInputRef.current?.click()} disabled={photoUploading}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium hover:border-foreground/30 disabled:opacity-50">
                  <Upload className="h-4 w-4" /> Upload photo
                </button>
                {photoUrl && (
                  <Link to="/avatar"
                    className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/15">
                    <Wand2 className="h-4 w-4" /> Open Photo Studio
                  </Link>
                )}
              </div>

              <p className="text-center text-[11px] text-muted-foreground">
                Edit brightness, warmth, glow, and skin-smoothing in the Photo Studio. Filters: Natural · Glow · Confident · Elegant · Radiant.
              </p>
            </div>
          </div>
        )}


        {/* ---------- STEP 4: Profile essentials ---------- */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h1 className="font-display text-4xl font-bold">Make your profile <span className="uo-accent">yours</span>.</h1>
              <p className="mt-2 text-muted-foreground">Bio and interests are required. The rest is optional but helps your matches.</p>
            </div>
            <Field label={`Short bio * (${bio.length}/240)`}>
              <textarea value={bio} maxLength={240} onChange={(e) => setBio(e.target.value)}
                placeholder="A few honest sentences about you — what you're up to, what you're into."
                className={`${inputCls} min-h-[120px] resize-y`} />
              {bio.length > 0 && bio.length < 20 && <div className="mt-1 text-[11px] text-muted-foreground">At least 20 characters.</div>}
            </Field>

            <Field label={`Interests * (${interests.length}/3 minimum)`}>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map((tag) => {
                  const active = interests.includes(tag);
                  return (
                    <button key={tag} type="button"
                      onClick={() => setInterests((cur) => active ? cur.filter((x) => x !== tag) : [...cur, tag])}
                      className={`rounded-full border px-3 py-1.5 text-xs transition-all ${active ? "border-primary bg-primary/15 text-primary" : "border-border bg-surface text-muted-foreground hover:border-foreground/30"}`}>
                      {tag}
                    </button>
                  );
                })}
              </div>
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Lifestyle (optional)">
                <select value={lifestyle} onChange={(e) => setLifestyle(e.target.value)} className={inputCls}>
                  <option value="">Select…</option>
                  {LIFESTYLE_OPTS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </Field>
              <Field label="Languages (optional)">
                <select value="" onChange={(e) => { const v = e.target.value; if (v && !languagesSpoken.includes(v)) setLanguagesSpoken([...languagesSpoken, v]); }} className={inputCls}>
                  <option value="">Add a language…</option>
                  {LANGUAGES.filter((l) => !languagesSpoken.includes(l)).map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
                {languagesSpoken.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {languagesSpoken.map((l) => (
                      <span key={l} className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-[11px]">
                        <Languages className="h-3 w-3" /> {l}
                        <button onClick={() => setLanguagesSpoken(languagesSpoken.filter((x) => x !== l))} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </Field>
              <Field label="Work / study category (optional)">
                <select value={workCategory} onChange={(e) => setWorkCategory(e.target.value)} className={inputCls}>
                  <option value="">Select…</option>
                  {WORK_CATEGORIES.map((w) => <option key={w} value={w}>{w}</option>)}
                </select>
              </Field>
              <Field label="Profession axis (optional)">
                <select value={profession ?? ""} onChange={(e) => setProfession((e.target.value || null) as Profession | null)} className={inputCls}>
                  <option value="">Select…</option>
                  {PROFESSIONS.map((p) => <option key={p.id} value={p.id}>{p.icon} {p.label}</option>)}
                </select>
              </Field>
            </div>
          </div>
        )}

        {/* ---------- STEP 5: Compatibility ---------- */}
        {step === 5 && (
          <div className="space-y-6">
            <div>
              <h1 className="font-display text-4xl font-bold">What matters in a <span className="uo-accent">match</span>?</h1>
              <p className="mt-2 text-muted-foreground">These shape compatibility scoring. There are no right answers.</p>
            </div>
            <div className="space-y-4">
              {COMPAT_QUESTIONS.map((q, i) => (
                <div key={q.key} className="rounded-3xl border border-border bg-card p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                    <span className="font-display text-base font-medium">{q.prompt}</span>
                    {q.optional && <span className="ml-auto rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-muted-foreground">Optional</span>}
                  </div>
                  <div className="mb-2 text-[11px] text-muted-foreground">Pick up to 2.</div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {q.options.map((opt) => {
                      const current = (compat[q.key as CompatKey] || "").split(" · ").filter(Boolean);
                      const active = current.includes(opt);
                      return (
                        <button key={opt} type="button"
                          onClick={() => {
                            let next: string[];
                            if (active) next = current.filter((c) => c !== opt);
                            else if (current.length >= 2) next = [current[1], opt];
                            else next = [...current, opt];
                            setCompat({ ...compat, [q.key]: next.join(" · ") });
                          }}
                          className={`rounded-2xl border p-3 text-left text-sm transition-all ${active ? "border-primary bg-primary/10 shadow-glow" : "border-border bg-surface hover:border-foreground/30"}`}>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---------- STEP 6: Personality & Spark ---------- */}
        {step === 6 && (
          <div className="space-y-6">
            <div>
              <h1 className="font-display text-4xl font-bold">Personality & <span className="uo-accent">Spark</span>.</h1>
              <p className="mt-2 text-muted-foreground">Six quick this-or-thats, plus a couple of free-form prompts.</p>
            </div>
            <div className="space-y-4">
              {DISCOVERY_QUESTIONS.map((q, i) => {
                const picked = discovery[q.key];
                return (
                  <div key={q.key} className="rounded-3xl border border-border bg-card p-5">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                      <span className="font-display text-base font-medium">{q.prompt}</span>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      {(["a", "b"] as const).map((opt) => {
                        const active = picked === opt;
                        return (
                          <button key={opt} onClick={() => setDiscovery({ ...discovery, [q.key]: opt })}
                            className={`rounded-2xl border p-4 text-left text-sm transition-all ${active ? "border-primary bg-primary/10 shadow-glow" : "border-border bg-surface hover:border-foreground/30"}`}>
                            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{opt === "a" ? q.aLabel : q.bLabel}</div>
                            <div className="mt-1">{opt === "a" ? q.a : q.b}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {SPARK_PROMPTS.map((p) => (
                <Field key={p.key} label={p.prompt + " (optional)"}>
                  <input value={spark[p.key] ?? ""} onChange={(e) => setSpark({ ...spark, [p.key]: e.target.value })} placeholder="Say something honest." className={inputCls} />
                </Field>
              ))}
            </div>
          </div>
        )}

        {/* ---------- STEP 7: Safety & Verification ---------- */}
        {step === 7 && (
          <div className="space-y-6">
            <div>
              <h1 className="font-display text-4xl font-bold">Safety <span className="uo-accent">basics</span>.</h1>
              <p className="mt-2 text-muted-foreground">
                Your selfie acts as your trust check. There's no paid verification — every profile starts with the same 15 daily messages.
              </p>
            </div>
            <div className="rounded-3xl border border-primary/30 bg-primary/5 p-5 text-sm">
              <div className="mb-2 flex items-center gap-2 font-display text-base">
                <ShieldCheck className="h-4 w-4 text-primary" /> Selfie Checked
              </div>
              <p className="text-muted-foreground">
                Profiles with a real selfie display a Selfie Checked badge so other members know it's really you.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 text-sm">
              <div className="mb-1 font-display text-base">Safety basics</div>
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                <li>You can report or block anyone, anytime — they won't be notified.</li>
                <li>Sensitive details (phone, address) are never required to use UNVEIL.</li>
                <li>Contact info is shared only with mutual consent after a match.</li>
              </ul>
            </div>
          </div>
        )}


        {/* ---------- STEP 8: Profile preview ---------- */}
        {step === 8 && (
          <div className="space-y-6">
            <div>
              <h1 className="font-display text-4xl font-bold">How your <span className="uo-accent">profile</span> looks.</h1>
              <p className="mt-2 text-muted-foreground">This is exactly what others will see in Discover and Matches.</p>
            </div>
            <ProfilePreview
              name={name} age={age} city={city} country={country}
              bio={bio} interests={interests}
              photoUrl={photoUrl}
              intent={intent} verified={!!photoUrl}
            />

            <div className="text-center text-xs text-muted-foreground">
              Want to change something? Use Back to edit any previous step.
            </div>
          </div>
        )}

        {/* ---------- STEP 9: Completion ---------- */}
        {step === 9 && (
          <div className="space-y-6 text-center">
            <div className="uo-complete-stage">
              <div className="uo-logo-spin" aria-hidden />
              <div className="uo-ring r1" aria-hidden />
              <div className="uo-ring r2" aria-hidden />
              <div className="uo-ring r3" aria-hidden />
              <div className="uo-ring r4" aria-hidden />
              <div className="uo-heart">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <defs>
                    <linearGradient id="uo-heart-grad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%"  stopColor="#7B3FC4" />
                      <stop offset="38%" stopColor="#D955A0" />
                      <stop offset="70%" stopColor="#F0A020" />
                      <stop offset="100%" stopColor="#1B6FE8" />
                    </linearGradient>
                  </defs>
                  <path d="M12 21s-7-4.35-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6C19 16.65 12 21 12 21Z"
                    stroke="url(#uo-heart-grad)" strokeWidth="1.8" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
            <div>
              <div className="font-mono text-[11px] uppercase tracking-luxury text-primary">100% Complete · Profile Setup Complete</div>
              <h1 className="mt-2 font-display text-4xl font-bold">{name ? `Welcome, ${name}.` : "Your UNVEIL profile is "}<span className="uo-accent">{name ? "" : "ready"}</span></h1>
              <p className="mt-2 text-muted-foreground">Features now unlocked:</p>
            </div>

            <ul className="mx-auto max-w-sm space-y-2 text-left text-sm">
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Discover compatible matches</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Hidden / opposite-match insights</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Personality & readiness insights</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Messaging with mutual matches</li>
            </ul>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <button onClick={() => finishOnboarding("discover")} disabled={saving}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-6 py-3 font-medium text-primary-foreground shadow-glow transition-transform hover:scale-105 disabled:opacity-40">
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <>Discover Matches <ArrowRight className="h-4 w-4" /></>}
              </button>
              <button onClick={() => finishOnboarding("hidden")} disabled={saving}
                className="rounded-full border border-border bg-surface px-6 py-3 font-medium hover:border-foreground/30 disabled:opacity-40">
                Unexpected Matches Preview
              </button>
              <button onClick={() => finishOnboarding("profile")} disabled={saving}
                className="rounded-full border border-border bg-surface px-6 py-3 font-medium hover:border-foreground/30 disabled:opacity-40">
                Go to Profile
              </button>
            </div>
          </div>
        )}

        {/* ---------- Navigation ---------- */}
        {step !== 9 && (
          <div className="mt-10 flex items-center justify-between gap-3">
            <button onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-4 py-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            <button onClick={goNext} disabled={!canNext || saving}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-6 py-3 font-medium text-primary-foreground shadow-glow transition-transform enabled:hover:scale-105 disabled:opacity-40">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : step === 8 ? <>Confirm & Continue <Check className="h-4 w-4" /></> : <>Continue <ArrowRight className="h-4 w-4" /></>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Helpers ----------

function computeResumeStep(s: {
  agree18: boolean; agreeTerms: boolean; agreePrivacy: boolean; agreeCommunity: boolean;
  name: string; gender: string; country: string; interestedIn: string; intent: string; email: string;
  photoUrl: string | null;
  bio: string; interests: string[];
  compat: Record<CompatKey, string>;
  discovery: Partial<DiscoveryProfile>;
}): number {
  if (!(s.agree18 && s.agreeTerms && s.agreePrivacy && s.agreeCommunity)) return 1;
  if (!(s.name.length > 1 && s.gender && s.country && s.interestedIn && s.intent && /\S+@\S+\.\S+/.test(s.email))) return 2;
  if (!s.photoUrl) return 3;
  if (!(s.bio.trim().length >= 20 && s.interests.length >= 3)) return 4;
  if (!COMPAT_QUESTIONS.every((q) => q.optional || !!s.compat[q.key as CompatKey])) return 5;
  if (!DISCOVERY_QUESTIONS.every((q) => s.discovery[q.key])) return 6;
  return 8;
}

const inputCls =
  "w-full rounded-xl border border-border bg-surface px-4 py-3 text-base outline-none transition-colors focus:border-primary";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 font-mono text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}

function Agree({ v, onChange, label }: { v: boolean; onChange: (b: boolean) => void; label: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm">
      <input type="checkbox" checked={v} onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-border accent-primary" />
      <span className="text-foreground/90">{label}</span>
    </label>
  );
}

function ProfilePreview(props: {
  name: string; age: number; city: string; country: string;
  bio: string; interests: string[];
  photoUrl: string | null;
  intent: string; verified: boolean;
}) {
  const display = props.photoUrl;
  const intentLabel = INTENTS.find((i) => i.id === props.intent)?.label ?? props.intent;
  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-glow">
      <div className="relative aspect-square w-full bg-gradient-face">
        {display ? (
          <SignedImage src={display} alt="" className="h-full w-full object-cover" fallback={<div className="flex h-full w-full items-center justify-center text-primary-foreground/80"><Lock className="h-16 w-16" /></div>} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-primary-foreground/80">
            <Lock className="h-16 w-16" />
          </div>
        )}
        {props.verified && (
          <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/85 px-2 py-1 text-[10px] font-medium text-primary backdrop-blur">
            <ShieldCheck className="h-3 w-3" /> Selfie Checked
          </div>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-baseline justify-between">
          <div className="font-display text-2xl font-bold">{props.name || "Your name"}{props.age ? `, ${props.age}` : ""}</div>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {(props.city || props.country) && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {[props.city, props.country].filter(Boolean).join(", ")}</span>}
          {intentLabel && <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3" /> {intentLabel}</span>}
        </div>
        {props.bio && <p className="mt-3 text-sm text-foreground/90">{props.bio}</p>}
        {props.interests.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {props.interests.map((t) => (
              <span key={t} className="rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] text-muted-foreground">{t}</span>
            ))}
          </div>
        )}
        <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
          <Briefcase className="h-3 w-3" /> Compatibility score will appear once you start matching.
        </div>
      </div>
    </div>
  );
}
