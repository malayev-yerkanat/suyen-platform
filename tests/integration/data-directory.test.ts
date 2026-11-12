// @vitest-environment node
import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { createTestDb, type TestDb } from '../helpers/test-db';

const holder = vi.hoisted(() => ({ pool: null as unknown }));
vi.mock('@/lib/db', () => ({
  requireAppPool: () => holder.pool,
  isDatabaseConfigured: () => true,
}));

import { getSpecialistById, getSpecialistDirectory } from '@/lib/data/specialists';

let test: TestDb;
beforeAll(async () => {
  test = await createTestDb();
  holder.pool = test.pool;
});
afterAll(() => test.close());

describe('specialist directory', () => {
  it('lists the seeded specialists across four support areas, including one with no times', async () => {
    const directory = await getSpecialistDirectory();

    expect(directory).toHaveLength(5);
    expect(new Set(directory.map((item) => item.supportArea)).size).toBe(4);
    expect(directory.some((item) => item.slots.length === 0)).toBe(true);
    expect(directory.every((item) => item.languages.length > 0)).toBe(true);
    // Ordered by name for a stable listing.
    const names = directory.map((item) => item.displayName);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'ru')));
  });

  it('exposes only future, active, unreserved times in start order', async () => {
    const [first] = await getSpecialistDirectory();
    const target = (await getSpecialistDirectory()).find((item) => item.slots.length >= 3)!;
    const [slotA, slotB] = target.slots;
    expect(first).toBeDefined();

    await test.pool.query('update public.slots set reserved = true where id = $1', [slotA.id]);
    await test.pool.query('update public.slots set active = false where id = $1', [slotB.id]);
    await test.pool.query(
      `insert into public.slots (id, specialist_id, starts_at, ends_at)
       values ($1, $2, now() - interval '2 hours', now() - interval '1 hour')`,
      [randomUUID(), target.id],
    );

    const refreshed = (await getSpecialistById(target.id))!;
    const ids = refreshed.slots.map((slot) => slot.id);
    expect(ids).not.toContain(slotA.id);
    expect(ids).not.toContain(slotB.id);
    const starts = refreshed.slots.map((slot) => Date.parse(slot.startsAt));
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
    expect(starts.every((start) => start > Date.now())).toBe(true);
    // Times come back as ISO-8601 strings with an explicit offset.
    expect(refreshed.slots[0].startsAt).toMatch(/Z$/);
  });

  it('rejects malformed identifiers without querying the database', async () => {
    const spy = vi.spyOn(test.pool, 'query');
    try {
      expect(await getSpecialistById('not-a-uuid')).toBeNull();
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it('returns null for missing and inactive specialists', async () => {
    expect(await getSpecialistById(randomUUID())).toBeNull();
    const [anyone] = await getSpecialistDirectory();
    await test.pool.query('update public.specialists set active = false where id = $1', [anyone.id]);
    try {
      expect(await getSpecialistById(anyone.id)).toBeNull();
      expect((await getSpecialistDirectory()).map((item) => item.id)).not.toContain(anyone.id);
    } finally {
      await test.pool.query('update public.specialists set active = true where id = $1', [anyone.id]);
    }
  });

  it('fails with a generic message when the database is unavailable', async () => {
    const spy = vi.spyOn(test.pool, 'query').mockRejectedValue(new Error('private details'));
    try {
      await expect(getSpecialistDirectory()).rejects.toThrow('Directory is unavailable');
    } finally {
      spy.mockRestore();
    }
  });
});

describe('seed', () => {
  it('is safe to run twice and never moves an existing reservation', async () => {
    const { readFileSync } = await import('node:fs');
    const { rows: [slot] } = await test.pool.query(
      'select id from public.slots where active and not reserved and starts_at > now() limit 1',
    );
    await test.pool.query('update public.slots set reserved = true where id = $1', [slot.id]);
    const before = await test.pool.query('select count(*)::int as n from public.slots');

    await test.db.exec(readFileSync('db/seed.sql', 'utf8'));

    const after = await test.pool.query('select count(*)::int as n from public.slots');
    const { rows: [kept] } = await test.pool.query('select reserved from public.slots where id = $1', [slot.id]);
    expect(after.rows[0].n).toBe(before.rows[0].n);
    expect(kept.reserved).toBe(true);
  });
});
