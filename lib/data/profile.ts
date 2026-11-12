import 'server-only';

import { requireAppPool } from '@/lib/db';
import type { ProfileInput } from '@/lib/validation/profile';

export type ChildProfile = ProfileInput & { id: string };

type ProfileRow = {
  id: string;
  nickname: string;
  age_band: ProfileInput['ageBand'];
  preferred_language: ProfileInput['preferredLanguage'];
  support_area: ProfileInput['supportArea'];
};

const profileColumns = 'id, nickname, age_band, preferred_language, support_area';

function fromRow(row: ProfileRow): ChildProfile {
  return {
    id: row.id,
    nickname: row.nickname,
    ageBand: row.age_band,
    preferredLanguage: row.preferred_language,
    supportArea: row.support_area,
  };
}

export async function getProfileForUser(ownerId: string): Promise<ChildProfile | null> {
  const { rows } = await requireAppPool().query<ProfileRow>(
    `select ${profileColumns} from public.child_profiles where owner_id = $1`,
    [ownerId],
  );
  return rows[0] ? fromRow(rows[0]) : null;
}

/**
 * One profile per account. The upsert on owner_id also settles the case where two
 * teammates create the shared account's only profile at the same moment.
 */
export async function saveProfileForUser(ownerId: string, input: ProfileInput): Promise<ChildProfile> {
  const { rows } = await requireAppPool().query<ProfileRow>(
    `insert into public.child_profiles
       (owner_id, nickname, age_band, preferred_language, support_area)
     values ($1, $2, $3, $4, $5)
     on conflict (owner_id) do update set
       nickname = excluded.nickname,
       age_band = excluded.age_band,
       preferred_language = excluded.preferred_language,
       support_area = excluded.support_area,
       updated_at = now()
     returning ${profileColumns}`,
    [ownerId, input.nickname, input.ageBand, input.preferredLanguage, input.supportArea],
  );
  return fromRow(rows[0]);
}
