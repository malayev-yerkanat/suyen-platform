// @vitest-environment node
import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { createTestDb, type TestDb } from '../helpers/test-db';

const holder = vi.hoisted(() => ({ pool: null as unknown }));
vi.mock('@/lib/db', () => ({
  requireAppPool: () => holder.pool,
  isDatabaseConfigured: () => true,
}));

import { saveFeedbackForUser } from '@/lib/data/feedback';

let test: TestDb;
let owner: string;
let other: string;
beforeAll(async () => {
  test = await createTestDb();
  holder.pool = test.pool;
  owner = await test.createUser('owner@example.invalid');
  other = await test.createUser('other@example.invalid');
});
afterAll(() => test.close());

const answers = (overrides = {}) => ({
  submissionId: randomUUID(),
  entryPoint: 'dashboard' as const,
  outcome: 'yes' as const,
  ease: 5,
  difficulty: 'none' as const,
  ...overrides,
});

const countFor = async (submissionId: string) =>
  (await test.pool.query(
    'select count(*)::int as n from public.demo_feedback where submission_id = $1', [submissionId],
  )).rows[0].n as number;

describe('feedback storage', () => {
  it('stores a submission once, however many times the same answers are retried', async () => {
    const input = answers();
    const results = await Promise.all([
      saveFeedbackForUser(owner, input),
      saveFeedbackForUser(owner, input),
      saveFeedbackForUser(owner, input),
    ]);

    expect(results).toEqual(['saved', 'saved', 'saved']);
    expect(await countFor(input.submissionId)).toBe(1);
  });

  it('reports a conflict, without overwriting, when a retry carries different answers', async () => {
    const input = answers();
    expect(await saveFeedbackForUser(owner, input)).toBe('saved');
    expect(await saveFeedbackForUser(owner, { ...input, ease: 2 })).toBe('conflict');

    const { rows } = await test.pool.query(
      'select ease from public.demo_feedback where submission_id = $1', [input.submissionId],
    );
    expect(rows).toEqual([{ ease: 5 }]);
  });

  it('keeps accounts separate even for the same submission id', async () => {
    const input = answers();
    expect(await saveFeedbackForUser(owner, input)).toBe('saved');
    expect(await saveFeedbackForUser(other, { ...input, outcome: 'no' })).toBe('saved');
    expect(await countFor(input.submissionId)).toBe(2);
  });
});

describe('feedback table rules', () => {
  it('rejects edits to a stored answer', async () => {
    const input = answers();
    await saveFeedbackForUser(owner, input);
    await expect(test.pool.query(
      'update public.demo_feedback set ease = 1 where submission_id = $1', [input.submissionId],
    )).rejects.toThrow('feedback_immutable');
  });

  it('rejects out-of-range ratings and unknown choices', async () => {
    await expect(saveFeedbackForUser(owner, answers({ ease: 6 }))).rejects.toThrow();
    await expect(saveFeedbackForUser(owner, answers({ ease: 0 }))).rejects.toThrow();
    await expect(saveFeedbackForUser(owner, answers({ outcome: 'maybe' }))).rejects.toThrow();
    await expect(saveFeedbackForUser(owner, answers({ entryPoint: 'elsewhere' }))).rejects.toThrow();
  });

  it('rejects feedback for a user that does not exist', async () => {
    await expect(saveFeedbackForUser(randomUUID(), answers())).rejects.toThrow();
  });

  it('is removed together with its user', async () => {
    const leaving = await test.createUser('leaving@example.invalid');
    const input = answers();
    await saveFeedbackForUser(leaving, input);
    await test.pool.query('delete from "user" where id = $1', [leaving]);
    expect(await countFor(input.submissionId)).toBe(0);
  });
});
