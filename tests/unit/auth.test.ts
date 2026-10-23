import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({ createServerSupabaseClient: mocks.createClient }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));

import { requireDemoUser, safeDemoPath } from '@/lib/auth';

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
  it('returns the server-validated user for a valid session', async () => {
    const user = { id: 'team-user' };
    const getUser = vi.fn().mockResolvedValue({ data: { user }, error: null });
    mocks.createClient.mockResolvedValue({ auth: { getUser } });

    await expect(requireDemoUser('/demo/profile')).resolves.toBe(user);
    expect(getUser).toHaveBeenCalledOnce();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it('redirects to the requested internal page when no client is configured', async () => {
    mocks.createClient.mockResolvedValue(null);

    await expect(requireDemoUser('/demo/profile')).rejects.toThrow(
      'redirect:/demo/login?next=%2Fdemo%2Fprofile',
    );
  });

  it('redirects when Auth rejects or omits the session user', async () => {
    const getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('expired') });
    mocks.createClient.mockResolvedValue({ auth: { getUser } });

    await expect(requireDemoUser('/demo')).rejects.toThrow('redirect:/demo/login?next=%2Fdemo');
    expect(getUser).toHaveBeenCalledOnce();
  });

  it('denies access when the Auth service is unavailable', async () => {
    const getUser = vi.fn().mockRejectedValue(new Error('network unavailable'));
    mocks.createClient.mockResolvedValue({ auth: { getUser } });

    await expect(requireDemoUser('/demo/specialists')).rejects.toThrow(
      'redirect:/demo/login?next=%2Fdemo%2Fspecialists',
    );
  });
});
