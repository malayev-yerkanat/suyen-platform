# Booking demo milestone — 26 October 2026

## Implementation

Source checkout: `/private/tmp/suyen-booking-improvements`, branch `codex/booking-improvements`, based on published `aa86bbf`. Local main was preserved. No commit, push, remote migration, or deployment performed.

Added specialist detail pages with fictional profiles and session durations; directory cards show three times. Added upcoming/past/cancelled appointment history with batched owner-scoped reads and navigation. Added structured RU/KK feedback with immutable responses, stable retry identity, payload conflict handling, and additive owner-only database policies.

## Review preview

Local production-build preview: http://127.0.0.1:3107/demo/specialists (open and signed in in Chrome). It uses only a loopback synthetic HTTP backend. The fixture login is `fixture@suyen.example` / `fixture-password`; these values have no access to any real service. Restarting the fixture discards its data. This URL is local to this Mac, not a shareable Vercel deployment.

To reproduce automated review, run `npm ci` then `npm run test:e2e:fixture`. Ports 3107 and 54329 must be free: stop the manual preview processes first. The fixture config supplies all synthetic settings and does not use the real backend.

## Verified

- Lint and TypeScript passed.
- Production build passed with `npm run build` (Turbopack). This checkout now has its own installed dependencies.
- 186 unit/integration tests passed; 14 environment-gated checks skipped.
- Instrumented-code coverage: 94.05% statements, 95.67% lines, 86.77% branches.
- Four existing RU/KK desktop/mobile booking journeys, seven milestone cases, and two bilingual UI refinement browser cases passed (13 total).
- Browser cases cover profile persistence, specialist details/empty/missing states, booking/cancellation, appointment history, keyboard feedback, failed submission recovery, lost-response deduplication, changed-answer conflict, and viewport overflow.
- Twelve review screenshots cover both languages, desktop/mobile, and specialist/history/feedback. Refreshed screenshots cover the current UI; four additional focused UI screenshots are in `ui-refinements/`.
- Security/correctness review found one retry issue, fixed and regression-tested. No remaining high/medium findings in that review.

## Before a shared preview or publication

1. Apply `supabase/migrations/202610260001_demo_feedback.sql` to an approved isolated Supabase preview backend. Migration is prepared but unapplied. Existing production tables are unchanged.
2. Run gated feedback database tests with two distinct synthetic accounts and `TEST_FEEDBACK_DISPOSABLE=1`. The four cases validate real RLS/privileges, immutable records, invalid input, and concurrent first-insert uniqueness. The fixture backend cannot establish PostgreSQL enforcement. Docker was unavailable, so these checks were not run locally.
3. Teammate review: Assem—UX; Zhanggir—acceptance; Ingkar—feedback questions; Nazerke—research alignment. No teammate messages have been sent.
4. Physical-phone checklist remains pending: real iPhone Safari and Android Chrome; login and language switch; specialist selection and scrolling; keyboard/select operation; booking/reload/cancellation/history; feedback and failure retry; portrait/landscape layout and 44px touch targets. Record device/browser and observations before release approval.
5. Get explicit approval before commit/push/PR and production publication under project guidance. No claim of unique-family pilot participation is derived from shared-account feedback.

## Durable recovery

`booking-milestone.patch` in the original project's `docs/demo/` includes tracked edits and all new source/tests/docs against `aa86bbf`. Apply only to a clean checkout of that published commit (first `git apply --check`). Do not apply directly to the divergent local main. The adjacent `milestone-review/` folder preserves screenshots.

## UI review refinements applied

Compact mobile navigation keeps the locale switch and current section visible, supports Escape/route closure, and marks active desktop links. Slots group by Almaty calendar day with compact time/duration buttons and full accessible labels; timezone appears once. Directory cards link to all times. Rebooking retains specialist context and explains that existing bookings remain until cancelled. Page headings share a 32–40px scale, feedback is a consistent one-column form, and successful feedback moves keyboard focus to its heading. Source review found no actionable errors; browser checks include menu closure/focus, equal control heights, and success focus.

## Motion design applied

Added Motion 14.6.0 with shared timing/spring tokens and SSR-visible, finite card/hero entrances. Mobile navigation reveals with a spring; booking and feedback buttons respond to hover/press; success/cancellation icons draw on once. Scenes preserve native layout and cap stagger delays. A shared live matchMedia subscription stops animation and resets transforms when reduced motion changes. Low-core devices skip nonessential motion; no looping background animations or drag interactions were added.

Motion follow-up verification: 186 tests passed (14 database checks still gated), lint/typecheck and default Turbopack production build passed. Four existing bilingual booking journeys passed; the final focused browser run passed five cases covering initial/live reduced motion, no-JavaScript visibility, hydration errors, bilingual menu interaction and feedback keyboard focus. An initial no-JavaScript test used an incorrect link label; its selector was corrected and rerun successfully. Zod updated to 4.6.7 and dev-only Undici to 8.12.3 after advisories were reported; npm audit then reported zero vulnerabilities. These packages were existing dependencies, not introduced by Motion. Production remains unchanged.

## Chrome audit fixes applied

Implemented the 26 October audit fixes in the local milestone: synchronized applied and draft filter resets with browser-history coverage; desktop header visual order matches keyboard order; localized skip link and route titles; complete start–end/duration/timezone summaries; descriptive cancellation plus keep-booking/focus recovery; compact day grids, mobile appointment tabs, neutral cancelled status, contextual empty-state recovery, quieter dashboard feedback and grouped history, consistent page introductions, and localized static loading feedback. The presentation runbook now calls for friendly fictional profiles after tests.

Verification: 210 unit/integration tests passed, 14 real-database checks remain gated. Coverage 93.90% statements / 95.50% lines. Lint, typecheck, production build and diff whitespace checks passed. Sixteen existing browser cases passed; the new audit case initially failed from an ambiguous header selector, then passed after correction with applied/draft reset, Back/Forward, skip focus, title and visual keyboard-order checks. Total 17 browser cases verified. Reviewer caught the same-URL draft-reset edge case; its red/green regression now passes and follow-up review found no remaining material issue. Chrome visual inspection of the production-build local preview confirmed the compact schedule and complete booking summary; screenshots are in `audit-fixes-2026-10-26/` in the original project.

Production was not changed. Published-release gap and production profile cleanup remain operational release tasks. A page loading boundary now covers page data waits; initial uncached layout authentication may still delay it. Physical-phone and real feedback database verification remain pending as above.

## Feature branch push review

User approved committing and pushing the feature branch after local verification. Pre-push npm audit reported zero vulnerabilities; a read-only security review found no critical/high issues or common secret patterns in the 84 changed paths. Feedback per-account throttling remains a medium follow-up before production; a fresh submission UUID can currently create another response. Real database/RLS tests and physical-phone review remain open. This push does not approve merging, applying migrations, or production publication.
