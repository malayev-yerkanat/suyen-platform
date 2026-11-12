import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), save: vi.fn() }));
vi.mock('@/lib/auth', () => ({ requireDemoUser: mocks.auth }));
vi.mock('@/lib/data/feedback', () => ({ saveFeedbackForUser: mocks.save }));
import { saveFeedbackAction, type FeedbackActionState } from '@/app/demo/feedback/actions';

// Storage behavior (idempotent retries, conflicts, immutability) is covered against a
// real database in data-feedback.test.ts. This file covers the action around it.
const values = { submissionId: '13c9cf98-242f-4a76-aa03-548717583a10', entryPoint: 'dashboard', outcome: 'yes', ease: '5', difficulty: 'none' };
const idle: FeedbackActionState = { status: 'idle', values };
function form(change: Record<string, string> = {}) {
  const data = new FormData();
  Object.entries({ ...values, ...change }).forEach(([key, value]) => data.set(key, value));
  return data;
}

describe('feedback action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ id: 'session-owner' });
    mocks.save.mockResolvedValue('saved');
  });

  it('uses the session owner and saves only validated structured fields', async () => {
    const result = await saveFeedbackAction(idle, form({ ownerId: 'attacker', comment: 'private' }));
    expect(result.status).toBe('success');
    expect(mocks.save).toHaveBeenCalledWith('session-owner', {
      submissionId: values.submissionId, entryPoint: 'dashboard', outcome: 'yes', ease: 5, difficulty: 'none',
    });
  });

  it('does not save invalid fields', async () => {
    expect((await saveFeedbackAction(idle, form({ ease: '0' }))).status).toBe('invalid');
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it('requires authentication before touching data', async () => {
    mocks.auth.mockRejectedValueOnce(new Error('redirect'));
    await expect(saveFeedbackAction(idle, form())).rejects.toThrow('redirect');
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it('returns a safe failure that keeps the same identity and answers for a retry', async () => {
    mocks.save.mockRejectedValueOnce(new Error('private database detail'));
    expect(await saveFeedbackAction(idle, form())).toEqual({ status: 'error', values });
  });

  it('reports a conflict when a lost-response retry changed the original answers', async () => {
    mocks.save.mockResolvedValueOnce('conflict');
    expect((await saveFeedbackAction(idle, form({ ease: '2' }))).status).toBe('conflict');
  });
});
