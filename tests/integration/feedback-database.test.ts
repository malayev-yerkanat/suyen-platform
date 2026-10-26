// @vitest-environment node
import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { beforeAll, describe, expect, it } from 'vitest';

// Explicit opt-in: these immutable synthetic rows remain until the disposable DB is removed.
const env = process.env;
const configured = env.TEST_FEEDBACK_DISPOSABLE === '1' && Boolean(
  env.TEST_SUPABASE_URL && env.TEST_SUPABASE_PUBLISHABLE_KEY && env.TEST_DEMO_EMAIL
  && env.TEST_DEMO_PASSWORD && env.TEST_OTHER_EMAIL && env.TEST_OTHER_PASSWORD,
);
const client = () => createClient(env.TEST_SUPABASE_URL!, env.TEST_SUPABASE_PUBLISHABLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
describe.skipIf(!configured)('disposable feedback database contract', () => {
  let owner: SupabaseClient;
  let other: SupabaseClient;
  let ownerId: string;
  const submissionId = randomUUID();
  const payload = () => ({ owner_id: ownerId, submission_id: submissionId, entry_point: 'dashboard', outcome: 'yes', ease: 5, difficulty: 'none' });
  beforeAll(async () => {
    owner = client(); other = client();
    const first = await owner.auth.signInWithPassword({ email: env.TEST_DEMO_EMAIL!, password: env.TEST_DEMO_PASSWORD! });
    const second = await other.auth.signInWithPassword({ email: env.TEST_OTHER_EMAIL!, password: env.TEST_OTHER_PASSWORD! });
    expect(first.error).toBeNull(); expect(second.error).toBeNull();
    ownerId = first.data.user!.id;
    expect(second.data.user!.id).not.toBe(ownerId);
    expect((await owner.from('demo_feedback').insert(payload())).error).toBeNull();
  });
  it('allows only one row for concurrent retries', async () => {
    const raceSubmissionId = randomUUID();
    const racePayload = { ...payload(), submission_id: raceSubmissionId };
    const results = await Promise.all([
      owner.from('demo_feedback').insert(racePayload),
      owner.from('demo_feedback').insert(racePayload),
    ]);
    expect(results.filter((result) => result.error === null)).toHaveLength(1);
    expect(results.filter((result) => result.error?.code === '23505')).toHaveLength(1);
    const rows = await owner.from('demo_feedback').select('submission_id')
      .eq('owner_id', ownerId).eq('submission_id', raceSubmissionId);
    expect(rows.error).toBeNull();
    expect(rows.data).toHaveLength(1);
  });
  it('hides feedback and rejects forged ownership for another account', async () => {
    const read = await other.from('demo_feedback').select('submission_id').eq('submission_id', submissionId);
    expect(read.error).toBeNull(); expect(read.data).toEqual([]);
    expect((await other.from('demo_feedback').insert({ ...payload(), submission_id: randomUUID() })).error).not.toBeNull();
  });
  it('denies anonymous reads and writes', async () => {
    expect((await client().from('demo_feedback').select('submission_id')).error).not.toBeNull();
    expect((await client().from('demo_feedback').insert(payload())).error).not.toBeNull();
  });
  it('denies edits, deletion, invalid ratings, and forged timestamps', async () => {
    expect((await owner.from('demo_feedback').update({ ease: 1 }).eq('submission_id', submissionId)).error).not.toBeNull();
    expect((await owner.from('demo_feedback').delete().eq('submission_id', submissionId)).error).not.toBeNull();
    expect((await owner.from('demo_feedback').insert({ ...payload(), submission_id: randomUUID(), ease: 6 })).error).not.toBeNull();
    expect((await owner.from('demo_feedback').insert({ ...payload(), submission_id: randomUUID(), created_at: new Date().toISOString() })).error).not.toBeNull();
  });
});
