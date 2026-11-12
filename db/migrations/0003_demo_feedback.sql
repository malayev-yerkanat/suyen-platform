-- Structured, synthetic demo evaluation only; submissions are not unique families.
create table public.demo_feedback (
  owner_id uuid not null references public."user" (id) on delete cascade,
  submission_id uuid not null,
  entry_point text not null check (entry_point in ('dashboard', 'confirmation', 'cancellation')),
  outcome text not null check (outcome in ('yes', 'partially', 'no')),
  ease smallint not null check (ease between 1 and 5),
  difficulty text not null check (difficulty in ('finding_specialist', 'choosing_time', 'booking', 'cancellation', 'language_navigation', 'none')),
  created_at timestamptz not null default now(),
  primary key (owner_id, submission_id)
);

-- Answers are immutable: a retry cannot overwrite an earlier submission. Deletes
-- stay possible so removing a user still cascades.
create function public.forbid_feedback_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'feedback_immutable' using errcode = 'P0001';
end;
$$;

create trigger demo_feedback_no_update
  before update on public.demo_feedback
  for each row execute function public.forbid_feedback_update();
