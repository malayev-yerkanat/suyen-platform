-- Synthetic directory fixture for the internal Süyen demo.
-- Safe to rerun: existing specialists and slots (including booked ones) do not move.
-- Run with the Supabase migration owner, not from the browser application.
-- To reset an isolated demo project, delete bookings, clear slots.reserved,
-- and delete child_profiles in one transaction, then rerun this file. Do not
-- delete bookings alone: that would leave the availability flags set.

insert into public.specialists (
  id, display_name, role, role_kk, support_area, languages,
  description, description_kk
) values
  (
    '11111111-1111-4111-8111-111111111101',
    'Айша Арманова', 'Логопед', 'Логопед', 'speech_language',
    array['ru', 'kk'],
    'Демонстрационный специалист по развитию речи и языка.',
    'Сөйлеу және тіл дамыту бойынша демонстрациялық маман.'
  ),
  (
    '11111111-1111-4111-8111-111111111102',
    'Дана Болатова', 'Педагог развития', 'Дамыту педагогі',
    'developmental_education', array['kk', 'ru'],
    'Демонстрационный специалист по занятиям для развития навыков.',
    'Дағдыларды дамыту сабақтары бойынша демонстрациялық маман.'
  ),
  (
    '11111111-1111-4111-8111-111111111103',
    'Мира Сагинова', 'Нейропсихолог', 'Нейропсихолог',
    'neuropsychology', array['ru'],
    'Демонстрационный специалист по познавательным навыкам.',
    'Танымдық дағдылар бойынша демонстрациялық маман.'
  ),
  (
    '11111111-1111-4111-8111-111111111104',
    'Самал Ермекова', 'Специалист по адаптивной физической активности',
    'Бейімделген дене белсенділігі маманы',
    'adaptive_physical_activity', array['kk', 'ru'],
    'Демонстрационный специалист по адаптивной двигательной активности.',
    'Бейімделген қозғалыс белсенділігі бойынша демонстрациялық маман.'
  ),
  (
    '11111111-1111-4111-8111-111111111105',
    'Нурай Касымова', 'Логопед', 'Логопед', 'speech_language',
    array['kk'],
    'Демонстрационный специалист без доступных сеансов.',
    'Қолжетімді сеанстары жоқ демонстрациялық маман.'
  )
on conflict (id) do nothing;

-- UUIDs derive from specialist + Almaty calendar date + local hour. Each day's
-- seed adds seven days ahead without changing an existing appointment.
with future_slots as (
  select
    md5(specialist_id::text || ':' || local_day::text || ':' || session_hour::text)::uuid as id,
    specialist_id,
    (local_day + make_time(session_hour, 0, 0)) at time zone 'Asia/Almaty' as starts_at
  from (
    values
      ('11111111-1111-4111-8111-111111111101'::uuid),
      ('11111111-1111-4111-8111-111111111102'::uuid),
      ('11111111-1111-4111-8111-111111111103'::uuid),
      ('11111111-1111-4111-8111-111111111104'::uuid)
  ) as specialists(specialist_id)
  cross join lateral (
    select ((now() at time zone 'Asia/Almaty')::date + day_offset) as local_day
    from generate_series(1, 7) as days(day_offset)
  ) as dates
  cross join (values (10), (14)) as hours(session_hour)
)
insert into public.slots (id, specialist_id, starts_at, ends_at)
select id, specialist_id, starts_at, starts_at + interval '50 minutes'
from future_slots
on conflict do nothing;
