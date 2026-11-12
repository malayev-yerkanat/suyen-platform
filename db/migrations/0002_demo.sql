-- Süyen internal demo. All people and appointments in this project are synthetic.
-- Plain PostgreSQL (Neon). There is no row-level security: the browser never talks
-- to the database. Every query runs on the server, scoped to the signed-in user's
-- id, and the booking rules live in reserve_slot() and cancel_booking() below.
-- Apply with `npm run db:migrate`, never from application code.

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
  owner_id uuid not null references public."user" (id) on delete cascade,
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
  owner_id uuid not null references public."user" (id) on delete cascade,
  child_profile_id uuid not null references public.child_profiles (id),
  slot_id uuid not null references public.slots (id),
  status public.booking_status not null default 'confirmed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Final race guard: a slot can have only one confirmed booking.
create unique index bookings_one_confirmed_per_slot_idx
  on public.bookings (slot_id) where status = 'confirmed';

create index bookings_owner_status_idx
  on public.bookings (owner_id, status, created_at desc);

-- Repeated submits return the original confirmation. A competing account sees a
-- stable slot_conflict error. The slot row is locked before anything is decided,
-- and the replay check runs again after the lock, so a concurrent identical
-- request that committed while this one waited is returned instead of duplicated.
create function public.reserve_slot(p_actor uuid, p_profile_id uuid, p_slot_id uuid)
returns public.bookings
language plpgsql
set search_path = ''
as $$
declare
  existing public.bookings%rowtype;
  target_slot public.slots%rowtype;
  created public.bookings%rowtype;
begin
  if p_actor is null then
    raise exception 'auth_required' using errcode = 'P0001';
  end if;
  if p_profile_id is null or p_slot_id is null then
    raise exception 'invalid_booking' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.child_profiles profile
    where profile.id = p_profile_id and profile.owner_id = p_actor
  ) then
    raise exception 'profile_not_found' using errcode = 'P0001';
  end if;

  select slot.* into target_slot
  from public.slots slot
  join public.specialists specialist on specialist.id = slot.specialist_id
  where slot.id = p_slot_id and specialist.active
  for update of slot;
  if not found then
    raise exception 'slot_conflict' using errcode = 'P0001';
  end if;

  select * into existing from public.bookings booking
  where booking.owner_id = p_actor and booking.child_profile_id = p_profile_id
    and booking.slot_id = p_slot_id and booking.status = 'confirmed';
  if found then
    return existing;
  end if;

  if not target_slot.active or target_slot.reserved
     or target_slot.starts_at <= clock_timestamp() then
    raise exception 'slot_conflict' using errcode = 'P0001';
  end if;

  update public.slots set reserved = true where id = p_slot_id;
  insert into public.bookings (owner_id, child_profile_id, slot_id, status)
  values (p_actor, p_profile_id, p_slot_id, 'confirmed')
  returning * into created;
  return created;
exception
  when unique_violation then
    raise exception 'slot_conflict' using errcode = 'P0001';
end;
$$;

-- Cancelling is idempotent: an already cancelled booking is returned unchanged.
-- A booking whose slot has already started cannot be cancelled.
create function public.cancel_booking(p_actor uuid, p_booking_id uuid)
returns public.bookings
language plpgsql
set search_path = ''
as $$
declare
  existing public.bookings%rowtype;
  target_slot public.slots%rowtype;
  cancelled public.bookings%rowtype;
begin
  if p_actor is null then
    raise exception 'auth_required' using errcode = 'P0001';
  end if;
  if p_booking_id is null then
    raise exception 'booking_not_found' using errcode = 'P0001';
  end if;

  select * into existing from public.bookings
  where id = p_booking_id and owner_id = p_actor;
  if not found then
    raise exception 'booking_not_found' using errcode = 'P0001';
  end if;

  select * into target_slot from public.slots
  where id = existing.slot_id for update;

  -- Re-read under the slot lock: a concurrent cancel may have finished meanwhile.
  select * into existing from public.bookings
  where id = p_booking_id and owner_id = p_actor for update;
  if existing.status = 'cancelled' then
    return existing;
  end if;
  if target_slot.starts_at <= clock_timestamp() then
    raise exception 'cannot_cancel' using errcode = 'P0001';
  end if;

  update public.bookings set status = 'cancelled', updated_at = now()
  where id = p_booking_id
  returning * into cancelled;
  update public.slots set reserved = false where id = existing.slot_id;
  return cancelled;
end;
$$;
