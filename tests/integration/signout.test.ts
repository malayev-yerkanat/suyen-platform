import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireDemoUser: vi.fn(),
  createServerSupabaseClient: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  safeDemoPath: vi.fn((value: string) => value),
  redirect: vi.fn((path: string) => { throw new Error(`redirect:${path}`); }),
}));

vi.mock('@/lib/auth', () => ({
  requireDemoUser: mocks.requireDemoUser,
  safeDemoPath: mocks.safeDemoPath,
}));
vi.mock('@/lib/supabase/server', () => ({ createServerSupabaseClient: mocks.createServerSupabaseClient }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));

import { signInAction, signOutAction } from '@/app/demo/login/actions';

function loginForm(email: string, password: string): FormData {
  const form = new FormData();
  form.set('email', email);
  form.set('password', password);
  form.set('next', '/demo/profile');
  return form;
}

describe('shared-account sign out', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireDemoUser.mockResolvedValue({ id: 'synthetic-owner' });
    mocks.createServerSupabaseClient.mockResolvedValue({ auth: {
      signInWithPassword: mocks.signInWithPassword,
      signOut: mocks.signOut,
    } });
    mocks.signInWithPassword.mockResolvedValue({ error: null });
    mocks.signOut.mockResolvedValue({ error: null });
  });

  it('ends only this browser session, leaving teammate sessions active', async () => {
    await expect(signOutAction()).rejects.toThrow('redirect:/demo/login');
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('rejects malformed credentials before contacting Auth', async () => {
    await expect(signInAction(loginForm('not-an-email', 'password')))
      .rejects.toThrow('redirect:/demo/login?next=%2Fdemo%2Fprofile&error=invalid');
    expect(mocks.createServerSupabaseClient).not.toHaveBeenCalled();
  });

  it('redirects a valid login only to the validated internal destination', async () => {
    await expect(signInAction(loginForm('demo@example.invalid', 'password')))
      .rejects.toThrow('redirect:/demo/profile');
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: 'demo@example.invalid', password: 'password',
    });
    expect(mocks.safeDemoPath).toHaveBeenCalledWith('/demo/profile');
  });

  it('keeps authentication failures generic', async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: new Error('private provider detail') });
    await expect(signInAction(loginForm('demo@example.invalid', 'wrong')))
      .rejects.toThrow('redirect:/demo/login?next=%2Fdemo%2Fprofile&error=invalid');
  });
});
