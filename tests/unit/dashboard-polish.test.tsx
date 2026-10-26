import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ user: vi.fn(), locale: vi.fn(), profile: vi.fn(), booking: vi.fn() }));
vi.mock('@/lib/auth', () => ({ requireDemoUser: mocks.user }));
vi.mock('@/lib/i18n/locale', () => ({ getLocale: mocks.locale }));
vi.mock('@/lib/data/profile', () => ({ getProfileForUser: mocks.profile }));
vi.mock('@/lib/data/bookings', () => ({ getNextBookingForUser: mocks.booking }));
import Dashboard from '@/app/demo/page';

beforeEach(() => {
  mocks.user.mockResolvedValue({ id: 'demo-user' });
  mocks.locale.mockResolvedValue('ru');
  mocks.profile.mockResolvedValue({ nickname: 'Demo', ageBand: '4_6', supportArea: 'speech_language' });
  mocks.booking.mockResolvedValue(null);
});

test('empty appointment card offers a booking action and contains the history link', async () => {
  const document = new DOMParser().parseFromString(renderToStaticMarkup(await Dashboard({ searchParams: Promise.resolve({}) })), 'text/html');
  const card = document.querySelector('[aria-labelledby="next-booking-title"]');
  expect(card?.querySelector('a[href="/demo/specialists"]')).not.toBeNull();
  expect(card?.querySelector('a[href="/demo/bookings"]')).not.toBeNull();
  const feedback = document.querySelector('a[href="/demo/feedback?from=dashboard"]');
  expect(feedback?.closest('.dashboard-card')).toBeNull();
});

test('confirmed appointment retains its details link and history action', async () => {
  mocks.booking.mockResolvedValue({ id: 'booking-1', specialistName: 'Demo specialist', specialistRole: 'Role', specialistRoleKk: 'Рөл', startsAt: '2030-01-01T10:00:00Z' });
  mocks.locale.mockResolvedValue('kk');
  const html = renderToStaticMarkup(await Dashboard({ searchParams: Promise.resolve({}) }));
  expect(html).toContain('href="/demo/bookings/booking-1"');
  expect(html).toContain('href="/demo/bookings"');
  expect(html).toContain('Рөл');
});

test('failed booking read never presents an empty booking claim', async () => {
  mocks.booking.mockRejectedValue(new Error('read failed'));
  const html = renderToStaticMarkup(await Dashboard({ searchParams: Promise.resolve({}) }));
  expect(html).toContain('role="alert"');
  expect(html).not.toContain('Пока нет подтверждённых записей.');
  expect(html).toContain('href="/demo/bookings"');
});

test('missing profile preserves the profile creation journey', async () => {
  mocks.profile.mockResolvedValue(null);
  const html = renderToStaticMarkup(await Dashboard({ searchParams: Promise.resolve({}) }));
  expect(html).toContain('href="/demo/profile"');
  expect(html).not.toContain('id="next-booking-title"');
});

test('failed profile read provides recovery without displaying booking data', async () => {
  mocks.profile.mockRejectedValue(new Error('read failed'));
  const html = renderToStaticMarkup(await Dashboard({ searchParams: Promise.resolve({ authError: 'signout' }) }));
  expect(html).toContain('href="/demo"');
  expect(html).not.toContain('id="next-booking-title"');
  expect(html).not.toContain('read failed');
});
