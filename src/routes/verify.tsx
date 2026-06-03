import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Camera, IdCard, Image as ImageIcon, ShieldCheck, Check, ArrowRight,
  ArrowLeft, Loader2, Upload, X, Clock,
} from "lucide-react";

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      { title: "Verified Profile — UNVEIL" },
      { name: "description", content: "Selfie + identity verification. Build trust on UNVEIL." },
    ],
  }),
  component: Verify,
});

type IdType = "passport" | "national_id" | "drivers_license" | "residence_permit";
type Status = "draft" | "submitted" | "pending_review" | "approved" | "rejected";

const ID_TYPES: { value: IdType; label: string; needsBack: boolean }[] = [
  { value: "passport", label: "Passport", needsBack: false },
  { value: "national_id", label: "National ID", needsBack: true },
  { value: "drivers_license", label: "Driver's License", needsBack: true },
  { value: "residence_permit", label: "Residence Permit", needsBack: true },
];

type Slot = "selfie" | "id_front" | "id_back";

function Verify() {
  const { user, loading } = useAuth();
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<Status>("draft");
  const [busy, setBusy] = useState(false);

  // Step 1
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  // Step 2
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [country, setCountry] = useState("");
  const [idType, setIdType] = useState<IdType>("passport");
  const [idFrontUrl, setIdFrontUrl] = useState<string | null>(null);
  const [idBackUrl, setIdBackUrl] = useState<string | null>(null);
  // Step 3
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);

  const needsBack = ID_TYPES.find((t) => t.value === idType)?.needsBack ?? false;

  // Load existing draft / submission + profile photo
  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: vr }, { data: prof }] = await Promise.all([
        supabase.from("verification_requests").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("profiles").select("photo_url").eq("id", user.id).maybeSingle(),
      ]);
      if (vr) {
        setStatus(vr.status as Status);
        setSelfieUrl(vr.selfie_url);
        setFirstName(vr.legal_first_name ?? "");
        setLastName(vr.legal_last_name ?? "");
        setDob(vr.date_of_birth ?? "");
        setCountry(vr.country ?? "");
        if (vr.id_type) setIdType(vr.id_type as IdType);
        setIdFrontUrl(vr.id_front_url);
        setIdBackUrl(vr.id_back_url);
        setProfilePhotoUrl(vr.profile_photo_url);
      }
      if (prof?.photo_url && !vr?.profile_photo_url) setProfilePhotoUrl(prof.photo_url);
    })();
  }, [user]);

  async function uploadTo(slot: Slot, file: File) {
    if (!user) { toast.error("Please sign in."); return; }
    if (!/^image\//.test(file.type)) { toast.error("Image files only."); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error("Max 8MB."); return; }
    setBusy(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${user.id}/${slot}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("verification-docs")
        .upload(path, file, { upsert: true, contentType: file.type, cacheControl: "3600" });
      if (error) throw error;
      const { data: signed } = await supabase.storage
        .from("verification-docs")
        .createSignedUrl(path, 60 * 60 * 24 * 7);
      const url = signed?.signedUrl ?? null;
      if (slot === "selfie") setSelfieUrl(url);
      if (slot === "id_front") setIdFrontUrl(url);
      if (slot === "id_back") setIdBackUrl(url);
      toast.success("Uploaded.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally { setBusy(false); }
  }

  async function saveDraft(nextStatus: Status = "draft") {
    if (!user) return;
    const payload = {
      user_id: user.id,
      legal_first_name: firstName || null,
      legal_last_name: lastName || null,
      date_of_birth: dob || null,
      country: country || null,
      id_type: idType,
      selfie_url: selfieUrl,
      id_front_url: idFrontUrl,
      id_back_url: idBackUrl,
      profile_photo_url: profilePhotoUrl,
      status: nextStatus,
      submitted_at: nextStatus !== "draft" ? new Date().toISOString() : null,
    };
    const { error } = await supabase
      .from("verification_requests")
      .upsert(payload, { onConflict: "user_id" });
    if (error) throw error;
  }

  function canAdvance(): string | null {
    if (step === 0 && !selfieUrl) return "Add a selfie to continue.";
    if (step === 1) {
      if (!firstName.trim()) return "Enter your legal first name.";
      if (!lastName.trim()) return "Enter your legal last name.";
      if (!dob) return "Enter your date of birth.";
      if (!country.trim()) return "Enter your country.";
      if (!idFrontUrl) return "Upload the front of your ID.";
      if (needsBack && !idBackUrl) return "Upload the back of your ID.";
    }
    return null;
  }

  async function onNext() {
    const err = canAdvance();
    if (err) { toast.error(err); return; }
    setBusy(true);
    try {
      await saveDraft("draft");
      setStep((s) => Math.min(2, s + 1));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    } finally { setBusy(false); }
  }

  async function onSubmit() {
    setBusy(true);
    try {
      await saveDraft("pending_review");
      setStatus("pending_review");
      toast.success("Submitted for review.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submit failed");
    } finally { setBusy(false); }
  }

  if (loading) return null;

  const submitted = status === "pending_review" || status === "submitted" || status === "approved";

  return (
    <div className="min-h-screen">
      <UnveilNav />
      <section className="mx-auto max-w-3xl px-5 py-12 md:py-16">
        <div className="text-center">
          <div className="mx-auto mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-hero text-primary-foreground shadow-glow">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="font-display text-4xl font-light md:text-5xl">
            Get your <span className="text-gradient-aura italic">Verified</span> badge
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            A three-step process. Your photos and ID are private — used only to confirm identity.
          </p>
          <div className="mt-4 flex justify-center">
            <VerifiedBadge size="md" />
          </div>
        </div>

        {!user ? (
          <div className="mt-10 rounded-3xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Please <Link to="/login" className="text-primary underline">sign in</Link> to start verification.
            </p>
          </div>
        ) : submitted ? (
          <SubmittedCard status={status} />
        ) : (
          <div className="mt-10 rounded-3xl border border-border bg-card p-6 md:p-9">
            <Progress step={step} />

            {step === 0 && (
              <StepShell icon={Camera} index={0} title="Selfie verification"
                body="Take or upload a clear, front-facing selfie. Good light, no sunglasses.">
                <PhotoSlot
                  url={selfieUrl}
                  label="Take or upload selfie"
                  capture="user"
                  onPick={(f) => uploadTo("selfie", f)}
                  onClear={() => setSelfieUrl(null)}
                  busy={busy}
                />
              </StepShell>
            )}

            {step === 1 && (
              <StepShell icon={IdCard} index={1} title="Basic identity check"
                body="We compare these details to your ID. Use your legal name exactly as printed.">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Legal first name">
                    <input value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={100}
                      className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
                  </Field>
                  <Field label="Legal last name">
                    <input value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={100}
                      className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
                  </Field>
                  <Field label="Date of birth">
                    <input type="date" value={dob} onChange={(e) => setDob(e.target.value)}
                      max={new Date().toISOString().slice(0, 10)}
                      className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
                  </Field>
                  <Field label="Country">
                    <input value={country} onChange={(e) => setCountry(e.target.value)} maxLength={64}
                      placeholder="e.g. France"
                      className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
                  </Field>
                  <Field label="ID type" className="md:col-span-2">
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                      {ID_TYPES.map((t) => (
                        <button key={t.value} type="button" onClick={() => setIdType(t.value)}
                          className={`rounded-xl border px-3 py-2 text-xs ${
                            idType === t.value ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface hover:bg-surface-2"
                          }`}>{t.label}</button>
                      ))}
                    </div>
                  </Field>
                </div>

                <div className={`mt-5 grid gap-4 ${needsBack ? "md:grid-cols-2" : ""}`}>
                  <div>
                    <div className="mb-2 text-xs text-muted-foreground">ID front</div>
                    <PhotoSlot url={idFrontUrl} label="Upload front" onPick={(f) => uploadTo("id_front", f)}
                      onClear={() => setIdFrontUrl(null)} busy={busy} compact />
                  </div>
                  {needsBack && (
                    <div>
                      <div className="mb-2 text-xs text-muted-foreground">ID back</div>
                      <PhotoSlot url={idBackUrl} label="Upload back" onPick={(f) => uploadTo("id_back", f)}
                        onClear={() => setIdBackUrl(null)} busy={busy} compact />
                    </div>
                  )}
                </div>
              </StepShell>
            )}

            {step === 2 && (
              <StepShell icon={ImageIcon} index={2} title="Photo comparison"
                body="We'll compare your selfie to your profile photo and ID. Submit when ready.">
                <div className="grid gap-3 md:grid-cols-3">
                  <ComparePanel title="Selfie" url={selfieUrl} />
                  <ComparePanel title="Profile photo" url={profilePhotoUrl} fallback="Upload one on your profile" />
                  <ComparePanel title="ID document" url={idFrontUrl} />
                </div>
                <div className="mt-5 rounded-2xl border border-dashed border-border bg-surface p-4 text-center text-xs text-muted-foreground">
                  Submitted for manual review. A reviewer typically responds within 24h.
                </div>
              </StepShell>
            )}

            <div className="mt-8 flex items-center justify-between gap-3">
              <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || busy}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-4 py-2 text-xs hover:bg-surface-2 disabled:opacity-30">
                <ArrowLeft className="h-3 w-3" /> Back
              </button>
              {step < 2 ? (
                <button onClick={onNext} disabled={busy}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-6 py-3 text-sm font-medium text-primary-foreground shadow-glow disabled:opacity-60">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Continue <ArrowRight className="h-4 w-4" /></>}
                </button>
              ) : (
                <button onClick={onSubmit} disabled={busy}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-6 py-3 text-sm font-medium text-primary-foreground shadow-glow disabled:opacity-60">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Submit verification <Check className="h-4 w-4" /></>}
                </button>
              )}
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Your verification photos are private and never shown on your profile.
        </p>
      </section>
    </div>
  );
}

/* ---------- Subcomponents ---------- */

function Progress({ step }: { step: number }) {
  return (
    <div className="mb-6 flex items-center gap-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-gradient-hero" : "bg-surface-2"}`} />
      ))}
    </div>
  );
}

function StepShell({
  icon: Icon, index, title, body, children,
}: { icon: any; index: number; title: string; body: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-aura text-primary-foreground shadow-glow">
          <Icon className="h-6 w-6" />
        </div>
        <div className="font-mono text-[10px] uppercase tracking-luxury text-muted-foreground">
          Step {index + 1} of 3
        </div>
        <h3 className="mt-1 font-display text-2xl">{title}</h3>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{body}</p>
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <div className="mb-1 text-xs text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}

function PhotoSlot({
  url, label, capture, onPick, onClear, busy, compact,
}: {
  url: string | null;
  label: string;
  capture?: "user" | "environment";
  onPick: (f: File) => void;
  onClear: () => void;
  busy?: boolean;
  compact?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`relative flex w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border bg-surface ${compact ? "h-40" : "h-56"}`}>
        {url ? (
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <Camera className="h-7 w-7 text-muted-foreground" />
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
        {url && !busy && (
          <button onClick={onClear} type="button" aria-label="Remove"
            className="absolute right-2 top-2 rounded-full bg-background/80 p-1 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" capture={capture} className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ""; }} />
      <button type="button" onClick={() => ref.current?.click()} disabled={busy}
        className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-5 py-2 text-xs font-medium text-primary-foreground shadow-glow disabled:opacity-60">
        {url ? <><Upload className="h-3.5 w-3.5" /> Replace</> : <><Camera className="h-3.5 w-3.5" /> {label}</>}
      </button>
    </div>
  );
}

function ComparePanel({ title, url, fallback }: { title: string; url: string | null; fallback?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-3">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-luxury text-muted-foreground">{title}</div>
      <div className="flex h-40 items-center justify-center overflow-hidden rounded-xl bg-surface-2">
        {url ? <img src={url} alt={title} className="h-full w-full object-cover" />
             : <span className="px-3 text-center text-xs text-muted-foreground">{fallback ?? "Not provided"}</span>}
      </div>
    </div>
  );
}

function SubmittedCard({ status }: { status: Status }) {
  const isApproved = status === "approved";
  return (
    <div className="mt-10 rounded-3xl border border-primary bg-card p-9 text-center shadow-glow">
      <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-hero text-primary-foreground">
        {isApproved ? <Check className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
      </div>
      <h2 className="mt-5 font-display text-3xl">
        {isApproved ? "You're verified" : "Verification submitted"}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        {isApproved
          ? "Your blue badge is live across UNVEIL."
          : "Your verification has been submitted. Your badge will appear after review (typically within 24h)."}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link to="/matches" className="rounded-full bg-gradient-hero px-6 py-3 text-sm font-medium text-primary-foreground shadow-glow">
          Continue to matches
        </Link>
        <Link to="/passport" className="rounded-full border border-border bg-surface px-6 py-3 text-sm hover:bg-surface-2">
          View passport
        </Link>
      </div>
    </div>
  );
}
