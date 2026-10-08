import 'server-only';

import { z } from 'zod';

import { SUPPORT_AREAS, type DirectorySpecialist, type DirectorySlot } from '@/lib/filters';
import { createServerSupabaseClient } from '@/lib/supabase/server';

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
});

/** Fetch only public-facing fixture fields; signed-in RLS still applies. */
export async function getSpecialistDirectory(): Promise<DirectorySpecialist[]> {
  const client = await createServerSupabaseClient();
  if (!client) throw new Error('Directory is unavailable');

  const [specialistResult, slotResult] = await Promise.all([
    client.from('specialists')
      .select('id,display_name,role,role_kk,support_area,languages,description,description_kk')
      .eq('active', true)
      .order('display_name'),
    client.from('slots')
      .select('id,specialist_id,starts_at,ends_at')
      .eq('active', true)
      .eq('reserved', false)
      .gt('starts_at', new Date().toISOString())
      .order('starts_at'),
  ]);

  if (specialistResult.error || slotResult.error) throw new Error('Directory is unavailable');

  const specialists = specialistRow.array().parse(specialistResult.data);
  const slots = slotRow.array().parse(slotResult.data);
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
