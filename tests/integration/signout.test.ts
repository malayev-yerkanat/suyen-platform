import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireDemoUser: vi.fn(),
  getAuth: vi.fn(),
  signInEmail: vi.fn(),
  signOut: vi.fn(),
  safeDemoPath: vi.fn((value: string) => value),
  redirect: vi.fn((path: string) => { throw new Error(`redirect:${path}`); }),
  headers: vi.fn(async () => new Headers({ cookie: 'session=abc' })),
}));

vi.mock('@/lib/auth', () => ({
  requireDemoUser: mocks.requireDemoUser,
  safeDemoPath: mocks.safeDemoPath,
}));
vi.mock('@/lib/auth-server', () => ({ getAuth: mocks.getAuth }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('next/headers', () => ({ headers: mocks.headers }));

import { signInAction, signOutAction } from '@/app/demo/login/actions';

function loginForm(email: string, password: string): FormData {
  const form = new FormData();
  form.set('email', email);
  form.set('password', password);
  form.set('next', '/demo/profile');
  return form;
}

describe('shared-account sign in and sign out', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireDemoUser.mockResolvedValue({ id: 'synthetic-owner' });
    mocks.getAuth.mockReturnValue({ api: { signInEmail: mocks.signInEmail, signOut: mocks.signOut } });
    mocks.signInEmail.mockResolvedValue({});
    mocks.signOut.mockResolvedValue({ success: true });
  });

  it('ends only this browser session, leaving teammate sessions active', async () => {
    await expect(signOutAction()).rejects.toThrow('redirect:/demo/login');
    expect(mocks.signOut).toHaveBeenCalledOnce();
    expect(mocks.signOut.mock.calls[0][0].headers.get('cookie')).toBe('session=abc');
  });

  it('sends a failed sign out back to the dashboard with a flag', async () => {
    mocks.signOut.mockRejectedValue(new Error('database down'));
    await expect(signOutAction()).rejects.toThrow('redirect:/demo?authError=signout');
  });

  it('rejects malformed credentials before contacting Auth', async () => {
    await expect(signInAction(loginForm('not-an-email', 'password')))
      .rejects.toThrow('redirect:/demo/login?next=%2Fdemo%2Fprofile&error=invalid');
    expect(mocks.signInEmail).not.toHaveBeenCalled();
  });

  it('redirects a valid login only to the validated internal destination', async () => {
    await expect(signInAction(loginForm('demo@example.invalid', 'password')))
      .rejects.toThrow('redirect:/demo/profile');
    expect(mocks.signInEmail).toHaveBeenCalledWith({
      body: { email: 'demo@example.invalid', password: 'password' },
      headers: expect.any(Headers),
    });
    expect(mocks.safeDemoPath).toHaveBeenCalledWith('/demo/profile');
  });

  it('keeps authentication failures generic', async () => {
    mocks.signInEmail.mockRejectedValue(new Error('private provider detail'));
    await expect(signInAction(loginForm('demo@example.invalid', 'wrong')))
      .rejects.toThrow('redirect:/demo/login?next=%2Fdemo%2Fprofile&error=invalid');
  });

  it('reports a configuration problem when the database is not set up', async () => {
    mocks.getAuth.mockReturnValue(null);
    await expect(signInAction(loginForm('demo@example.invalid', 'password')))
      .rejects.toThrow('redirect:/demo/login?next=%2Fdemo%2Fprofile&error=configuration');
  });
});
