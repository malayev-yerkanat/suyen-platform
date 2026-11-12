# Isolated browser backend

Run `npx playwright test -c playwright.fixture.config.ts` from the project root.

The dedicated config starts `db-server.ts`, a loopback-only backend built on **PGlite**, a real in-process PostgreSQL. It applies the real migrations in `db/migrations`, creates the real Better Auth tables, and registers one synthetic account. Next runs on port 3107 and reaches the database through `DATABASE_URL`, exactly as it would reach Neon. The credentials and `BETTER_AUTH_SECRET` come from the test process environment and override any local settings. It never contacts a real database. The app has no testing bypass.

Ports used (all must be free): `54329` fixture control, `54330` database proxy, `54332` PGlite, `3107` Next.

Two failure modes need the network in the middle, so the database proxy on `54330` can inject them:

- `/__fixture/feedback-failure` drops the connection before a feedback save reaches the database.
- `/__fixture/lose-feedback-response` lets one feedback save commit, then drops the connection before the app hears back. The retry must not create a second row.

`/__fixture/reset` restores the initial synthetic data, `/__fixture/past-booking` adds a past appointment, and `/__fixture/state` returns the table contents. These endpoints exist only in this standalone test server and are never app routes.

The config uses Webpack so it also works in local worktrees whose dependencies are symlinked. Tests run serially because the fixture shares one synthetic account. Stopping the server discards all data.

Coverage: existing bilingual desktop/mobile profile, booking and cancellation journeys; specialist details and empty/missing states; upcoming/cancelled/past history; keyboard feedback submission; failed save recovery; response-loss retry deduplication.

These tests verify UI and application behavior against real SQL and real sign-in. PGlite is a single-process database, so they do **not** prove behavior under real concurrent connections, and they are not a substitute for a check against a disposable Neon branch. Mobile viewports do not replace physical-phone checks.
