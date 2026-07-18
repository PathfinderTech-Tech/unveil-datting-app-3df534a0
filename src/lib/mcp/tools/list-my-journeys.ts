import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export default defineTool({
  name: "list_my_journeys",
  title: "List my UNVEIL Journeys",
  description:
    "List UNVEIL Journey walks the signed-in user is part of, with route, mode, progress, and status.",
  inputSchema: {
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe("Maximum number of journeys to return. Defaults to 20."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    const userId = ctx.getUserId();
    const { data: parts, error: partsErr } = await supabase
      .from("journey_participants")
      .select("journey_id")
      .eq("user_id", userId);
    if (partsErr) {
      return { content: [{ type: "text", text: partsErr.message }], isError: true };
    }
    const ids = (parts ?? []).map((p: { journey_id: string }) => p.journey_id);
    if (ids.length === 0) {
      return {
        content: [{ type: "text", text: "You have no journeys yet." }],
        structuredContent: { journeys: [] },
      };
    }
    const { data, error } = await supabase
      .from("journeys")
      .select("id, mode, status, from_city, to_city, total_miles, total_km, created_at, completed_at")
      .in("id", ids)
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { journeys: data ?? [] },
    };
  },
});
