# Süyen functional demo

An internal, bilingual (Russian/Kazakh) demo of a parent journey: sign in, create one **synthetic** child profile, filter fictional specialists, reserve a future session, and cancel it. The public page at `/` describes the planned platform. The working demo lives at `/demo`.

This environment is shared by the team. Do not enter real names, medical details, contact information, or documents. There is no public registration, specialist portal, payment, telehealth, eGov, or OSMS connection.

## Stack

Next.js, PostgreSQL on [Neon](https://neon.com), and [Better Auth](https://www.better-auth.com) for email and password sign-in. The browser never talks to the database. Every query runs on the server, scoped to the signed-in user's id, and the booking rules live in two SQL functions (`reserve_slot`, `cancel_booking`).

## Local setup

Use Node.js 20.9 or newer. Run `npm install`, copy `.env.example` to an ignored `.env.local`, and set:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon **pooled** connection string of the isolated, synthetic-data database |
| `BETTER_AUTH_SECRET` | At least 32 random characters, for example `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |
| `BETTER_AUTH_URL` | Public origin of the app: `http://localhost:3000` locally, the Vercel URL when deployed |

Then run `npm run dev`. All three values are server-side secrets. None of them starts with `NEXT_PUBLIC_`, and none belongs in the browser or in Git.

## Database and account

Create a Neon project and copy its pooled connection string into `.env.local`. Then, once per new database:

```bash
npm run db:migrate
npm run db:seed
```

`db:migrate` applies [the migrations](db/migrations) in order and records each in a `schema_migrations` table, so it is safe to run again. `db:seed` loads [the synthetic directory](db/seed.sql); it is safe to rerun and adds future slots without changing existing bookings.

Public sign-up is **off** in the running app. Create the one team demo account from your own shell, with the email and password set only for that command:

```bash
$env:DEMO_EMAIL = "team@example.com"; $env:DEMO_PASSWORD = "a-long-unique-password"; npm run db:create-demo-user
```

The password needs at least 12 characters. The shared account sees the same synthetic profile and bookings for every tester. Never put its password into source control, Vercel variables, or a chat message.

To clear **only the isolated demo database's** profile and reservations, run this transaction and then rerun the seed:

```sql
begin;
delete from public.bookings;
update public.slots set reserved = false;
delete from public.child_profiles;
commit;
```

This clears the shared test journey. It is not a migration and must never be run against a database with real user data.

## Checks

Run `npm run lint`, `npm run typecheck`, `npm run test:coverage`, `npm run build`, and `npm audit --audit-level=high`. Install the official Playwright Chromium once with `npx playwright install chromium`, then run `npm run test:e2e:fixture` for the browser journeys.

The unit and integration tests need no accounts and no network. The database tests run the real migrations, the real seed and the real data modules on [PGlite](https://pglite.dev), an in-process PostgreSQL, and the authentication tests run the real Better Auth against those same tables. The browser journeys use the same approach through a loopback fixture described in [tests/fixtures/README.md](tests/fixtures/README.md); they never contact a real database.

PGlite serves one query at a time, so these tests do **not** prove behavior under truly concurrent connections. Before a release, run the booking race once against a disposable Neon branch. `npm run test:e2e` (without `:fixture`) drives a running app and needs `TEST_DEMO_EMAIL` and `TEST_DEMO_PASSWORD` for a disposable database; a second account (`TEST_OTHER_EMAIL`, `TEST_OTHER_PASSWORD`) is optional.

## Vercel release

The existing Vercel project deploys this Next.js application. Set `DATABASE_URL`, `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` for Preview and Production, pointing to the intended isolated synthetic database; use a separate Neon branch for Preview. Verify a branch preview first: public page, unauthenticated redirect, RU/KK switching, and the full signed-in profile → specialist → booking → cancellation journey on mobile and desktop. Confirm that public sign-up is off (there is no sign-up form and no auth HTTP route) and all data is fictional before promoting the reviewed commit to production.

The previous root-level static mockup has been retired after the Next.js Preview was verified.
