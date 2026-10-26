begin;

-- Structured, synthetic demo evaluation only; submissions are not unique families.
create table public.demo_feedback (
  owner_id uuid not null references auth.users(id) on delete cascade,
  submission_id uuid not null,
  entry_point text not null check (entry_point in ('dashboard', 'confirmation', 'cancellation')),
  outcome text not null check (outcome in ('yes', 'partially', 'no')),
  ease smallint not null check (ease between 1 and 5),
  difficulty text not null check (difficulty in ('finding_specialist', 'choosing_time', 'booking', 'cancellation', 'language_navigation', 'none')),
  created_at timestamptz not null default now(),
  primary key (owner_id, submission_id)
);
alter table public.demo_feedback enable row level security;
revoke all on public.demo_feedback from anon, authenticated;
grant select on public.demo_feedback to authenticated;
grant insert (owner_id, submission_id, entry_point, outcome, ease, difficulty)
  on public.demo_feedback to authenticated;
create policy demo_feedback_select_own on public.demo_feedback
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy demo_feedback_insert_own on public.demo_feedback
  for insert to authenticated with check ((select auth.uid()) = owner_id);
-- No UPDATE or DELETE privilege/policy: a retry cannot overwrite an earlier answer.

commit;
