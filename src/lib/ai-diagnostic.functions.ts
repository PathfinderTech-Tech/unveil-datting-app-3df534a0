// Temporary diagnostic: verifies the OpenAI key + model are working.
// Admin-only. Returns model output, token usage, and any error verbatim.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const pingOpenAI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase
      .rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) return { ok: false, error: "FORBIDDEN" };

    const key = process.env.OPENAI_API_KEY;
    if (!key) return { ok: false, error: "MISSING_KEY" };
    const model = process.env.OPENAI_MODEL || "gpt-5-mini";

    const t0 = Date.now();
    let res: Response;
    try {
      res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: "Reply with strict JSON only." },
            { role: "user", content: 'Return {"ok":true,"msg":"pong"}' },
          ],
          response_format: { type: "json_object" },
        }),
      });
    } catch (e) {
      return { ok: false, error: "NETWORK", detail: e instanceof Error ? e.message : String(e) };
    }
    const text = await res.text();
    if (!res.ok) {
      return { ok: false, status: res.status, model, body: text.slice(0, 2000), ms: Date.now() - t0 };
    }
    const j = JSON.parse(text);
    return {
      ok: true,
      status: res.status,
      model,
      ms: Date.now() - t0,
      content: j.choices?.[0]?.message?.content ?? null,
      usage: j.usage ?? null,
    };
  });
