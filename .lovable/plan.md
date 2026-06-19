# Sequencing: Redesign → TestFlight → Option A

## Why this order

The conversation page redesign is **pure frontend work** with zero infrastructure risk and the highest visible impact for App Store reviewers. Option A is an architectural change (parallel SPA build, CORS on Worker, auth migration off cookies for iOS, full re-QA) — it needs its own focused session to avoid interleaving infra and UI changes.

Option B (already shipped) handles TestFlight performance acceptably: one redirect at launch, then TanStack Router takes over with client-side SPA navigation. Network-bound loader fetches remain, but the redesigned UI will mask perceived latency with skeleton states and optimistic motion.

---

## Phase 1 — Conversation page redesign (this session)

Single target file: `src/routes/chat.tsx` (chat list/inbox stays; per-conversation view is the flagship surface to rebuild).

Verify which route owns the conversation view, then rebuild it as a luxury dark-themed flagship screen matching the attached reference. Backend, hooks, Supabase calls, realtime channels, voice/gift/AI/reveal logic — all preserved verbatim. Only presentation changes.

### Components to build

```text
src/components/chat/
├── ConversationHeader.tsx       — veiled avatar, name, verified badge,
│                                   online dot, 3-stat row (Compatibility/
│                                   Messages left/Verified)
├── RevealProgressCard.tsx       — large glass card: progress bar,
│                                   message counter, voice-note requirement,
│                                   countdown to reveal
├── MessageBubble.tsx             — incoming/outgoing variants, rounded
│                                   bubbles, timestamps, read receipts (✓✓),
│                                   long-press reaction tray, reactions chip
├── VoiceNoteCard.tsx             — play button, animated waveform bars,
│                                   duration, playback speed toggle, status
├── AiInsightCard.tsx             — inline AI insight with nebula gradient
│                                   background, theme tags, expandable detail,
│                                   dismiss
├── GiftMessageCard.tsx           — rewrite of existing GiftMessageBubble:
│                                   collectible-looking premium card with
│                                   shimmer, name accent color, View Gift CTA
├── DateIdeasCard.tsx             — post-reveal: AI date suggestion cards,
│                                   "generate more" tap
├── QuickActionBar.tsx            — floating row above composer: Voice Note,
│                                   Send Gift, AI Insights, Date Ideas
│                                   (large gradient icons, notification dots)
└── MessageComposer.tsx           — glass composer: +attach, textarea,
                                    emoji, gradient send button
```

### Design tokens (added to `src/styles.css`)

- `--chat-bg`: deep midnight (`oklch(0.12 0.04 290)`)
- `--bubble-incoming` / `--bubble-outgoing` with gradient stops
- `--reveal-progress-gradient`: purple → pink → gold
- `--ai-insight-nebula`: radial nebula gradient
- `--gift-shimmer`: animated gold sweep
- Glass surface tokens with proper Tailwind v4 backdrop-blur usage

### Animations

Lightweight, 60fps, GPU-only (transform/opacity):
- Reveal progress bar: spring fill on update
- New message arrival: bubble scale-in + fade
- AI insight appearance: fade-in + subtle shimmer pulse
- Gift card: shimmer sweep on first render
- Quick action tap: scale-down feedback

### What is NOT changed

- `src/hooks/use-*` chat data hooks
- Supabase queries, realtime channels (`chat-<conversationId>`, `inbox-<userId>`)
- Voice recording/upload pipeline
- AI insight generation server functions
- Gift sending flow / payments
- Reveal countdown logic, message quota, verification gating
- Premium paywall triggers

### Validation

1. Build passes
2. Visual screenshot at iPhone viewport (390x844) of chat route
3. Confirm header, reveal card, bubbles, voice, AI insight, gift, quick actions, composer all present and styled
4. No console errors

---

## Phase 2 — TestFlight (your Mac, after Phase 1 ships)

```bash
git pull && bun install && bun run build
npx cap sync ios && npx cap open ios
# Archive → Upload to App Store Connect → TestFlight
```

Your testers experience the new conversation screen running on the Option B shell. This is enough wow factor for review.

---

## Phase 3 — Option A in dedicated session (next chat)

Scope (committed, do NOT execute alongside Phase 1):

1. Add `vite.config.capacitor.ts`:
   - Strip `@cloudflare/vite-plugin` and TanStack Start SSR mode
   - Set `build.outDir: 'dist-capacitor'`, `build.ssr: false`
   - Emit static SPA with single `index.html` entry
2. Add `bun run build:capacitor` script
3. Create `src/lib/server-origin.client.ts` — fetch wrapper that prefixes `https://unveil.best` to `/_serverFn/*` calls when `isNative() === true`
4. Patch the auth client (`src/integrations/supabase/client.ts`) to use header-based session (no cookies) when running inside Capacitor — required because cross-origin cookies from `capacitor://localhost` to `unveil.best` are blocked
5. Add CORS handler to a wrapper around `src/server.ts` to accept `capacitor://localhost` origin with `Access-Control-Allow-Credentials` and explicit allowed headers
6. Update `capacitor.config.ts`: `webDir: 'dist-capacitor'`
7. Delete `public/index.html` (no longer needed)
8. Full QA matrix:
   - [ ] Apple Sign-In on device
   - [ ] Google Sign-In on device
   - [ ] Session persists across app relaunch
   - [ ] RevenueCat StoreKit purchase
   - [ ] Push notification token registers
   - [ ] Photo upload to Supabase Storage
   - [ ] Realtime chat message delivery
   - [ ] Deep links from email open correct route

---

## Decision needed from you

**Approve this sequencing?** Reply:
- **"yes"** → I execute Phase 1 (conversation redesign) immediately
- **"do Option A first anyway"** → I do Option A first, redesign waits
- **"do both now"** → I do both in this session but it will be a long single response and harder to bisect if something breaks
