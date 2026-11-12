// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { createTestDb, type TestDb } from '../helpers/test-db';

const holder = vi.hoisted(() => ({ pool: null as unknown }));
vi.mock('@/lib/db', () => ({
  requireAppPool: () => holder.pool,
  isDatabaseConfigured: () => true,
}));

import { getProfileForUser, saveProfileForUser } from '@/lib/data/profile';

const input = {
  nickname: 'Алия', ageBand: '4_6' as const,
  preferredLanguage: 'kk' as const, supportArea: 'speech_language' as const,
};

let test: TestDb;
beforeAll(async () => {
  test = await createTestDb();
  holder.pool = test.pool;
});
afterAll(() => test.close());

describe('profile storage', () => {
  it('returns null before a profile exists', async () => {
    expect(await getProfileForUser(await test.createUser('new@example.invalid'))).toBeNull();
  });

  it('creates the first profile, then edits that same row', async () => {
    const owner = await test.createUser('edit@example.invalid');
    const created = await saveProfileForUser(owner, input);
    const edited = await saveProfileForUser(owner, { ...input, nickname: 'Самат', ageBand: '7_10' });

    expect(created).toEqual({ id: expect.any(String), ...input });
    expect(edited).toMatchObject({ id: created.id, nickname: 'Самат', ageBand: '7_10' });
    expect(await getProfileForUser(owner)).toEqual(edited);
    const { rows } = await test.pool.query(
      'select count(*)::int as n from public.child_profiles where owner_id = $1', [owner],
    );
    expect(rows[0].n).toBe(1);
  });

  it('moves updated_at forward on edit but never changes created_at', async () => {
    const owner = await test.createUser('times@example.invalid');
    await saveProfileForUser(owner, input);
    await test.pool.query(
      "update public.child_profiles set updated_at = now() - interval '1 day' where owner_id = $1", [owner],
    );
    const before = (await test.pool.query(
      'select created_at, updated_at from public.child_profiles where owner_id = $1', [owner],
    )).rows[0];

    await saveProfileForUser(owner, { ...input, nickname: 'Дана' });

    const after = (await test.pool.query(
      'select created_at, updated_at from public.child_profiles where owner_id = $1', [owner],
    )).rows[0];
    expect(after.created_at).toBe(before.created_at);
    expect(Date.parse(after.updated_at)).toBeGreaterThan(Date.parse(before.updated_at));
  });

  it('settles two simultaneous first saves into a single profile', async () => {
    const owner = await test.createUser('race@example.invalid');
    const [a, b] = await Promise.all([
      saveProfileForUser(owner, input),
      saveProfileForUser(owner, { ...input, nickname: 'Самат' }),
    ]);

    expect(a.id).toBe(b.id);
    const { rows } = await test.pool.query(
      'select count(*)::int as n from public.child_profiles where owner_id = $1', [owner],
    );
    expect(rows[0].n).toBe(1);
  });

  it('keeps accounts separate', async () => {
    const one = await test.createUser('one@example.invalid');
    const two = await test.createUser('two@example.invalid');
    await saveProfileForUser(one, input);

    expect(await getProfileForUser(two)).toBeNull();
  });

  it('enforces the nickname length rule in the database too', async () => {
    const owner = await test.createUser('long@example.invalid');
    await expect(saveProfileForUser(owner, { ...input, nickname: 'x'.repeat(61) })).rejects.toThrow();
    await expect(saveProfileForUser(owner, { ...input, nickname: '   ' })).rejects.toThrow();
  });
});
