import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireDemoUser: vi.fn(),
  saveProfileForUser: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ requireDemoUser: mocks.requireDemoUser }));
vi.mock('@/lib/data/profile', () => ({ saveProfileForUser: mocks.saveProfileForUser }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));

import { saveProfileAction, type ProfileActionState } from '@/app/demo/profile/actions';

const idle: ProfileActionState = {
  status: 'idle',
  values: { nickname: '', ageBand: '', preferredLanguage: '', supportArea: '' },
  errors: {},
};

function form(overrides: Record<string, string> = {}): FormData {
  const values = {
    nickname: '  Алия ',
    ageBand: '4_6',
    preferredLanguage: 'kk',
    supportArea: 'speech_language',
    ...overrides,
  };
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe('saveProfileAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireDemoUser.mockResolvedValue({ id: 'session-owner' });
    mocks.saveProfileForUser.mockResolvedValue({ id: 'same-row' });
  });

  it('uses session ownership and preserves one profile row across create and edit', async () => {
    const first = await saveProfileAction(idle, form());
    const second = await saveProfileAction(first, form({ nickname: 'Самат' }));

    expect(first.status).toBe('success');
    expect(second.status).toBe('success');
    expect(mocks.saveProfileForUser).toHaveBeenNthCalledWith(1, 'session-owner', {
      nickname: 'Алия', ageBand: '4_6', preferredLanguage: 'kk', supportArea: 'speech_language',
    });
    expect(mocks.saveProfileForUser).toHaveBeenNthCalledWith(2, 'session-owner', {
      nickname: 'Самат', ageBand: '4_6', preferredLanguage: 'kk', supportArea: 'speech_language',
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/demo');
  });

  it('rejects malformed input without writing and returns field errors', async () => {
    const result = await saveProfileAction(idle, form({ nickname: ' '.repeat(8), ageBand: 'unknown' }));
    expect(result.status).toBe('error');
    expect(result.values.nickname).toBe(' '.repeat(8));
    expect(result.errors.nickname).toBe('profile.error.nickname');
    expect(result.errors.ageBand).toBe('profile.error.ageBand');
    expect(mocks.saveProfileForUser).not.toHaveBeenCalled();
  });

  it('never accepts an owner ID from form data', async () => {
    const data = form();
    data.set('ownerId', 'other-user');
    await saveProfileAction(idle, data);
    expect(mocks.saveProfileForUser).toHaveBeenCalledWith('session-owner', expect.any(Object));
  });

  it('keeps form values and returns a generic error on storage failure', async () => {
    mocks.saveProfileForUser.mockRejectedValueOnce(new Error('sensitive database detail'));
    const result = await saveProfileAction(idle, form());
    expect(result.status).toBe('error');
    expect(result.formError).toBe('profile.error.generic');
    expect(result.values.nickname).toBe('  Алия ');
  });
});
