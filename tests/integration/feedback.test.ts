import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), client: vi.fn() }));
vi.mock('@/lib/auth', () => ({ requireDemoUser: mocks.auth }));
vi.mock('@/lib/supabase/server', () => ({ createServerSupabaseClient: mocks.client }));
import { saveFeedbackAction, type FeedbackActionState } from '@/app/demo/feedback/actions';
import { saveFeedbackForUser } from '@/lib/data/feedback';
const values = { submissionId: '13c9cf98-242f-4a76-aa03-548717583a10', entryPoint: 'dashboard', outcome: 'yes', ease: '5', difficulty: 'none' };
const idle: FeedbackActionState = { status: 'idle', values };
function form(change: Record<string, string> = {}) {
  const data = new FormData();
  Object.entries({ ...values, ...change }).forEach(([key, value]) => data.set(key, value));
  return data;
}
function db(error: { code: string } | null = null, existing: unknown = { submission_id: values.submissionId, entry_point: 'dashboard', outcome: 'yes', ease: 5, difficulty: 'none' }, readError: unknown = null) {
  const chain = { insert: vi.fn(async () => ({ error })), select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(async () => ({ data: existing, error: readError })) };
  chain.select.mockReturnValue(chain); chain.eq.mockReturnValue(chain);
  mocks.client.mockResolvedValue({ from: vi.fn(() => chain) });
  return chain;
}
describe('feedback action and persistence', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.auth.mockResolvedValue({ id: 'session-owner' }); });
  it('uses session owner and saves only validated structured fields', async () => {
    const chain = db();
    expect((await saveFeedbackAction(idle, form({ ownerId: 'attacker', comment: 'private' }))).status).toBe('success');
    expect(chain.insert).toHaveBeenCalledWith({ owner_id: 'session-owner', submission_id: values.submissionId, entry_point: 'dashboard', outcome: 'yes', ease: 5, difficulty: 'none' });
  });
  it('does not save invalid fields', async () => {
    const chain = db();
    expect((await saveFeedbackAction(idle, form({ ease: '0' }))).status).toBe('invalid');
    expect(chain.insert).not.toHaveBeenCalled();
  });
  it('requires authentication before accessing data', async () => {
    mocks.auth.mockRejectedValueOnce(new Error('redirect'));
    await expect(saveFeedbackAction(idle, form())).rejects.toThrow('redirect');
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it('returns safe failure with the same identity and answers for retry', async () => {
    db({ code: 'network' });
    expect(await saveFeedbackAction(idle, form())).toEqual({ status: 'error', values });
  });
  it('treats a repeated identity as success only after an owner-scoped lookup', async () => {
    const chain = db({ code: '23505' });
    expect((await saveFeedbackAction(idle, form())).status).toBe('success');
    expect(chain.eq).toHaveBeenCalledWith('owner_id', 'session-owner');
    expect(chain.eq).toHaveBeenCalledWith('submission_id', values.submissionId);
  });
  it('reports conflict when a lost-response retry changes the original answers', async () => {
    db({ code: '23505' });
    expect((await saveFeedbackAction(idle, form({ ease: '2' }))).status).toBe('conflict');
  });
  it.each([['missing', null, null], ['failed', null, { code: 'denied' }]])('rejects %s duplicate read', async (_name, data, error) => {
    db({ code: '23505' }, data, error);
    expect((await saveFeedbackAction(idle, form())).status).toBe('error');
  });
  it('fails safely when database is unconfigured', async () => {
    mocks.client.mockResolvedValue(null);
    await expect(saveFeedbackForUser('owner', { ...values, entryPoint: 'dashboard', outcome: 'yes', difficulty: 'none', ease: 5 })).rejects.toThrow('not configured');
  });
});
