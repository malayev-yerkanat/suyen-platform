import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireDemoUser: vi.fn(),
  saveProfileForUser: vi.fn(),
  createServerSupabaseClient: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ requireDemoUser: mocks.requireDemoUser }));
vi.mock('@/lib/data/profile', () => ({ saveProfileForUser: mocks.saveProfileForUser }));
vi.mock('@/lib/supabase/server', () => ({ createServerSupabaseClient: mocks.createServerSupabaseClient }));
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

type DatabaseResult = { data: unknown; error: { code: string } | null };

function databaseClient(results: DatabaseResult[]) {
  const updates: Record<string, unknown>[] = [];
  const inserts: Record<string, unknown>[] = [];
  const client = {
    from: vi.fn(() => ({
      select() { return this; },
      eq() { return this; },
      update(payload: Record<string, unknown>) { updates.push(payload); return this; },
      insert(payload: Record<string, unknown>) { inserts.push(payload); return this; },
      maybeSingle: vi.fn(async () => results.shift()),
      single: vi.fn(async () => results.shift()),
    })),
  };
  mocks.createServerSupabaseClient.mockResolvedValue(client);
  return { updates, inserts };
}

describe('profile data access', () => {
  const savedRow = {
    id: 'profile-id', nickname: 'Алия', age_band: '4_6',
    preferred_language: 'kk', support_area: 'speech_language',
  };
  const input = {
    nickname: 'Алия', ageBand: '4_6' as const,
    preferredLanguage: 'kk' as const, supportArea: 'speech_language' as const,
  };

  beforeEach(() => vi.clearAllMocks());

  it('inserts a first profile using the authenticated owner ID', async () => {
    const { inserts } = databaseClient([
      { data: null, error: null },
      { data: savedRow, error: null },
    ]);
    const { saveProfileForUser } = await vi.importActual<typeof import('@/lib/data/profile')>(
      '@/lib/data/profile',
    );
    expect(await saveProfileForUser('session-owner', input)).toEqual({
      id: 'profile-id', ...input,
    });
    expect(inserts).toEqual([{
      owner_id: 'session-owner', nickname: 'Алия', age_band: '4_6',
      preferred_language: 'kk', support_area: 'speech_language',
    }]);
  });

  it('edits the existing row without updating its immutable owner ID', async () => {
    const { updates, inserts } = databaseClient([
      { data: { id: 'profile-id' }, error: null },
      { data: savedRow, error: null },
    ]);
    const { saveProfileForUser } = await vi.importActual<typeof import('@/lib/data/profile')>(
      '@/lib/data/profile',
    );
    await saveProfileForUser('session-owner', input);
    expect(updates).toEqual([{
      nickname: 'Алия', age_band: '4_6',
      preferred_language: 'kk', support_area: 'speech_language',
    }]);
    expect(inserts).toHaveLength(0);
  });

  it('recovers from a concurrent first create by updating the same owner row', async () => {
    const { updates } = databaseClient([
      { data: null, error: null },
      { data: null, error: { code: '23505' } },
      { data: { id: 'profile-id' }, error: null },
      { data: savedRow, error: null },
    ]);
    const { saveProfileForUser } = await vi.importActual<typeof import('@/lib/data/profile')>(
      '@/lib/data/profile',
    );
    const result = await saveProfileForUser('session-owner', input);
    expect(result.id).toBe('profile-id');
    expect(updates).toHaveLength(1);
  });
});
