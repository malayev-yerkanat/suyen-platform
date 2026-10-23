import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { ProfileInput } from '@/lib/validation/profile';

export type ChildProfile = ProfileInput & { id: string };

type ProfileRow = {
  id: string;
  nickname: string;
  age_band: ProfileInput['ageBand'];
  preferred_language: ProfileInput['preferredLanguage'];
  support_area: ProfileInput['supportArea'];
};

const profileColumns = 'id,nickname,age_band,preferred_language,support_area';

function fromRow(row: ProfileRow): ChildProfile {
  return {
    id: row.id,
    nickname: row.nickname,
    ageBand: row.age_band,
    preferredLanguage: row.preferred_language,
    supportArea: row.support_area,
  };
}

function profilePayload(input: ProfileInput) {
  return {
    nickname: input.nickname,
    age_band: input.ageBand,
    preferred_language: input.preferredLanguage,
    support_area: input.supportArea,
  };
}

export async function getProfileForUser(ownerId: string): Promise<ChildProfile | null> {
  const client = await createServerSupabaseClient();
  if (!client) throw new Error('Supabase is not configured');

  const { data, error } = await client.from('child_profiles')
    .select(profileColumns).eq('owner_id', ownerId).maybeSingle();
  if (error) throw error;
  return data ? fromRow(data as ProfileRow) : null;
}

export async function saveProfileForUser(ownerId: string, input: ProfileInput): Promise<ChildProfile> {
  const client = await createServerSupabaseClient();
  if (!client) throw new Error('Supabase is not configured');

  const { data: existing, error: readError } = await client.from('child_profiles')
    .select('id').eq('owner_id', ownerId).maybeSingle();
  if (readError) throw readError;

  if (existing) {
    const { data, error } = await client.from('child_profiles')
      .update(profilePayload(input)).eq('id', existing.id).eq('owner_id', ownerId)
      .select(profileColumns).single();
    if (error) throw error;
    return fromRow(data as ProfileRow);
  }

  const { data, error } = await client.from('child_profiles')
    .insert({ owner_id: ownerId, ...profilePayload(input) })
    .select(profileColumns).single();
  if (!error) return fromRow(data as ProfileRow);

  // Two teammates may create the shared account's only profile at once.
  if (error.code !== '23505') throw error;
  const { data: raced, error: racedReadError } = await client.from('child_profiles')
    .select('id').eq('owner_id', ownerId).single();
  if (racedReadError) throw racedReadError;
  const { data: updated, error: updateError } = await client.from('child_profiles')
    .update(profilePayload(input)).eq('id', raced.id).eq('owner_id', ownerId)
    .select(profileColumns).single();
  if (updateError) throw updateError;
  return fromRow(updated as ProfileRow);
}
