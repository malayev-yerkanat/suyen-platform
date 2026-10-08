# Süyen functional demo design

**Status:** Design approved in conversation on 2026-10-08; written spec awaits review.

## Purpose

Turn the deployed concept page into an internal, working platform slice. A team member can sign in, create a synthetic child profile, find a seeded specialist, and book an available time. This release tests the parent journey and interface quality. It does not accept real family or medical data.

## Decisions and boundaries

| Area | Decision |
| --- | --- |
| Audience | Internal team using one shared demo account and synthetic data |
| Core journey | Child profile → specialist search → immediate booking confirmation |
| Specialist data | Seeded profiles and future time slots; no specialist portal or admin editor |
| Languages | Russian and Kazakh on every app screen and state |
| Visual direction | New soft-structuralist design; do not reuse the current landing-page styling |
| Hosting | Existing GitHub repo and Vercel project; functional app under `/demo` |
| Application | Next.js App Router with TypeScript |
| Auth and data | Supabase Auth and Postgres; one existing email/password account, public sign-up disabled |

The public landing page remains at `/` and is redesigned in the same visual system. Its claims describe planned services rather than live services. The protected demo is entered through a clearly labeled link. Existing public availability is maintained until the new build is verified in a Vercel preview deployment. Teammates review the final Russian and Kazakh wording; engineering enforces translation completeness.

Outside this release: real patient data, diagnosis fields, documents and uploads, verified credential claims, ratings, specialist self-service, payments, video visits, psychologist chat, eGov, OSMS, and public registration. These require separate product and policy decisions before implementation.

## User experience

1. **Demo sign-in:** The shared account signs in with email and password. There is no registration link. A persistent banner says this is a shared test workspace for synthetic data. Sign-out is available.
2. **Dashboard:** Shows the single demo child profile, the next confirmed booking, and a direct path to the specialist directory. With no profile, it offers a clear creation action.
3. **Child profile:** Create or edit one profile with nickname, age band (`0–3`, `4–6`, `7–10`, or `11–17`), preferred language (`ru` or `kk`), and one support area. Support areas are speech and language, developmental education, neuropsychology, or adaptive physical activity. No free-text medical history or files are collected.
4. **Directory:** Browse seeded specialists and filter by specialty, session language, and availability. Fixtures include at least one specialist in each support area, both session languages, bookable future slots, and a specialist with no available slots. Profiles show a fictional name, role, languages, short sample description, and future slots. They do not show ratings, accreditation, prices, or state-insurance badges.
5. **Booking:** Select a future slot, review specialist, child profile, date, time, and time zone, then confirm. Confirmation is immediate. The dashboard and a booking detail view show the result. A booking can be cancelled until its start time, which makes its slot available again. Rescheduling means cancelling and making a new booking.

All dates are stored as UTC timestamps and displayed in `Asia/Almaty`, with the displayed time zone labeled; the offset is derived from the time-zone database rather than hardcoded. The RU/KK choice persists across pages. The shared account means all testers see the same profiles and bookings; the development seed/reset command restores test data when needed.

### States and recovery

- Loading states retain the layout with stable skeletons; they do not hide labels or actions.
- Empty profile, no matching specialists, and no available slots each have a specific next action.
- Invalid profile fields show inline errors beside labeled inputs.
- If a slot was taken by another tester, the second booking fails with a specific message and refreshes availability. It never creates a duplicate.
- A failed request leaves the form usable for retry. A repeated submit cannot create a second booking.
- An expired session returns to sign-in and then back to the requested demo page.

## Visual system

The app uses a calm, task-first layout: generous whitespace, an asymmetric but stable desktop grid, and a single-column mobile flow. Onest is the sole interface typeface, self-hosted with its OFL license; its upstream project documents Russian and Kazakh Cyrillic support. Avoid generic three-card marketing grids, stock medical imagery, emoji, and ornamental motion around forms. Major actions use a deep teal pill with a contained arrow icon; content surfaces use subtle nested edges only where separation helps scanning.

The chosen primary color is `#176B63`. The scale follows the color-palette skill's hue and saturation progression, with shade 800 adjusted to preserve the approved brand color:

| Shade | Hex | Shade | Hex |
| --- | --- | --- | --- |
| 50 | `#F3FBFB` | 100 | `#E8F8F6` |
| 200 | `#CCF0EC` | 300 | `#9AE5DD` |
| 400 | `#62DACE` | 500 | `#2BCABA` |
| 600 | `#24A89B` | 700 | `#1D8B80` |
| 800 | `#176B63` | 900 | `#12544E` |
| 950 | `#092A27` | | |

Light-mode semantic pairs: page `#F8F9F7` / text `#1E2927`; surface `#FFFFFF` / text `#1E2927`; primary `#176B63` / text `#FFFFFF`; muted surface `#F3FBFB` / text `#5E6E6A`; input outline `#6E8F88` / text `#1E2927`; error `#B42318` / text `#FFFFFF` when filled. Focus indicators use a visible teal outline with offset. Contrast checks on the main pairs: primary/white 6.33:1, body/page 14.19:1, muted/page 5.08:1, and outline/white 3.53:1. Check every final component pairing, including errors and disabled states, during implementation.

Dark-mode token mapping is reserved for later: page `#092A27` / text `#F3FBFB`, surface `#12544E` / text `#F3FBFB`, primary `#62DACE` / text `#092A27`. There is no dark-mode toggle in this release.

Motion serves orientation: short transform/opacity transitions for page panels, filter changes, and booking confirmation; tactile press feedback; no looping animations in the app. Honor `prefers-reduced-motion` by removing nonessential movement. The mobile layout uses single-column content and touch targets of at least 44 CSS pixels.

## Architecture and data flow

The existing repository becomes one Next.js application. The public landing page is a static route; `/demo/login`, `/demo`, `/demo/profile`, `/demo/specialists`, and `/demo/bookings/[id]` make up the protected journey. Demo pages use server-rendered data. Small client components handle filters, language switching, and motion. Server mutations validate input and verify the active Supabase session on every call; UI visibility alone never grants access. Secrets remain in Vercel environment variables and local ignored files.

Supabase tables:

| Table | Key fields and rule |
| --- | --- |
| `child_profiles` | `id`, `owner_id`, `nickname`, `age_band`, `preferred_language`, `support_area`, timestamps; unique `owner_id` enforces one profile per demo account |
| `specialists` | `id`, `display_name`, `role`, `languages`, `description`, `active`; seeded synthetic rows, authenticated read only |
| `slots` | `id`, `specialist_id`, `starts_at`, `ends_at`, `active`; seeded future rows, authenticated read only |
| `bookings` | `id`, `owner_id`, `child_profile_id`, `slot_id`, `status` (`confirmed`/`cancelled`), timestamps; one confirmed booking per slot |

The booking mutation accepts only profile and slot identifiers. It checks the session, ownership of the profile, the active future slot, and any existing reservation. A database transaction/function creates the booking; a partial unique index on `slot_id` for `status = 'confirmed'` prevents simultaneous requests from reserving the same slot. The database function runs with invoker privileges and checks the authenticated user; it does not bypass row-level security. Cancelling changes status and releases that uniqueness constraint. Row-level security confines profile and booking rows to the authenticated demo user; anonymous reads and writes are denied. Seeded directory rows are readable only after sign-in. Database migrations and fixture data are versioned in the repo.

The demo account is created outside source control. Public sign-up is disabled. No real child names, contact details, diagnoses, or documents should be entered or stored. Before any real-family pilot, the team must approve data residency, consent, retention, access boundaries, and specialist verification; this demo architecture does not assert those requirements are met.

## Verification and release

- Unit tests cover profile validation, language parity, time formatting, and filter logic.
- Integration tests cover authorized profile access, booking and cancellation, replayed submissions, and simultaneous attempts to reserve one slot.
- End-to-end tests cover sign-in → profile → filtered directory → booking → cancellation in both Russian and Kazakh at desktop and mobile sizes.
- Accessibility checks cover keyboard flow, focus, labels, empty/error states, text contrast, and reduced motion.
- Deploy to a Vercel preview, verify the public landing page and protected demo, then release to the existing production project. Do not migrate or display real health records during this release.

The slice is complete when the full journey works with persistent shared demo data, a slot cannot be double-booked, RU/KK content is complete, responsive layouts work, and automated checks pass.

## References

- [Next.js authentication and server-side authorization](https://nextjs.org/docs/app/guides/authentication)
- [Next.js forms and server actions](https://nextjs.org/docs/app/guides/forms)
- [Supabase Auth configuration](https://supabase.com/docs/guides/auth/general-configuration)
- [Supabase Next.js integration](https://supabase.com/docs/guides/auth/quickstarts/nextjs)
- [Onest upstream font and language coverage](https://github.com/simpals/onest)
- [W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum)
- [W3C reduced-motion guidance](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions)
