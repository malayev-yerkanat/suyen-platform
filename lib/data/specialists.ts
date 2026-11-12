import 'server-only';

import { z } from 'zod';

import { requireAppPool } from '@/lib/db';
import { SUPPORT_AREAS, type DirectorySpecialist, type DirectorySlot } from '@/lib/filters';

const specialistRow = z.object({
  id: z.guid(),
  display_name: z.string().min(1),
  role: z.string().min(1),
  role_kk: z.string().min(1),
  support_area: z.enum(SUPPORT_AREAS),
  languages: z.array(z.enum(['ru', 'kk'])).min(1),
  description: z.string().min(1),
  description_kk: z.string().min(1),
});

const slotRow = z.object({
  id: z.guid(),
  specialist_id: z.guid(),
  starts_at: z.string().refine((value) => !Number.isNaN(Date.parse(value))),
  ends_at: z.string().refine((value) => !Number.isNaN(Date.parse(value))),
}).refine((slot) => Date.parse(slot.ends_at) > Date.parse(slot.starts_at));

/** Fetch only public-facing fixture fields. Callers must be signed in. */
export async function getSpecialistDirectory(): Promise<DirectorySpecialist[]> {
  return fetchSpecialists();
}

/** Invalid, missing and inactive profiles are not exposed. */
export async function getSpecialistById(id: string): Promise<DirectorySpecialist | null> {
  if (!z.guid().safeParse(id).success) return null;
  return (await fetchSpecialists(id))[0] ?? null;
}

async function fetchSpecialists(id?: string): Promise<DirectorySpecialist[]> {
  const pool = requireAppPool();
  const filter = id ? [id] : [];

  let specialistRows: unknown[];
  let slotRows: unknown[];
  try {
    [{ rows: specialistRows }, { rows: slotRows }] = await Promise.all([
      pool.query(
        `select id, display_name, role, role_kk, support_area, languages, description, description_kk
         from public.specialists
         where active ${id ? 'and id = $1' : ''}
         order by display_name`,
        filter,
      ),
      pool.query(
        `select id, specialist_id, starts_at, ends_at
         from public.slots
         where active and not reserved and starts_at > now() ${id ? 'and specialist_id = $1' : ''}
         order by starts_at`,
        filter,
      ),
    ]);
  } catch {
    throw new Error('Directory is unavailable');
  }

  const specialists = specialistRow.array().parse(specialistRows);
  const slots = slotRow.array().parse(slotRows);
  const slotsBySpecialist = slots.reduce<Record<string, DirectorySlot[]>>((groups, slot) => ({
    ...groups,
    [slot.specialist_id]: [
      ...(groups[slot.specialist_id] ?? []),
      { id: slot.id, startsAt: slot.starts_at, endsAt: slot.ends_at },
    ],
  }), {});

  return specialists.map((specialist) => ({
    id: specialist.id,
    displayName: specialist.display_name,
    role: specialist.role,
    roleKk: specialist.role_kk,
    supportArea: specialist.support_area,
    languages: specialist.languages,
    description: specialist.description,
    descriptionKk: specialist.description_kk,
    slots: slotsBySpecialist[specialist.id] ?? [],
  }));
}
