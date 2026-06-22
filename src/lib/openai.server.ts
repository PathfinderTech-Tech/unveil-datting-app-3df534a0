// Server-only OpenAI helper. Single call site for every AI feature in Unveil.
// Handles: API key, model selection, JSON-mode, usage logging, error normalization.
// Never import this from client code — it's a `.server.ts` and reads process.env.

import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Provider switch — set AI_PROVIDER=lovable to route through Lovable AI Gateway
// (Gemini, no OpenAI billing required). Defaults to OpenAI when key is present,
// auto-falls-back to Lovable when OPENAI_API_KEY is missing.
const AI_PROVIDER = (process.env.AI_PROVIDER || "").toLowerCase();
function useLovable(): boolean {
  if (AI_PROVIDER === "lovable") return true;
  if (AI_PROVIDER === "openai") return false;
  return !process.env.OPENAI_API_KEY && !!process.env.LOVABLE_API_KEY;
}
export const AI_MODEL_DEFAULT = useLovable()
  ? (process.env.LOVABLE_MODEL || "google/gemini-2.5-flash")
  : (process.env.OPENAI_MODEL || "gpt-5-mini");

export type AiFeature =
  | "ai_compatibility_insights"
  | "ai_message_advice"
  | "ai_icebreakers"
  | "ai_date_suggestions";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type OpenAIOptions = {
  feature: AiFeature;
  userId: string;
  messages: ChatMessage[];
  jsonMode?: boolean;
  temperature?: number;
  model?: string;
};

export class OpenAIError extends Error {
  code: "AI_SERVICE_UNAVAILABLE" | "RATE_LIMIT" | "QUOTA_EXCEEDED";
  status: number;
  constructor(code: OpenAIError["code"], status: number, message: string) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function logUsage(args: {
  userId: string;
  feature: AiFeature;
  tokens: number;
  success: boolean;
  errorCode?: string | null;
  model: string;
}) {
  try {
    await supabaseAdmin.from("ai_usage_log").insert({
      user_id: args.userId,
      feature_name: args.feature,
      token_estimate: args.tokens,
      success: args.success,
      error_code: args.errorCode ?? null,
      model: args.model,
    });
  } catch (e) {
    console.error("[openai.server] usage log failed", e);
  }
}

/**
 * Call OpenAI Chat Completions and return the assistant content string.
 * Always logs to ai_usage_log (success or failure). Throws OpenAIError on failure.
 */
export async function callOpenAI(opts: OpenAIOptions): Promise<string> {
  const viaLovable = useLovable();
  const key = viaLovable ? process.env.LOVABLE_API_KEY : process.env.OPENAI_API_KEY;
  const model = opts.model || AI_MODEL_DEFAULT;
  if (!key) {
    await logUsage({ userId: opts.userId, feature: opts.feature, tokens: 0, success: false, errorCode: "MISSING_KEY", model });
    throw new OpenAIError("AI_SERVICE_UNAVAILABLE", 500, viaLovable ? "Missing LOVABLE_API_KEY" : "Missing OPENAI_API_KEY");
  }

  const body: Record<string, unknown> = { model, messages: opts.messages };
  if (opts.temperature !== undefined) body.temperature = opts.temperature;
  if (opts.jsonMode) body.response_format = { type: "json_object" };

  const url = viaLovable
    ? "https://ai.gateway.lovable.dev/v1/chat/completions"
    : "https://api.openai.com/v1/chat/completions";

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    await logUsage({ userId: opts.userId, feature: opts.feature, tokens: 0, success: false, errorCode: "NETWORK", model });
    throw new OpenAIError("AI_SERVICE_UNAVAILABLE", 0, e instanceof Error ? e.message : "network failure");
  }

  if (!res.ok) {
    let detail = "";
    try { detail = await res.text(); } catch { /* noop */ }
    console.error("[openai.server] error", { status: res.status, feature: opts.feature, detail: detail.slice(0, 500) });
    const code: OpenAIError["code"] =
      res.status === 429 ? "RATE_LIMIT" :
      res.status === 402 ? "QUOTA_EXCEEDED" :
      "AI_SERVICE_UNAVAILABLE";
    await logUsage({ userId: opts.userId, feature: opts.feature, tokens: 0, success: false, errorCode: `HTTP_${res.status}`, model });
    throw new OpenAIError(code, res.status, `OpenAI ${res.status}`);
  }

  const j: any = await res.json();
  const content: string = j.choices?.[0]?.message?.content ?? "";
  const totalTokens: number = j.usage?.total_tokens ?? 0;
  await logUsage({ userId: opts.userId, feature: opts.feature, tokens: totalTokens, success: true, model });
  return content;
}

/**
 * Check the caller's tier-based daily limit BEFORE making an AI call.
 * Returns `{ allowed:false, error }` when blocked.
 */
export async function checkAiRateLimit(
  supabase: any,
  userId: string,
  feature: AiFeature,
): Promise<{ allowed: true } | { allowed: false; error: "PREMIUM_REQUIRED" | "DAILY_LIMIT_REACHED"; remaining: number; limit: number }> {
  const { data, error } = await supabase
    .rpc("check_ai_rate_limit", { _uid: userId, _feature: feature })
    .maybeSingle();
  if (error) {
    console.error("[openai.server] rate-limit RPC failed", error);
    return { allowed: false, error: "PREMIUM_REQUIRED", remaining: 0, limit: 0 };
  }
  if (!data) return { allowed: false, error: "PREMIUM_REQUIRED", remaining: 0, limit: 0 };
  if (data.allowed) return { allowed: true };
  if (data.daily_limit === 0) return { allowed: false, error: "PREMIUM_REQUIRED", remaining: 0, limit: 0 };
  return { allowed: false, error: "DAILY_LIMIT_REACHED", remaining: 0, limit: data.daily_limit };
}
