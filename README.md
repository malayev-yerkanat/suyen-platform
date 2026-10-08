# Süyen functional demo

An internal, bilingual (Russian/Kazakh) demo of a parent journey: sign in, create one **synthetic** child profile, filter fictional specialists, reserve a future session, and cancel it. The public page at `/` describes the planned platform. The working demo lives at `/demo`.

This environment is shared by the team. Do not enter real names, medical details, contact information, or documents. There is no public registration, specialist portal, payment, telehealth, eGov, or OSMS connection.

## Local setup

Use Node.js 20.9 or newer. Run `npm install`, copy `.env.example` to an ignored `.env.local`, and set:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL of the isolated, synthetic-data Supabase project |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public browser key from that project |

Then run `npm run dev`. The application uses the public key with Supabase Auth and row-level security; no service-role or database password belongs in the web app or Vercel environment.

## Database and account

On a new Supabase project, run [the migration](supabase/migrations/202610080001_demo.sql) once as the migration owner, then run [the synthetic seed](supabase/seed.sql). Both files can be run from the Supabase SQL Editor; the seed is safe to rerun. It adds future slots without changing existing bookings. The migration is versioned and should not be reapplied to the same project.

In Supabase Authentication, keep email/password sign-in enabled, turn **public sign-up off**, and create one confirmed team demo account outside Git. The shared account sees the same synthetic profile and bookings for every tester. Never put its password into source control, Vercel variables, or a chat message.

To clear **only the isolated demo project's** profile and reservations, run this transaction as the database owner and then rerun the seed:

```sql
begin;
delete from public.bookings;
update public.slots set reserved = false;
delete from public.child_profiles;
commit;
```

This clears the shared test journey. It is not a migration and must never be run against a project with real user data.

## Checks

Run `npm run lint`, `npm run typecheck`, `npm run test:coverage`, `npm run test:e2e`, `npm run build`, and `npm audit --audit-level=high`. Install the official Playwright Chromium once with `npx playwright install chromium` before browser tests.

The live database contract tests and signed-in browser journey need an isolated test account. Set `TEST_SUPABASE_URL`, `TEST_SUPABASE_PUBLISHABLE_KEY`, `TEST_DEMO_EMAIL`, and `TEST_DEMO_PASSWORD` in your shell only for those tests. A second confirmed synthetic account (`TEST_OTHER_EMAIL`, `TEST_OTHER_PASSWORD`) enables cross-account ownership and reservation-race checks. `TEST_SUPABASE_SERVICE_ROLE_KEY` is optional for the past-slot fixture test; it is an admin secret and must be used only in a disposable test process, never in the web app or Vercel. Tests skip the corresponding live cases when these variables are absent. The contract suite creates and cancels test bookings; use a disposable Supabase project, not production data.

## Vercel release

The existing Vercel project deploys this Next.js application. Set only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for Preview and Production, pointing to the intended isolated synthetic project. Verify a branch preview first: public page, unauthenticated redirect, RU/KK switching, and the full signed-in profile → specialist → booking → cancellation journey on mobile and desktop. Confirm that public sign-up is off and all data is fictional before promoting the reviewed commit to production.

The previous root-level static mockup has been retired after the Next.js Preview was verified.
