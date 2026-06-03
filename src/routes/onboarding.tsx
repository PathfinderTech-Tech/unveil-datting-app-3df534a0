import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { UnveilNav } from "@/components/UnveilNav";
import {
  PROFESSIONS, DISCOVERY_QUESTIONS, discoveryToCharacter, discoverySummary,
  type DiscoveryProfile, type Profession,
} from "@/lib/synapse-store";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { generateAvatar } from "@/lib/avatar.functions";
import { Camera, ArrowRight, ArrowLeft, Check, Sparkles, Upload, Loader2, X, Wand2, RefreshCw } from "lucide-react";
import { toast } from "sonner";



export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Join UNVEIL" }, { name: "description", content: "A few playful questions to shape your Discovery Profile." }] }),
  component: Onboarding,
});

const COUNTRIES = [
  "United States","United Kingdom","Canada","Australia","Ireland","New Zealand",
  "Germany","France","Spain","Italy","Portugal","Netherlands","Belgium","Switzerland","Austria","Sweden","Norway","Denmark","Finland","Poland",
  "Brazil","Mexico","Argentina","Chile","Colombia",
  "Japan","South Korea","Singapore","Hong Kong","India","Indonesia","Philippines","Thailand","Vietnam",
  "UAE","Saudi Arabia","Israel","Turkey",
  "South Africa","Nigeria","Kenya","Egypt","Morocco",
  "Other",
];

const GENDERS = ["Woman", "Man", "Non-binary", "Prefer not to say"];
const INTENTS = [
  { id: "serious", label: "A serious relationship" },
  { id: "open", label: "Open to where it goes" },
  { id: "friendship", label: "Friendship first" },
  { id: "exploring", label: "Just exploring" },
];

const AVATAR_STYLES = [
  { id: "real",       label: "Real Photo",            hint: "Show the actual you." },
  { id: "anime",      label: "Anime Avatar",          hint: "Stylized, playful." },
  { id: "stylized",   label: "Stylized Avatar",       hint: "Painted, modern." },
  { id: "realistic",  label: "Realistic AI Portrait", hint: "Cinematic, lifelike." },
  { id: "mystery",    label: "Mystery Avatar",        hint: "Silhouette, intriguing." },
] as const;
type AvatarStyleId = (typeof AVATAR_STYLES)[number]["id"];

// Step metadata for the "Step X of Y · Label · Required/Optional" header.
const STEPS = [
  { label: "Account",           required: true,  next: "Selfie" },
  { label: "Connection style",  required: true,  next: "Selfie & avatar" },
  { label: "Selfie & avatar",   required: false, next: "Profession" },
  { label: "Profession",        required: true,  next: "Discovery quiz" },
  { label: "Discovery quiz",    required: true,  next: "Your matches" },
] as const;


const CONNECTION_STYLES = [
  { id: "quick",     label: "Quick Connect",  hint: "I prefer chatting naturally.",            tone: "Skip games. Jump into messages." },
  { id: "discovery", label: "Discovery Mode", hint: "I enjoy questions and interactive experiences.", tone: "Spark, puzzles, challenges — the works." },
  { id: "slow",      label: "Slow Burn",      hint: "I like building trust before meeting.",    tone: "Take your time. Voice, words, then a date." },
];

function Onboarding() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState(28);
  const [gender, setGender] = useState("");
  const [country, setCountry] = useState("");
  const [stateRegion, setStateRegion] = useState("");
  const [city, setCity] = useState("");
  const [intent, setIntent] = useState("");
  const [email, setEmail] = useState("");
  const [connectionStyle, setConnectionStyle] = useState<string>("");
  const [profession, setProfession] = useState<Profession | null>(null);
  const [faceUploaded, setFaceUploaded] = useState(false);
  const [faceHarmony, setFaceHarmony] = useState(0);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const selfieInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyleId>("real");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [generatingAvatar, setGeneratingAvatar] = useState(false);
  const runGenerateAvatar = useServerFn(generateAvatar);
  const [discovery, setDiscovery] = useState<Partial<DiscoveryProfile>>({});
  const allAnswered = DISCOVERY_QUESTIONS.every((q) => discovery[q.key]);
  const character = allAnswered
    ? discoveryToCharacter(discovery as DiscoveryProfile)
    : { warmth: 50, curiosity: 50, adventure: 50, loyalty: 50, humor: 50, ambition: 50 };

  // Hydrate from DB. If onboarding is already complete, never reset the user
  // to Step 1 — bounce them to /matches. Otherwise prefill saved values and
  // resume on the first incomplete step.
  useEffect(() => {
    if (authLoading) return;
    if (!user) { setHydrated(true); return; }
    let alive = true;
    (async () => {
      const [{ data: prof }, { data: onb }] = await Promise.all([
        supabase.from("profiles")
          .select("first_name, age, gender, country, state_region, city, intention, relationship_intent, photo_url, profile_photo_url, avatar_url, avatar_style, onboarding_complete")
          .eq("id", user.id).maybeSingle(),
        supabase.from("onboarding_answers")
          .select("answers").eq("user_id", user.id).maybeSingle(),
      ]);
      if (!alive) return;

      if (prof?.onboarding_complete) {
        navigate({ to: "/matches", replace: true });
        return;
      }

      if (prof?.first_name) setName(prof.first_name);
      if (typeof prof?.age === "number") setAge(prof.age);
      if (prof?.gender) setGender(prof.gender);
      if (prof?.country) setCountry(prof.country);
      if (prof?.state_region) setStateRegion(prof.state_region);
      if (prof?.city) setCity(prof.city);
      const intentVal = prof?.relationship_intent || prof?.intention;
      if (intentVal) setIntent(intentVal);
      if (user.email) setEmail(user.email);
      const sel = prof?.profile_photo_url || prof?.photo_url;
      if (sel) { setPhotoUrl(sel); setFaceUploaded(true); setFaceHarmony(85); }
      if (prof?.avatar_url) setAvatarUrl(prof.avatar_url);
      if (prof?.avatar_style) setAvatarStyle(prof.avatar_style as AvatarStyleId);

      const answers = (onb?.answers as Record<string, unknown> | null) ?? null;
      let _connStyle = "";
      let _prof: Profession | null = null;
      let _disc: Partial<DiscoveryProfile> = {};
      if (answers) {
        if (typeof answers.connectionStyle === "string") { _connStyle = answers.connectionStyle; setConnectionStyle(_connStyle); }
        if (typeof answers.profession === "string") { _prof = answers.profession as Profession; setProfession(_prof); }
        if (answers.discovery && typeof answers.discovery === "object") {
          _disc = answers.discovery as Partial<DiscoveryProfile>;
          setDiscovery(_disc);
        }
      }

      // Resume at first incomplete step (Google + email login behave the same).
      const _name = prof?.first_name ?? "";
      const _gender = prof?.gender ?? "";
      const _country = prof?.country ?? "";
      const _intent = (prof?.relationship_intent || prof?.intention) ?? "";
      const _email = user.email ?? "";
      const step0Done = _name.length > 1 && !!_gender && !!_country && !!_intent && /\S+@\S+\.\S+/.test(_email);
      const step1Done = !!_connStyle;
      const step3Done = _prof !== null;
      const step4Done = DISCOVERY_QUESTIONS.every((q) => _disc[q.key]);
      const resumeStep = !step0Done ? 0 : !step1Done ? 1 : !step3Done ? 3 : !step4Done ? 4 : 2;
      setStep(resumeStep);
      setHydrated(true);
    })();
    return () => { alive = false; };
  }, [user, authLoading, navigate]);


  const computeHarmony = () => {
    const target = 72 + Math.floor(Math.random() * 22);
    let v = 0;
    setFaceHarmony(0);
    const tick = setInterval(() => {
      v += 4;
      setFaceHarmony(Math.min(v, target));
      if (v >= target) clearInterval(tick);
    }, 25);
  };

  async function handlePhotoFile(file: File) {
    if (!file) return;
    if (!/^image\//.test(file.type)) { toast.error("Please pick an image file."); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error("Image must be under 8MB."); return; }
    setPhotoUploading(true);
    try {
      // Always show instant local preview
      const localUrl = URL.createObjectURL(file);
      setPhotoUrl(localUrl);
      setFaceUploaded(true);
      computeHarmony();

      // If signed in, upload to storage and persist on profile
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
        await supabase.from("profiles").update({ photo_url: pub.publicUrl }).eq("id", user.id);
        toast.success("Selfie saved.");
      } else {
        toast.success("Selfie ready. We'll save it after sign in.");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setPhotoUploading(false);
    }
  }

  function clearPhoto() {
    setPhotoUrl(null);
    setFaceUploaded(false);
    setFaceHarmony(0);
    setAvatarUrl(null);
  }

  async function handleGenerateAvatar() {
    if (!photoUrl) { toast.error("Add a selfie first."); return; }
    setGeneratingAvatar(true);
    try {
      const res = await runGenerateAvatar({ data: { style: avatarStyle, selfieUrl: photoUrl } });
      setAvatarUrl(res.avatarUrl);
      if (res.fallback && res.message) toast.message(res.message);
      else toast.success("Your avatar is ready.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate avatar");
    } finally {
      setGeneratingAvatar(false);
    }
  }




  const finish = async (skipGames = false) => {
    const profObj = PROFESSIONS.find((p) => p.id === profession)!;
    const summary = allAnswered ? discoverySummary(discovery as DiscoveryProfile) : "";
    const draft = { name, age, gender, country, stateRegion, city, intent, email, connectionStyle, profession: profession!, professionLabel: profObj.label, faceHarmony, avatarStyle, character, discovery, summary };
    sessionStorage.setItem("unveil-draft", JSON.stringify(draft));
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const lang = (typeof navigator !== "undefined" ? navigator.language?.slice(0, 2) : "en") || "en";
        await supabase.from("profiles").update({
          first_name: name, age, city, gender, intention: intent,
          country, state_region: stateRegion || null,
          preferred_language: lang,
          relationship_intent: intent,
          avatar_style: avatarStyle,
          curiosity_level: character.curiosity,
          emotional_rhythm: character as unknown as Record<string, number>,
          bio: summary || null,
          onboarding_complete: true,
        }).eq("id", user.id);
        await supabase.from("onboarding_answers").upsert({
          user_id: user.id,
          answers: { profession, professionLabel: profObj.label, faceHarmony, avatarStyle, country, stateRegion, connectionStyle, character, discovery, summary, email },
        }, { onConflict: "user_id" });
        const { track } = await import("@/lib/analytics");
        await track("profile_completed", { intent, country });
      }
    } catch (e) { console.warn("[unveil] onboarding save skipped", e); }
    if (skipGames || connectionStyle === "quick") navigate({ to: "/matches" });
    else navigate({ to: "/spark" });
  };


  const isUS = country === "United States";
  const stateRequired = !!country && !isUS && country !== "Other";

  const canNext = [
    // Step 0: identity — name, age, gender, country (required), intent, email
    name.length > 1 && !!gender && !!country && !!intent && /\S+@\S+\.\S+/.test(email),
    // Step 1: connection style
    !!connectionStyle,
    // Step 2: selfie + avatar (optional — Continue always allowed)
    true,

    // Step 3: profession
    profession !== null,
    // Step 4: discovery
    allAnswered,
  ][step];

  if (authLoading || (user && !hydrated)) {
    return (
      <div className="min-h-screen">
        <UnveilNav />
        <div className="mx-auto max-w-md p-12 text-center text-muted-foreground">Loading your profile…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <UnveilNav />
      <div className="mx-auto max-w-2xl px-6 py-16">
        {/* progress */}
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <div className="font-mono text-[11px] uppercase tracking-luxury text-muted-foreground">
            Step {step + 1} of {STEPS.length} · {STEPS[step].label}
            <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] ${STEPS[step].required ? "bg-primary/15 text-primary" : "bg-surface-2 text-muted-foreground"}`}>
              {STEPS[step].required ? "Required" : "Optional"}
            </span>
          </div>
          <div className="font-mono text-[11px] text-muted-foreground">
            {step < STEPS.length - 1 ? <>Next: {STEPS[step].next}</> : <>Next: Your matches</>}
          </div>
        </div>
        <div className="mb-10 flex items-center gap-2">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-gradient-hero" : "bg-border"}`} />
          ))}
        </div>


        {step === 0 && (
          <div className="space-y-6">
            <div>
              <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Step 01 — Identity</div>
              <h1 className="mt-2 font-display text-4xl font-bold">Tell us who you are.</h1>
              <p className="mt-1 text-sm text-muted-foreground">Phone number is never required.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="First name *">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your first name" className={inputCls} />
              </Field>
              <Field label="Age *">
                <input type="number" min={18} value={age} onChange={(e) => setAge(+e.target.value)} className={inputCls} />
              </Field>
              <Field label="Gender *">
                <select value={gender} onChange={(e) => setGender(e.target.value)} className={inputCls}>
                  <option value="">Select…</option>
                  {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </Field>
              <Field label="Country *">
                <select value={country} onChange={(e) => setCountry(e.target.value)} className={inputCls}>
                  <option value="">Select your country…</option>
                  {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label={`State / Province ${stateRequired ? "(optional)" : isUS ? "(optional — you can add later)" : "(optional)"}`}>
                <input value={stateRegion} onChange={(e) => setStateRegion(e.target.value)} placeholder="Optional" className={inputCls} />
              </Field>
              <Field label="City (optional)">
                <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Your city" className={inputCls} />
              </Field>
              <div className="md:col-span-2">
                <Field label="Email *">
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@email.com" className={inputCls} />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="What are you here for? *">
                  <div className="grid gap-2 md:grid-cols-2">
                    {INTENTS.map((it) => {
                      const active = intent === it.id;
                      return (
                        <button key={it.id} type="button" onClick={() => setIntent(it.id)}
                          className={`rounded-2xl border p-3 text-left text-sm transition-all ${
                            active ? "border-primary bg-primary/10 shadow-glow" : "border-border bg-surface hover:border-foreground/30"
                          }`}>
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

        {step === 1 && (
          <div className="space-y-6">
            <div>
              <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Step 02 — Connection Style</div>
              <h1 className="mt-2 font-display text-4xl font-bold">How do you prefer to connect?</h1>
              <p className="mt-2 text-muted-foreground">Pick the pace that fits you. You can change this anytime — and games are always optional.</p>
            </div>
            <div className="grid gap-3">
              {CONNECTION_STYLES.map((s) => {
                const active = connectionStyle === s.id;
                return (
                  <button key={s.id} type="button" onClick={() => setConnectionStyle(s.id)}
                    className={`flex flex-col items-start gap-1 rounded-2xl border p-5 text-left transition-all ${
                      active ? "border-primary bg-primary/10 shadow-glow" : "border-border bg-surface hover:border-foreground/30"
                    }`}>
                    <div className="font-display text-lg font-medium">{s.label}</div>
                    <div className="text-sm text-foreground/80">{s.hint}</div>
                    <div className="mt-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{s.tone}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Step 03 — Your face & avatar</div>
              <h1 className="mt-2 font-display text-4xl font-bold">A glimpse, your way.</h1>
              <p className="mt-2 text-muted-foreground">Upload a selfie. Then choose how you want to appear — your real photo, or a generated avatar that still looks like you.</p>
            </div>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                const f = e.dataTransfer.files?.[0];
                if (f) handlePhotoFile(f);
              }}
              className={`flex flex-col items-center gap-6 rounded-3xl border-2 border-dashed p-8 transition-colors ${
                dragActive ? "border-primary bg-primary/5" : "border-border bg-card"
              }`}
            >
              <input
                ref={selfieInputRef}
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoFile(f); }}
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoFile(f); }}
              />

              <div className="relative h-40 w-40 overflow-hidden rounded-full bg-gradient-face shadow-glow ring-2 ring-primary/30">
                {photoUrl ? (
                  <img src={photoUrl} alt="Your selfie" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Camera className="h-14 w-14 text-primary-foreground/90" />
                  </div>
                )}
                {photoUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
                    <Loader2 className="h-7 w-7 animate-spin text-primary" />
                  </div>
                )}
                {faceUploaded && !photoUploading && (
                  <div className="absolute bottom-1 right-1 rounded-full bg-background/90 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary shadow">
                    {faceHarmony}%
                  </div>
                )}
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => selfieInputRef.current?.click()}
                  disabled={photoUploading}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-transform hover:scale-105 disabled:opacity-50"
                >
                  <Camera className="h-4 w-4" /> {photoUrl ? "Retake selfie" : "Take selfie"}
                </button>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={photoUploading}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium hover:border-foreground/30 disabled:opacity-50"
                >
                  <Upload className="h-4 w-4" /> Upload photo
                </button>
                {photoUrl && (
                  <button
                    type="button"
                    onClick={clearPhoto}
                    className="inline-flex items-center gap-2 rounded-full px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" /> Remove
                  </button>
                )}
              </div>

              <div className="text-center">
                <div className="text-sm text-foreground/85">
                  {faceUploaded ? "Sensory harmony noted — kept private." : "Drag & drop, take a selfie, or upload from your library."}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  JPG or PNG · up to 8MB · we never share your raw selfie.
                </div>
              </div>
            </div>


            {faceUploaded && (
              <div>
                <div className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-accent" /> Compatibility Avatar System
                </div>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  {AVATAR_STYLES.map((s) => {
                    const active = avatarStyle === s.id;
                    return (
                      <button key={s.id} type="button" onClick={() => setAvatarStyle(s.id)}
                        className={`flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition-all ${
                          active ? "border-primary bg-primary/10 shadow-glow" : "border-border bg-surface hover:border-foreground/30"
                        }`}>
                        <div className="font-display text-sm font-medium">{s.label}</div>
                        <div className="text-xs text-muted-foreground">{s.hint}</div>
                        {active && <Check className="ml-auto h-4 w-4 text-primary" />}
                      </button>
                    );
                  })}
                </div>

                {avatarStyle !== "real" && (
                  <div className="mt-4 rounded-2xl border border-border bg-surface/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-display text-sm">Generate your {AVATAR_STYLES.find(s => s.id === avatarStyle)?.label}</div>
                        <div className="text-xs text-muted-foreground">Optional — you can always switch back to your real photo.</div>
                      </div>
                      <button
                        type="button"
                        onClick={handleGenerateAvatar}
                        disabled={generatingAvatar || !photoUrl}
                        className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-4 py-2 text-xs font-medium text-primary-foreground shadow-glow disabled:opacity-50"
                      >
                        {generatingAvatar
                          ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating…</>
                          : avatarUrl
                            ? <><RefreshCw className="h-3.5 w-3.5" /> Regenerate</>
                            : <><Wand2 className="h-3.5 w-3.5" /> Generate avatar</>}
                      </button>
                    </div>
                    {avatarUrl && (
                      <div className="mt-3 flex items-center gap-3">
                        <img src={avatarUrl} alt="Generated avatar" className="h-20 w-20 rounded-2xl object-cover ring-2 ring-primary/40" />
                        <div className="text-xs text-muted-foreground">
                          Saved to your profile. You can regenerate or skip to keep your selfie.
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <p className="mt-2 text-[11px] text-muted-foreground">
                  You can switch between your real photo and your generated avatar at any time.
                </p>

              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div>
              <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Step 04 — Profession Axis</div>
              <h1 className="mt-2 font-display text-4xl font-bold">How do you spend your <span className="text-gradient-aura italic">hours</span>?</h1>
              <p className="mt-2 text-sm text-muted-foreground">Pick the world your days revolve around.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {PROFESSIONS.map((p) => {
                const active = profession === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setProfession(p.id)}
                    className={`group relative flex flex-col items-start gap-3 overflow-hidden rounded-2xl border p-5 text-left transition-all duration-300 ${
                      active
                        ? "border-primary bg-gradient-to-br from-primary/20 via-primary/5 to-transparent shadow-glow scale-[1.02]"
                        : "border-border bg-card/60 backdrop-blur-sm hover:border-primary/40 hover:bg-card hover:shadow-glow hover:scale-[1.01]"
                    }`}
                  >
                    {/* Glass shimmer */}
                    <div
                      aria-hidden
                      className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${
                        active ? "opacity-100" : "opacity-0 group-hover:opacity-60"
                      }`}
                      style={{
                        background:
                          "radial-gradient(120% 80% at 0% 0%, oklch(0.65 0.22 305 / 0.18), transparent 60%)",
                      }}
                    />
                    <span
                      className={`relative flex h-10 w-10 items-center justify-center rounded-xl text-2xl transition-all ${
                        active
                          ? "bg-gradient-hero shadow-glow"
                          : "bg-surface group-hover:bg-gradient-hero/40"
                      }`}
                    >
                      {p.icon}
                    </span>
                    <span className="relative font-display text-base font-bold">{p.label}</span>
                    {active && (
                      <Check className="absolute right-3 top-3 h-4 w-4 text-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div>
              <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Step 05 — Discovery Profile</div>
              <h1 className="mt-2 font-display text-4xl font-bold">Six quick questions.</h1>
              <p className="mt-2 text-muted-foreground">No right answers. Just pick what sounds more like you.</p>
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
                          <button
                            key={opt}
                            onClick={() => setDiscovery({ ...discovery, [q.key]: opt })}
                            className={`rounded-2xl border p-4 text-left text-sm transition-all ${
                              active ? "border-primary bg-primary/10 shadow-glow" : "border-border bg-surface hover:border-foreground/30"
                            }`}
                          >
                            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{opt === "a" ? q.aLabel : q.bLabel}</div>
                            <div className="mt-1">{opt === "a" ? q.a : q.b}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {allAnswered && (
                <div className="rounded-2xl border border-accent/40 bg-accent/5 p-4 text-sm italic text-foreground/85">
                  {discoverySummary(discovery as DiscoveryProfile)}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-10 flex items-center justify-between gap-3">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-4 py-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
          <div className="flex items-center gap-2">
            {!STEPS[step].required && step < STEPS.length - 1 && (
              <button
                onClick={() => setStep(step + 1)}
                className="rounded-full px-4 py-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Skip this step
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canNext}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-6 py-3 font-medium text-primary-foreground shadow-glow transition-transform enabled:hover:scale-105 disabled:opacity-40"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
                <button
                  onClick={() => finish(true)}
                  className="rounded-full border border-border bg-surface/60 px-5 py-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Skip games — just let me chat
                </button>
                <button
                  onClick={() => finish(false)}
                  disabled={!canNext}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-6 py-3 font-medium text-primary-foreground shadow-glow transition-transform enabled:hover:scale-105 disabled:opacity-40"
                >
                  Discover your resonance <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
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
