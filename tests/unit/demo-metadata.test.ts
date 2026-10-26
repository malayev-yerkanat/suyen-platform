import { describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ locale: 'ru' as 'ru' | 'kk' }));
vi.mock('@/lib/i18n/locale', () => ({ getLocale: async () => state.locale }));
import { demoMetadata } from '@/lib/demo-metadata';

describe('localized route titles', () => {
  it.each(['ru', 'kk'] as const)('uses distinct branded titles in %s', async (locale) => {
    state.locale = locale;
    const routes = ['dashboard', 'profile', 'specialists', 'specialist', 'bookings', 'booking', 'review', 'feedback', 'login'] as const;
    const titles = await Promise.all(routes.map(async (route) => (await demoMetadata(route)).title));
    expect(new Set(titles).size).toBe(routes.length);
    for (const title of titles) expect(title).toMatch(/ · Süyen$/);
    expect(titles[0]).toBe(locale === 'ru' ? 'Обзор · Süyen' : 'Шолу · Süyen');
  });
});
