import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyProfileTool from "./tools/get-my-profile";
import listMyJourneysTool from "./tools/list-my-journeys";

// Direct Supabase issuer (never the `.lovable.cloud` proxy) — inlined at build
// time by Vite. Fallback keeps the URL well-formed during the throwaway
// manifest-extract eval; a real token never verifies against the sentinel.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "unveil-mcp",
  title: "UNVEIL",
  version: "0.1.0",
  instructions:
    "Tools for UNVEIL — the intentional-dating app. Every tool acts as the signed-in user via OAuth and respects the app's row-level security. Use `get_my_profile` to read the caller's profile, and `list_my_journeys` to read the caller's walking journeys.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMyProfileTool, listMyJourneysTool],
});
