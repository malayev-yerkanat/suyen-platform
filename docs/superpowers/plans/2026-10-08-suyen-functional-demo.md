# Süyen Functional Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static concept site with a responsive RU/KK Next.js platform where a signed-in teammate creates one synthetic child profile, finds a seeded specialist, books a future slot, and cancels it.

**Architecture:** The public landing page is a static App Router route; `/demo` is a server-rendered, authenticated slice. Supabase Auth supplies the shared test account and Postgres stores profiles, specialist fixtures, slots, and bookings. Server actions recheck authentication and validate input, while row-level security and a partial unique index enforce ownership and single-slot reservation in the database.

**Tech Stack:** Next.js App Router, TypeScript, React, CSS, self-hosted Onest, Supabase Auth/Postgres with `@supabase/ssr`, Zod, Vitest, Testing Library, Playwright, Vercel.

---

## Starting point and constraints

- Repository: `https://github.com/malayev-yerkanat/suyen-platform`; currently `index.html`, `styles.css`, and `script.js` serve the concept page. Preserve the live deployment until a Vercel preview of the replacement is verified.
- Approved source of truth: `docs/superpowers/specs/2026-10-08-suyen-functional-demo-design.md`.
- Use only synthetic people and content. Do not create diagnosis, medical notes, uploads, payment, video, chat, eGov, OSMS, public sign-up, or specialist administration.
- The existing account and Supabase/Vercel secrets are provisioned outside Git. An engineer needs the Supabase project URL, publishable key, database connection for migrations, and one email/password test account before running the full integration and E2E suites.
- Every code task follows RED → GREEN → refactor. Run the named tests at each step and keep the final unit/integration coverage at or above 80% for the new application code. Use Conventional Commits. No production deployment until preview review.

## File ownership map

| Paths | Responsibility |
| --- | --- |
| `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `playwright.config.ts`, `.gitignore`, `.env.example` | Application and test setup; env contract |
| `app/layout.tsx`, `app/globals.css`, `app/page.tsx`, `app/loading.tsx`, `components/*` | Shared visual shell and public landing page |
| `lib/i18n/catalog.ts`, `lib/i18n/locale.ts`, `app/actions/locale.ts` | Complete RU/KK catalog, cookie persistence, server locale access |
| `lib/time.ts`, `lib/validation/profile.ts`, `lib/validation/booking.ts` | Time zone display and system-boundary schemas |
| `lib/supabase/browser.ts`, `lib/supabase/server.ts`, `proxy.ts`, `lib/auth.ts` | Cookie-based Auth client, refresh, protected route checks |
| `supabase/migrations/202610080001_demo.sql`, `supabase/seed.sql` | Schema, RLS, safe booking/cancellation RPCs, synthetic directory fixtures |
| `app/demo/login/*`, `app/demo/layout.tsx`, `app/demo/page.tsx` | Sign-in, sign-out, protected demo shell and dashboard |
| `app/demo/profile/*`, `lib/data/profile.ts` | One synthetic child profile and validated edit flow |
| `app/demo/specialists/*`, `lib/data/specialists.ts` | Read-only directory, filters, available slot display |
| `app/demo/bookings/new/page.tsx`, `app/demo/bookings/[id]/*`, `app/demo/bookings/actions.ts`, `lib/data/bookings.ts` | Confirmation review, cancellation, conflict recovery, booking detail |
| `tests/unit/*`, `tests/integration/*`, `tests/e2e/*` | Domain tests, live database contract tests, both-language browser journeys |
| `README.md` | Setup, test, seed/reset, and preview/production runbook |

## Task 1: Establish the application and test harness

**Files:** Create/modify root configuration files, `.env.example`, `app/layout.tsx`, `app/globals.css`, `app/page.tsx`, `vitest.config.ts`, `tests/unit/smoke.test.ts`; remove root static files only after the Next.js page is visible in a preview.

- [ ] **Step 1: Write a failing smoke test.** In `tests/unit/smoke.test.ts`, import the exported `APP_NAME` from `lib/config.ts` and assert `expect(APP_NAME).toBe('Süyen')`. Run `npm test -- --run tests/unit/smoke.test.ts`; expect failure because `lib/config.ts` does not exist.
- [ ] **Step 2: Install and configure the app.** Add Next.js, React, TypeScript, Supabase JS/SSR, Zod, Onest, Vitest, Testing Library, Playwright, and lint tooling. Set scripts `dev`, `build`, `lint`, `typecheck`, `test`, `test:coverage`, and `test:e2e`. Create `lib/config.ts` with `export const APP_NAME = 'Süyen' as const;`. Configure Vitest for `jsdom` and the `@/` alias. Create a minimal App Router root layout and page so `/` builds. Set `.env.example` to `NEXT_PUBLIC_SUPABASE_URL=`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=`, `TEST_DEMO_EMAIL=`, `TEST_DEMO_PASSWORD=`; ignore `.env.local` and Playwright output.
- [ ] **Step 3: Run `npm test -- --run tests/unit/smoke.test.ts`, `npm run typecheck`, `npm run build`, and `npm run lint`.** Expect success. Keep the old static files tracked until Task 9's preview gate.
- [ ] **Step 4: Commit** with `chore: scaffold Next.js demo and test harness`.

## Task 2: Build the language, time, and visual foundations

**Files:** Create `lib/i18n/catalog.ts`, `lib/i18n/locale.ts`, `app/actions/locale.ts`, `lib/time.ts`, `components/LocaleSwitch.tsx`, `components/DemoBanner.tsx`, `tests/unit/i18n.test.ts`, `tests/unit/time.test.ts`; modify `app/layout.tsx`, `app/globals.css`.

- [ ] **Step 1: Write failing domain tests.** Assert `Object.keys(catalog.ru).sort()` equals `Object.keys(catalog.kk).sort()`, invalid locale cookies resolve to `ru`, and a known UTC instant is formatted in `Asia/Almaty` with a visible zone label. Run those two test files; expect missing-module failures.
- [ ] **Step 2: Define one flat typed catalog for every visible string.** Include navigation, sign-in, sign-out, shared synthetic-data banner, dashboard, profile labels/errors, specialty names, directory filters/empty states, booking review/confirmation/conflict/cancellation, retry messages, loading labels, and public landing copy. Define `type TranslationKey = keyof typeof catalog.ru`; make the Kazakh object satisfy `Record<TranslationKey, string>`. No page may contain its own translated prose.
- [ ] **Step 3: Implement `getLocale()` from a `suyen-locale` cookie and a locale-changing server action that accepts only `ru` or `kk`, writes a same-site cookie, and refreshes the current route.** Use `Intl.DateTimeFormat` with `timeZone: 'Asia/Almaty'` and `timeZoneName: 'shortOffset'`; never append a fixed UTC offset. Add Onest from the installed local font package and CSS variables for the approved 50–950 teal scale, page/surface/text, outline, error, and focus colors. Implement 44px minimum interactive targets and `prefers-reduced-motion` override.
- [ ] **Step 4: Run the two tests, typecheck, and lint.** Expect success. Visually inspect 375px and 1440px layouts and keyboard focus on the language control.
- [ ] **Step 5: Commit** with `feat: add RU KK language and design foundations`.

## Task 3: Create the protected Supabase data model

**Files:** Create `supabase/migrations/202610080001_demo.sql`, `supabase/seed.sql`, `tests/integration/database.test.ts`; update `README.md` with migration/seed commands.

- [ ] **Step 1: Write failing database contract tests.** Against a local or isolated test Supabase database, assert an anonymous client cannot read `specialists`, the signed-in test account can read them, another user cannot read the demo profile/booking, and two concurrent reservations for the same slot yield exactly one confirmed booking. Run `npm test -- --run tests/integration/database.test.ts`; expect missing schema or connection setup failure. Skip this suite only when the explicit test database env is absent; CI must provide it.
- [ ] **Step 2: Add SQL schema.** Define `support_area` as `speech_language`, `developmental_education`, `neuropsychology`, or `adaptive_physical_activity`; `age_band` as `0_3`, `4_6`, `7_10`, or `11_17`; and `booking_status` as `confirmed` or `cancelled`. Create `child_profiles` with unique `owner_id`, nickname length 1–60, language `ru|kk`; `specialists` with one `support_area`, fictional display data and `text[]` languages; `slots` with `starts_at < ends_at` and a read-only-to-clients `reserved` flag; and `bookings` with owner/profile/slot references. Store all timestamps as `timestamptz` and add `unique(slot_id) where status = 'confirmed'`. A booking insert/cancel trigger maintains `slots.reserved` inside the same transaction so the directory can show availability without exposing other testers' booking rows.
- [ ] **Step 3: Add grants, RLS, and booking RPCs in the same migration.** Revoke table access from `anon`. Grant authenticated users read-only access to specialists/slots; grant profile operations and the minimum booking insert/select/`status` update columns. Policies restrict profile and booking rows to `auth.uid() = owner_id`; booking insert checks `status = 'confirmed'`, owned profile, and active future slot; booking update allows only a future confirmed booking to become cancelled. `reserve_slot(profile_id uuid, slot_id uuid)` must be `SECURITY INVOKER`, reject missing auth, unowned profile, inactive/past/reserved slot, and duplicate own active reservation; insert a confirmed booking, allowing the unique index to settle races. Map unique violation to a stable conflict error. `cancel_booking(booking_id uuid)` must check owner and `slots.starts_at > now()`, then update only a confirmed booking to cancelled. Revoke function execution from `public` and `anon`, grant to `authenticated`. The availability-maintenance trigger alone may run with narrowly scoped definer rights to update `slots.reserved`; set a fixed search path and never return private booking fields. Verify direct client writes cannot bypass timing/ownership checks.
- [ ] **Step 4: Seed idempotent synthetic fixtures.** Insert at least one specialist per support area, specialists offering RU and KK, several future slots generated relative to current UTC time, and one specialist with no available slots. Use stable fixture UUIDs and `ON CONFLICT DO NOTHING` so rerunning seed does not shift booked appointments or duplicate rows. Never seed a shared-account password. Provide a documented reset command that deletes only test bookings/profile and recreates future test slots in the isolated demo project.
- [ ] **Step 5: Apply migration and seed to the isolated test project, then run integration tests twice.** Expect all tests to pass on both runs; duplicate seed must not create duplicate rows. Review grants and RLS via direct SQL or Supabase policy inspection. Commit with `feat: add protected demo schema and booking transactions`.

## Task 4: Add shared-account authentication

**Files:** Create `lib/supabase/browser.ts`, `lib/supabase/server.ts`, `lib/auth.ts`, `proxy.ts`, `app/demo/login/page.tsx`, `app/demo/login/actions.ts`, `app/demo/layout.tsx`, `app/demo/page.tsx`, `tests/unit/auth.test.ts`, `tests/e2e/auth.spec.ts`.

- [ ] **Step 1: Write failing tests.** Unit-test a validated redirect helper: only an internal path beginning `/demo` is accepted; `/demo` is the fallback for external URLs and `//` paths. E2E-test that `/demo/profile` redirects to `/demo/login?next=%2Fdemo%2Fprofile`, wrong credentials show a usable error, correct credentials return to `/demo/profile`, and sign-out protects the route again.
- [ ] **Step 2: Implement cookie-based Supabase clients.** Browser client uses public URL/publishable key; server client reads/writes Next cookies. `proxy.ts` refreshes auth cookies via a validated Supabase call. `requireDemoUser()` calls `auth.getUser()` on the server and redirects unauthenticated requests to `/demo/login?next=...`. Every protected page and server action calls it independently; proxy is for refresh, not the sole authorization check.
- [ ] **Step 3: Implement login and logout actions.** Validate email/password fields with Zod, call `signInWithPassword`, return a generic localized error on failure, redirect only through the tested internal-path helper, and clear the session on sign-out. There is no sign-up UI or route. Add persistent synthetic-data banner and the shared-account warning to the demo layout. Disable public sign-up in Supabase project settings and create the one test account outside source control.
- [ ] **Step 4: Run unit/E2E auth tests, typecheck, lint, and build.** Expect success with the isolated test account. Check expired-session redirect behavior and keyboard access. Commit with `feat: protect shared demo routes`.

## Task 5: Create and edit one synthetic child profile

**Files:** Create `lib/validation/profile.ts`, `lib/data/profile.ts`, `app/demo/profile/page.tsx`, `app/demo/profile/actions.ts`, `app/demo/profile/ProfileForm.tsx`, `tests/unit/profile.test.ts`, `tests/integration/profile.test.ts`; modify `app/demo/page.tsx`.

- [ ] **Step 1: Write failing validation tests.** Empty/61-character nicknames, invalid age band, invalid language, and invalid support area fail; a valid synthetic profile passes. Integration tests assert create then edit keeps one row, unauthorized ownership fails, and malformed action input does not write. Run both test files; expect failures.
- [ ] **Step 2: Define a Zod schema with only `nickname`, `ageBand`, `preferredLanguage`, and `supportArea`.** Trim nickname and reject empty/over-60 values; use the exact enum values from Task 3. No diagnosis, notes, contact details, or file field. `saveProfile` action calls `requireDemoUser()`, validates a `FormData` object, and upserts by `owner_id` without accepting owner ID from the browser. Return field-specific localized error keys instead of database details.
- [ ] **Step 3: Build the profile form and dashboard empty state.** Use labels, fieldsets where appropriate, inline error associations, preserved values after failed submit, disabled submit while pending, retry on transient failure, and the shared-data warning. The dashboard offers profile creation when absent and displays nickname, age band, preferred language, and the next confirmed booking when present.
- [ ] **Step 4: Run unit/integration tests, typecheck, lint, and the profile E2E flow at mobile and desktop.** Expect a saved profile after page refresh. Commit with `feat: add synthetic child profile flow`.

## Task 6: Build the seeded specialist directory

**Files:** Create `lib/data/specialists.ts`, `app/demo/specialists/page.tsx`, `app/demo/specialists/DirectoryFilters.tsx`, `app/demo/specialists/loading.tsx`, `tests/unit/filters.test.ts`, `tests/integration/specialists.test.ts`; modify `app/demo/page.tsx`.

- [ ] **Step 1: Write failing filter tests.** A specialist must match selected support area, selected session language, and availability together; a specialist with zero future unreserved active slots fails the availability-only filter. Integration test unauthenticated reads fail and signed-in reads include the four seeded areas. Run tests; expect failures.
- [ ] **Step 2: Implement a typed read model.** Fetch active specialists and future active slots with `reserved = false`, sort slots by start time and specialists by display name. Keep filtering pure and unit-testable; only server-side data access uses Supabase. Do not expose ratings, accreditation, price, or insurance badges.
- [ ] **Step 3: Render cards with fictional name, role, supported languages, sample description, and available times.** Add area, language, and available-only controls with URL search params so filtered results survive refresh and locale switch. Distinguish no-match from no-slots states, provide clear/reset actions, and keep loading skeletons at the same card dimensions.
- [ ] **Step 4: Run unit/integration tests, typecheck, lint, and a mobile/desktop keyboard pass.** Expect filters and empty states in RU and KK. Commit with `feat: add filterable specialist directory`.

## Task 7: Implement confirmation, cancellation, and conflict recovery

**Files:** Create `lib/validation/booking.ts`, `lib/data/bookings.ts`, `app/demo/bookings/actions.ts`, `app/demo/bookings/new/page.tsx`, `app/demo/bookings/[id]/page.tsx`, `app/demo/bookings/BookingReview.tsx`, `app/demo/bookings/CancelBooking.tsx`, `tests/unit/booking.test.ts`, `tests/integration/booking.test.ts`; modify `app/demo/specialists/page.tsx` and `app/demo/page.tsx`.

- [ ] **Step 1: Write failing tests.** Reject malformed UUIDs and missing profile/slot IDs. Integration tests cover ownership, past/inactive slots, one successful reservation, duplicate/replayed submission, two simultaneous accounts racing for a slot, cancellation releasing the slot, and cancellation after start failing. Browser tests verify the review details, immediate confirmation, and return to directory after cancellation.
- [ ] **Step 2: Add validated server actions.** `reserveBooking` calls `requireDemoUser()`, parses only `profileId` and `slotId`, invokes `reserve_slot`, and maps the stable conflict error to localized copy. Treat a repeat submission by the same account/profile/slot as the existing confirmation instead of creating a second booking. Refresh specialist/dashboard data after success or conflict. `cancelBooking` parses a booking UUID, calls `requireDemoUser()`, invokes `cancel_booking`, and refreshes affected pages.
- [ ] **Step 3: Build slot review and booking detail views.** Show specialist, child nickname, local date/time, explicit `Asia/Almaty` label plus derived offset, confirm action, current status, and cancellation action only before start. Keep actions reachable by keyboard and at least 44px high. Disable the submit while pending but rely on the database for duplicate safety. Show retryable network errors without clearing the review state.
- [ ] **Step 4: Run booking unit/integration/E2E tests, typecheck, lint, and build.** Expect exactly one confirmed reservation under concurrency and a newly available slot after cancellation. Commit with `feat: complete demo booking journey`.

## Task 8: Replace the public concept page with the new design

**Files:** Modify `app/page.tsx`, `app/globals.css`, `app/layout.tsx`; create `components/PublicHeader.tsx`, `components/PublicHero.tsx`, `components/PublicProcess.tsx`, `tests/e2e/public.spec.ts`.

- [ ] **Step 1: Write failing public-page E2E checks.** Assert the landing page has one primary heading, a visible RU/KK switch, a clearly labeled demo entry to `/demo`, no live-service claim, and a usable mobile layout at 375px. Run the test; expect failure while the temporary page is present.
- [ ] **Step 2: Implement the approved soft-structuralist page.** Use the Task 2 token system, self-hosted Onest, an asymmetric desktop hero that collapses to one column, concise truthful copy describing the planned platform, a clear three-stage journey, and a demo entry. Avoid medical stock imagery, generic feature-card grids, looping motion, and unverified service claims. Keep the document language, metadata, focus order, and landmarks correct in both locales.
- [ ] **Step 3: Run E2E, Lighthouse/accessibility checks, typecheck, lint, and build.** Review 375px, 768px, and 1440px screenshots; check contrast of final component colors and reduced-motion behavior. Commit with `feat: redesign public Süyen landing page`.

## Task 9: Verify, document, preview, and release

**Files:** Modify `README.md`, `.gitignore`; remove `index.html`, `styles.css`, `script.js` after preview verification; add or refine tests that reveal uncovered behavior.

- [ ] **Step 1: Complete the automated gate.** Run `npm run lint`, `npm run typecheck`, `npm run test:coverage`, `npm run test:e2e`, `npm run build`, and `npm audit --audit-level=high`. Coverage must be at least 80% for new application code; all tests and build must pass. Resolve concrete failures rather than weakening tests.
- [ ] **Step 2: Complete a human-facing QA pass.** On mobile and desktop, use only synthetic input to follow sign-in → profile → filter → book → cancel in RU and KK. Check keyboard order, visible focus, labels/errors, screen-reader names, no-match/no-slot states, retry, session expiry, shared-account banner, and reduced motion. Confirm all timestamps are labeled `Asia/Almaty`.
- [ ] **Step 3: Update the runbook.** Document `npm install`, environment variable names, local Supabase migrations/seed/reset, account provisioning, test commands, Vercel preview env settings, and the fact that public sign-up must be disabled. Keep secrets out of Git. Run `git diff --check`, inspect the full diff, and search tracked files for credentials and real personal/medical data.
- [ ] **Step 4: Deploy a Vercel preview and verify its public `/` and protected journey.** Set the existing Vercel project to Next.js and provide only public Supabase URL/publishable key to the web app. Confirm preview migrations use the intended isolated Supabase project. After preview passes, remove the obsolete static root files, rerun build/tests, commit `chore: retire static mockup and document release`, and push the reviewed branch with `-u`.
- [ ] **Step 5: Release to the existing production Vercel project after explicit approval for that external action.** Confirm production Auth sign-up is disabled, the shared test account is present, migrations and synthetic seed are applied, production env variables target the intended Supabase project, and the final URL passes both-language smoke tests. Record the commit SHA and deployment URL in the release note.

## Cross-check against the approved design

| Spec area | Plan task |
| --- | --- |
| Public redesigned landing and truthful claims | 2, 8, 9 |
| Shared test sign-in, sign-out, protected routes, expired session | 3, 4, 9 |
| Single synthetic profile with limited fields | 3, 5 |
| Seeded specialists, filters, empty availability | 3, 6 |
| Immediate booking, unique slot, race/replay, cancellation | 3, 7 |
| RU/KK, persistent choice, Almaty time | 2, 5–9 |
| Responsive visual system, reduced motion, accessibility | 2, 4–9 |
| Automated tests, preview before production, no real health data | 1, 3–9 |

## Implementation references

- [Next.js authentication and server-side authorization](https://nextjs.org/docs/app/guides/authentication)
- [Next.js Proxy convention](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)
- [Supabase SSR clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client?environment=client-component)
- [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Auth configuration](https://supabase.com/docs/guides/auth/general-configuration)
- [Vercel Next.js deployment](https://vercel.com/docs/frameworks/full-stack/nextjs)
