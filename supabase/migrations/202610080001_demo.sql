-- Süyen internal demo. All people and appointments in this project are synthetic.
-- Apply as the Supabase migration owner (postgres), never as a browser role.

create type public.support_area as enum (
  'speech_language',
  'developmental_education',
  'neuropsychology',
  'adaptive_physical_activity'
);

create type public.age_band as enum ('0_3', '4_6', '7_10', '11_17');
create type public.booking_status as enum ('confirmed', 'cancelled');

create table public.child_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  nickname text not null check (char_length(btrim(nickname)) between 1 and 60),
  age_band public.age_band not null,
  preferred_language text not null check (preferred_language in ('ru', 'kk')),
  support_area public.support_area not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint child_profiles_one_per_owner unique (owner_id)
);

create table public.specialists (
  id uuid primary key,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 120),
  role text not null check (char_length(btrim(role)) between 1 and 120),
  role_kk text not null check (char_length(btrim(role_kk)) between 1 and 120),
  support_area public.support_area not null,
  languages text[] not null check (
    cardinality(languages) > 0
    and languages <@ array['ru', 'kk']::text[]
  ),
  description text not null check (char_length(btrim(description)) between 1 and 500),
  description_kk text not null check (char_length(btrim(description_kk)) between 1 and 500),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.slots (
  id uuid primary key,
  specialist_id uuid not null references public.specialists (id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  active boolean not null default true,
  reserved boolean not null default false,
  created_at timestamptz not null default now(),
  constraint slots_positive_duration check (starts_at < ends_at),
  constraint slots_one_start_per_specialist unique (specialist_id, starts_at)
);

create index slots_available_by_start_idx
  on public.slots (starts_at, specialist_id)
  where active and not reserved;

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  child_profile_id uuid not null references public.child_profiles (id),
  slot_id uuid not null references public.slots (id),
  status public.booking_status not null default 'confirmed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index bookings_one_confirmed_per_slot_idx
  on public.bookings (slot_id) where status = 'confirmed';

create index bookings_owner_status_idx
  on public.bookings (owner_id, status, created_at desc);

-- The browser roles cannot edit directory data or the denormalized availability bit.
revoke all on public.child_profiles, public.specialists, public.slots,
  public.bookings from public, anon, authenticated;
grant select on public.child_profiles, public.specialists, public.slots,
  public.bookings to authenticated;
grant insert (owner_id, nickname, age_band, preferred_language, support_area)
  on public.child_profiles to authenticated;
grant update (nickname, age_band, preferred_language, support_area)
  on public.child_profiles to authenticated;
grant insert (owner_id, child_profile_id, slot_id, status)
  on public.bookings to authenticated;
grant update (status) on public.bookings to authenticated;

alter table public.child_profiles enable row level security;
alter table public.specialists enable row level security;
alter table public.slots enable row level security;
alter table public.bookings enable row level security;

create policy child_profiles_select_own on public.child_profiles
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy child_profiles_insert_own on public.child_profiles
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy child_profiles_update_own on public.child_profiles
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy specialists_read_signed_in on public.specialists
  for select to authenticated using ((select auth.uid()) is not null);
create policy slots_read_signed_in on public.slots
  for select to authenticated using ((select auth.uid()) is not null);

create policy bookings_select_own on public.bookings
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy bookings_insert_own on public.bookings
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy bookings_update_own on public.bookings
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create function public.touch_child_profile()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger child_profiles_before_update
  before update on public.child_profiles
  for each row execute function public.touch_child_profile();

-- Fixed search path, explicit ownership checks, and row locks are necessary here:
-- these narrowly scoped trigger functions may edit slots, while browser roles may not.
create function public.enforce_booking_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  target_slot public.slots%rowtype;
begin
  if actor is null or new.owner_id is distinct from actor then
    raise exception 'auth_required' using errcode = 'P0001';
  end if;
  if new.status is distinct from 'confirmed'::public.booking_status then
    raise exception 'invalid_booking' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.child_profiles profile
    where profile.id = new.child_profile_id and profile.owner_id = actor
  ) then
    raise exception 'profile_not_found' using errcode = 'P0001';
  end if;

  select slot.* into target_slot
  from public.slots slot
  join public.specialists specialist on specialist.id = slot.specialist_id
  where slot.id = new.slot_id and specialist.active
  for update of slot;

  if not found or not target_slot.active or target_slot.reserved
     or target_slot.starts_at <= clock_timestamp() then
    raise exception 'slot_conflict' using errcode = 'P0001';
  end if;

  update public.slots set reserved = true where id = new.slot_id;
  return new;
end;
$$;

create trigger bookings_before_insert
  before insert on public.bookings
  for each row execute function public.enforce_booking_insert();

create function public.enforce_booking_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  target_slot public.slots%rowtype;
begin
  if actor is null or old.owner_id is distinct from actor
     or new.owner_id is distinct from actor then
    raise exception 'auth_required' using errcode = 'P0001';
  end if;
  if new.id is distinct from old.id
     or new.child_profile_id is distinct from old.child_profile_id
     or new.slot_id is distinct from old.slot_id
     or new.created_at is distinct from old.created_at
     or old.status is distinct from 'confirmed'::public.booking_status
     or new.status is distinct from 'cancelled'::public.booking_status then
    raise exception 'invalid_booking_change' using errcode = 'P0001';
  end if;

  select * into target_slot from public.slots
  where id = old.slot_id for update;
  if not found or target_slot.starts_at <= clock_timestamp() then
    raise exception 'cannot_cancel' using errcode = 'P0001';
  end if;

  update public.slots set reserved = false where id = old.slot_id;
  new.updated_at := now();
  return new;
end;
$$;

create trigger bookings_before_update
  before update on public.bookings
  for each row execute function public.enforce_booking_update();

-- Repeated submits return the original confirmation. A competing account sees a
-- stable slot_conflict error; the partial unique index is the final race guard.
create function public.reserve_slot(profile_id uuid, slot_id uuid)
returns public.bookings
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  existing public.bookings%rowtype;
  created public.bookings%rowtype;
begin
  if actor is null then
    raise exception 'auth_required' using errcode = 'P0001';
  end if;
  if profile_id is null or slot_id is null then
    raise exception 'invalid_booking' using errcode = 'P0001';
  end if;
  select * into existing from public.bookings
  where owner_id = actor and child_profile_id = profile_id
    and bookings.slot_id = reserve_slot.slot_id and status = 'confirmed';
  if found then
    return existing;
  end if;

  begin
    insert into public.bookings (owner_id, child_profile_id, slot_id, status)
    values (actor, profile_id, slot_id, 'confirmed') returning * into created;
    return created;
  exception
    when unique_violation or sqlstate 'P0001' then
      -- A concurrent replay can have committed while the insert waited on its
      -- slot lock. Read it after the wait; do not manufacture another booking.
      select * into existing from public.bookings
      where owner_id = actor and child_profile_id = profile_id
        and bookings.slot_id = reserve_slot.slot_id and status = 'confirmed';
      if found then
        return existing;
      end if;
      if sqlerrm = 'slot_conflict' or sqlstate = '23505' then
        raise exception 'slot_conflict' using errcode = 'P0001';
      end if;
      raise;
  end;
end;
$$;

create function public.cancel_booking(booking_id uuid)
returns public.bookings
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  existing public.bookings%rowtype;
  cancelled public.bookings%rowtype;
begin
  if actor is null then
    raise exception 'auth_required' using errcode = 'P0001';
  end if;
  if booking_id is null then
    raise exception 'booking_not_found' using errcode = 'P0001';
  end if;
  select * into existing from public.bookings
  where id = booking_id and owner_id = actor;
  if not found then
    raise exception 'booking_not_found' using errcode = 'P0001';
  end if;
  if existing.status = 'cancelled' then
    return existing;
  end if;

  update public.bookings set status = 'cancelled'
  where id = booking_id and owner_id = actor and status = 'confirmed'
  returning * into cancelled;
  if found then
    return cancelled;
  end if;

  select * into existing from public.bookings
  where id = booking_id and owner_id = actor and status = 'cancelled';
  if found then
    return existing;
  end if;
  raise exception 'cannot_cancel' using errcode = 'P0001';
end;
$$;

revoke all on function public.enforce_booking_insert() from public, anon, authenticated;
revoke all on function public.enforce_booking_update() from public, anon, authenticated;
revoke all on function public.touch_child_profile() from public, anon, authenticated;
revoke all on function public.reserve_slot(uuid, uuid) from public, anon, authenticated;
revoke all on function public.cancel_booking(uuid) from public, anon, authenticated;
grant execute on function public.reserve_slot(uuid, uuid) to authenticated;
grant execute on function public.cancel_booking(uuid) to authenticated;
