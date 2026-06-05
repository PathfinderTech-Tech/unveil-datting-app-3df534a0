# 12. File Structure

```
.
├── docs/                          # This documentation package
├── src/
│   ├── router.tsx                 # TanStack Router bootstrap
│   ├── server.ts                  # Cloudflare Worker entry (SSR + error fallback)
│   ├── start.ts                   # createStart() — registers global middleware
│   ├── styles.css                 # Tailwind v4 + OKLCH design tokens
│   ├── routeTree.gen.ts           # AUTO-GENERATED — do not edit
│   │
│   ├── routes/                    # File-based routing
│   │   ├── __root.tsx             # HTML shell + providers + <Outlet />
│   │   ├── index.tsx              # Landing page
│   │   ├── login.tsx, signup.tsx, reset-password.tsx
│   │   ├── onboarding.tsx, verify.tsx
│   │   ├── discover.tsx, matches.tsx, match.$userId.tsx
│   │   ├── messages.tsx, chat.tsx
│   │   ├── profile.tsx, settings.tsx
│   │   ├── passport.tsx, p.$userId.tsx        # public passport
│   │   ├── premium.tsx, checkout.tsx, checkout.return.tsx,
│   │   ├── manage-subscription.tsx, refund.tsx
│   │   ├── play.*.tsx, games.tsx, puzzles.tsx, quiz.tsx, spark.tsx,
│   │   │   challenges.tsx, date-plan.tsx, insights.tsx
│   │   ├── admin.tsx, admin.beta.tsx
│   │   ├── terms.tsx, privacy.tsx, cookies.tsx, safety.tsx,
│   │   │   community-guidelines.tsx, support.tsx, contact.tsx
│   │   └── api/                   # Server routes (HTTP endpoints)
│   │       └── public/            # Auth-bypassed (webhooks, cron)
│   │           └── stripe-webhook.ts
│   │
│   ├── lib/
│   │   ├── *.functions.ts         # createServerFn RPC handlers (client-safe import)
│   │   │   ├── account, admin-beta, admin-failures, avatar, blueprint,
│   │   │   │   daily, hidden-matches, icebreakers, payments,
│   │   │   │   public-passport, reveal
│   │   ├── *.server.ts            # Server-only helpers (never imported by client)
│   │   │   ├── failure-log.server.ts, stripe.server.ts
│   │   ├── analytics.ts, compatibility.ts, matching-api.ts,
│   │   │   chemistry-ledger.ts, cooldown.ts, content-api.ts,
│   │   │   discover-sections.ts, error-capture.ts, error-page.ts,
│   │   │   games-api.ts, photos.ts, social-api.ts, stripe.ts,
│   │   │   synapse-store.ts, thoughts-api.ts, utils.ts,
│   │   │   avatar-fallback.ts
│   │
│   ├── hooks/
│   │   ├── use-auth.ts            # Session + onAuthStateChange
│   │   ├── use-subscription.ts    # Tier + premium_until + realtime sync
│   │   ├── use-verification.ts    # profiles.verified
│   │   ├── use-message-quota.ts   # get_message_quota RPC
│   │   ├── use-unread.ts          # Per-conversation unread counts
│   │   ├── use-nav-badges.ts      # Aggregate badges (matches/discover/messages)
│   │   ├── use-push-notifications.ts
│   │   ├── use-reveal-notifications.ts
│   │   ├── use-require-onboarding.ts
│   │   └── use-mobile.tsx
│   │
│   ├── components/                # Presentational React
│   │   ├── ui/                    # shadcn primitives
│   │   ├── chemistry/             # Chemistry visualizations
│   │   ├── UnveilNav.tsx, MobileBottomNav.tsx, SiteFooter.tsx, LogoHeader.tsx
│   │   ├── ProfileAvatar.tsx, SignedImage.tsx, Avatar.tsx, PhotoUpload.tsx
│   │   ├── VerificationGate.tsx, VerifiedBadge.tsx, BetaBadge.tsx
│   │   ├── PhotoRevealPanel.tsx, RevealJourney.tsx, RevealProgressCard.tsx,
│   │   │   RevealStageBadge.tsx, SlowRevealTimeline.tsx, VeilBackdrop.tsx
│   │   ├── MessagePaywallModal.tsx, PremiumPaywallModal.tsx,
│   │   │   StripeEmbeddedCheckout.tsx, PaymentTestModeBanner.tsx,
│   │   │   InsightsPlusPaywall.tsx
│   │   ├── ShareablePassportCard.tsx, PassportIdentityCard.tsx,
│   │   │   GlobalPassportJourneys.tsx
│   │   ├── MatchFilters.tsx, HiddenMatchCard.tsx, WhyWeMatchSheet.tsx,
│   │   │   CompatibilityMap.tsx, ChemistryMeter.tsx, CoupleJourney.tsx,
│   │   │   JourneyMilestones.tsx
│   │   ├── GuidedFirstDate.tsx, PartnerPicker.tsx, ThoughtModal.tsx,
│   │   │   VoiceRecorder.tsx, FeedbackForm.tsx, WaitlistForm.tsx,
│   │   │   ConversationScaffold.tsx, CooldownGuard.tsx, NoMatchHub.tsx,
│   │   │   HomeDashboard.tsx, MailActions.tsx, OAuthButtons.tsx,
│   │   │   NearbyDiscoverySettings.tsx, SafetyReminder.tsx,
│   │   │   LanguageSwitcher.tsx, ThemeTokenSwitcher.tsx, LegalShell.tsx
│   │
│   ├── integrations/supabase/     # AUTO-GENERATED — do not edit
│   │   ├── client.ts              # Browser client (publishable key)
│   │   ├── client.server.ts       # Admin client (service role)
│   │   ├── auth-middleware.ts     # requireSupabaseAuth
│   │   ├── auth-attacher.ts       # attachSupabaseAuth (function middleware)
│   │   └── types.ts               # Generated DB types
│   │
│   ├── i18n/                      # Translations
│   └── assets/                    # Static images
│
├── supabase/
│   ├── migrations/                # Forward-only SQL migrations
│   └── config.toml                # AUTO-GENERATED — do not edit
│
├── public/                        # Static public assets
├── vite.config.ts
├── tsconfig.json
├── package.json
└── .env                           # AUTO-GENERATED public envs only
```
