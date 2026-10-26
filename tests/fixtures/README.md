# Isolated browser backend

Run `npx playwright test -c playwright.fixture.config.ts` from the project root.

The dedicated config starts a loopback-only synthetic Supabase HTTP fixture on port 54329 and Next on port 3107. It supplies synthetic Auth credentials and a public fixture key through the test process environment, overriding any local Supabase settings. It never contacts a real Supabase project. The app has no testing bypass: its normal server clients and actions talk to the fixture using Auth, PostgREST, and RPC protocol shapes.

The config uses Webpack so it also works in local worktrees whose dependencies are symlinked. Both ports must be free. Tests run serially because the fixture shares one synthetic account and in-memory state. Stopping the server discards all data. Reset/failure-control endpoints belong only to this standalone test server and are never app routes.

Coverage: existing bilingual desktop/mobile profile/booking/cancellation journeys; specialist details and empty/missing states; upcoming/cancelled/past history; keyboard feedback submission; failed save recovery; response-loss retry deduplication.

These tests verify UI and application behavior. The fixture does **not** run PostgreSQL, enforce real RLS, prove database concurrency guarantees, or replace migration/integration tests against an isolated real database. Mobile viewports do not replace physical-phone checks.
