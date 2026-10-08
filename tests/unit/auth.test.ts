import { describe, expect, it } from 'vitest';

import { safeDemoPath } from '@/lib/auth';

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
