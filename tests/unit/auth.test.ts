import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getAuth: vi.fn(),
  getSession: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock('@/lib/auth-server', () => ({ getAuth: mocks.getAuth }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('next/headers', () => ({ headers: async () => new Headers({ cookie: 'session=abc' }) }));

import { getDemoUser, requireDemoUser, safeDemoPath } from '@/lib/auth';

beforeEach(() => {
  vi.resetAllMocks();
  mocks.redirect.mockImplementation((path: string) => {
    throw new Error(`redirect:${path}`);
  });
});

describe('safeDemoPath', () => {
  it('keeps internal demo destinations including a query string', () => {
    expect(safeDemoPath('/demo/profile')).toBe('/demo/profile');
    expect(safeDemoPath('/demo/bookings/123?from=list')).toBe('/demo/bookings/123?from=list');
  });

  it.each([
    undefined,
    '',
    'https://example.com/demo',
    '//example.com',
    '/outside',
    '/demolition',
    '/demo/../outside',
    '/demo/%2e%2e/outside',
    '/demo\\example.com',
    '/demo\nLocation: https://example.com',
  ])('falls back to /demo for an unsafe destination (%s)', (destination) => {
    expect(safeDemoPath(destination)).toBe('/demo');
  });
});

describe('requireDemoUser', () => {
  beforeEach(() => {
    mocks.getAuth.mockReturnValue({ api: { getSession: mocks.getSession } });
  });

  it('returns only the id and email of the validated session user', async () => {
    mocks.getSession.mockResolvedValue({
      user: { id: 'team-user', email: 'team@example.invalid', name: 'Team', image: null },
      session: { token: 'secret-token' },
    });

    await expect(requireDemoUser('/demo/profile')).resolves.toEqual({
      id: 'team-user', email: 'team@example.invalid',
    });
    expect(mocks.getSession).toHaveBeenCalledWith({ headers: expect.any(Headers) });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it('redirects to the requested internal page when Auth is not configured', async () => {
    mocks.getAuth.mockReturnValue(null);

    await expect(requireDemoUser('/demo/profile')).rejects.toThrow(
      'redirect:/demo/login?next=%2Fdemo%2Fprofile',
    );
  });

  it('redirects when there is no session', async () => {
    mocks.getSession.mockResolvedValue(null);

    await expect(requireDemoUser('/demo')).rejects.toThrow('redirect:/demo/login?next=%2Fdemo');
    expect(mocks.getSession).toHaveBeenCalledOnce();
  });

  it('denies access when the Auth service is unavailable', async () => {
    mocks.getSession.mockRejectedValue(new Error('network unavailable'));

    await expect(requireDemoUser('/demo/specialists')).rejects.toThrow(
      'redirect:/demo/login?next=%2Fdemo%2Fspecialists',
    );
  });
});

describe('getDemoUser', () => {
  it('is null rather than an error when Auth fails', async () => {
    mocks.getAuth.mockReturnValue({ api: { getSession: mocks.getSession } });
    mocks.getSession.mockRejectedValue(new Error('database down'));

    await expect(getDemoUser()).resolves.toBeNull();
  });
});
