import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const AI_MODEL = process.env.AI_INSIGHTS_MODEL || "google/gemini-2.5-flash";

export type GeneratedVoiceProfile = {
  bio: string;
  about_me: string;
  looking_for: string;
};

export type GenerateVoiceProfileResponse =
  | { ok: true; profile: GeneratedVoiceProfile }
  | { error: string };

// The two onboarding prompts. Must match VOICE_INTRO_PROMPTS in onboarding.tsx.
export const VOICE_INTRO_PROMPT_ABOUT =
  "What is something great about you, what are you most proud of, and what is one thing you would like to improve in your life?";
export const VOICE_INTRO_PROMPT_LOOKING =
  "What kind of person would you like to meet, and what type of friendship, relationship, or connection are you hoping to build?";

function detectFormat(path: string): "webm" | "mp4" | "ogg" | "wav" | "mp3" {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "m4a" || ext === "mp4") return "mp4";
  if (ext === "ogg") return "ogg";
  if (ext === "wav") return "wav";
  if (ext === "mp3") return "mp3";
  return "webm";
}

async function fileToBase64(blob: Blob): Promise<string> {
  const buf = Buffer.from(await blob.arrayBuffer());
  return buf.toString("base64");
}

function safeParseJson(raw: string): Record<string, unknown> | null {
  const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try { return JSON.parse(cleaned); } catch { return null; }
}

export const generateProfileFromVoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<GenerateVoiceProfileResponse> => {
    const { supabase, userId } = context;
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { error: "AI_SERVICE_UNAVAILABLE" };

    try {
      const { data: rows } = await supabase
        .from("voice_prompts")
        .select("prompt, audio_url, created_at")
        .eq("user_id", userId)
        .in("prompt", [VOICE_INTRO_PROMPT_ABOUT, VOICE_INTRO_PROMPT_LOOKING])
        .order("created_at", { ascending: false });

      const latest: Record<string, { audio_url: string }> = {};
      for (const r of (rows ?? []) as { prompt: string; audio_url: string }[]) {
        if (!latest[r.prompt]) latest[r.prompt] = { audio_url: r.audio_url };
      }

      const aboutRow = latest[VOICE_INTRO_PROMPT_ABOUT];
      const lookingRow = latest[VOICE_INTRO_PROMPT_LOOKING];
      if (!aboutRow || !lookingRow) return { error: "MISSING_RECORDINGS" };

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const [aboutDl, lookingDl] = await Promise.all([
        supabaseAdmin.storage.from("voice-prompts").download(aboutRow.audio_url),
        supabaseAdmin.storage.from("voice-prompts").download(lookingRow.audio_url),
      ]);
      if (aboutDl.error || !aboutDl.data) return { error: "AI_SERVICE_UNAVAILABLE" };
      if (lookingDl.error || !lookingDl.data) return { error: "AI_SERVICE_UNAVAILABLE" };

      const aboutB64 = await fileToBase64(aboutDl.data);
      const lookingB64 = await fileToBase64(lookingDl.data);
      const aboutFmt = detectFormat(aboutRow.audio_url);
      const lookingFmt = detectFormat(lookingRow.audio_url);

      const system = `You are UNVEIL's profile copywriter. You will receive two short voice recordings from a single user.
Recording 1 answers: "${VOICE_INTRO_PROMPT_ABOUT}"
Recording 2 answers: "${VOICE_INTRO_PROMPT_LOOKING}"

Listen carefully, then write a warm, authentic dating profile in the FIRST PERSON, in the user's natural voice.
Return STRICT JSON only — no prose, no markdown fences. Schema:
{
  "bio": "1–2 sentence short bio (max 240 chars). Inviting, specific, never generic.",
  "about_me": "3–5 sentences. What makes them them — values, what they're proud of, what they're working on.",
  "looking_for": "2–4 sentences about the kind of person and connection they're hoping to build."
}
Rules: first person ("I"), no clichés, no hashtags, no emojis, no quotation marks around answers.`;

      const body = {
        model: AI_MODEL,
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: [
              { type: "text", text: "Recording 1 — about me:" },
              { type: "input_audio", input_audio: { data: aboutB64, format: aboutFmt } },
              { type: "text", text: "Recording 2 — what I'm looking for:" },
              { type: "input_audio", input_audio: { data: lookingB64, format: lookingFmt } },
              { type: "text", text: "Write the JSON profile now." },
            ],
          },
        ],
      };

      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        console.error("[voice-profile] gateway failure", res.status, detail.slice(0, 500));
        return { error: "AI_SERVICE_UNAVAILABLE" };
      }
      const j = await res.json();
      const raw = j.choices?.[0]?.message?.content ?? "{}";
      const parsed = safeParseJson(raw);
      if (!parsed) return { error: "AI_SERVICE_UNAVAILABLE" };

      const profile: GeneratedVoiceProfile = {
        bio: String(parsed.bio ?? "").slice(0, 240),
        about_me: String(parsed.about_me ?? "").slice(0, 800),
        looking_for: String(parsed.looking_for ?? "").slice(0, 600),
      };
      if (!profile.bio && !profile.about_me && !profile.looking_for) {
        return { error: "AI_SERVICE_UNAVAILABLE" };
      }
      return { ok: true, profile };
    } catch (e) {
      console.error("[voice-profile] error", e);
      return { error: "AI_SERVICE_UNAVAILABLE" };
    }
  });
