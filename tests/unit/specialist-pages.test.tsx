import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ requireUser: vi.fn(), locale: vi.fn(), getById: vi.fn(), directory: vi.fn() }));
vi.mock('@/lib/auth', () => ({ requireDemoUser: mocks.requireUser }));
vi.mock('@/lib/i18n/locale', () => ({ getLocale: mocks.locale }));
vi.mock('@/lib/data/specialists', () => ({ getSpecialistById: mocks.getById, getSpecialistDirectory: mocks.directory }));
import SpecialistPage from '@/app/demo/specialists/[id]/page';
import DirectoryPage from '@/app/demo/specialists/page';

const specialist = {
  id: '11111111-1111-4111-8111-111111111111', displayName: 'Demo specialist', role: 'Russian role', roleKk: 'Kazakh role',
  supportArea: 'speech_language', languages: ['ru', 'kk'], description: 'Russian example', descriptionKk: 'Kazakh example',
  slots: Array.from({ length: 4 }, (_, index) => ({ id: `slot-${index}`, startsAt: `2030-01-0${index + 1}T10:00:00Z`, endsAt: `2030-01-0${index + 1}T10:50:00Z` })),
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.locale.mockResolvedValue('ru');
  mocks.getById.mockResolvedValue(specialist);
  mocks.directory.mockResolvedValue([specialist]);
});
const detail = () => SpecialistPage({ params: Promise.resolve({ id: specialist.id }) });
describe('specialist pages', () => {
  it.each(['ru', 'kk'])('renders full details with all slots, duration and demo notice (%s)', async (locale) => {
    mocks.locale.mockResolvedValue(locale);
    const html = renderToStaticMarkup(await detail());
    expect(html).toContain(locale === 'ru' ? 'Russian example' : 'Kazakh example');
    expect(html).toContain(locale === 'ru' ? 'вымышленный профиль' : 'ойдан шығарылған профиль');
    expect(html).toContain('50 мин');
    expect(html).toContain('slot-day');
    expect(html).toContain('aria-label=');
    expect((html.match(/\/demo\/bookings\/new\?slot=/g) ?? [])).toHaveLength(4);
    expect(mocks.requireUser).toHaveBeenCalledWith(`/demo/specialists/${specialist.id}`);
  });
  it('keeps directory cards short and links to full profiles', async () => {
    const html = renderToStaticMarkup(await DirectoryPage({ searchParams: Promise.resolve({}) }));
    expect((html.match(/\/demo\/bookings\/new\?slot=/g) ?? [])).toHaveLength(3);
    expect(html).toContain(`/demo/specialists/${specialist.id}`);
    expect(html).toContain('Все доступные часы');
  });
  it('groups adjacent UTC dates into their shared Almaty day with complete link labels', async () => {
    mocks.getById.mockResolvedValue({ ...specialist, slots: [
      { id: 'first', startsAt: '2030-01-01T20:00:00Z', endsAt: '2030-01-01T20:50:00Z' },
      { id: 'second', startsAt: '2030-01-02T01:00:00Z', endsAt: '2030-01-02T01:50:00Z' },
    ] });
    const html = renderToStaticMarkup(await detail());
    expect((html.match(/class="slot-day"/g) ?? [])).toHaveLength(1);
    expect(html).toContain('id="day-2030-01-02"');
    expect(html).toContain('<span>01:00</span>');
    expect(html).toContain('<span>06:00</span>');
    expect(html).toContain('aria-label="Выбрать время: 2 января 2030');
    expect((html.match(/class="slot-timezone"/g) ?? [])).toHaveLength(1);
  });
  it('does not suggest hidden times when all directory slots are shown', async () => {
    mocks.directory.mockResolvedValue([{ ...specialist, slots: specialist.slots.slice(0, 3) }]);
    const html = renderToStaticMarkup(await DirectoryPage({ searchParams: Promise.resolve({}) }));
    expect(html).not.toContain('Все доступные часы');
  });
  it('handles a specialist without slots', async () => {
    mocks.getById.mockResolvedValue({ ...specialist, slots: [] });
    const html = renderToStaticMarkup(await detail());
    expect(html).toContain('Сейчас нет свободного времени.');
    const document = new DOMParser().parseFromString(html, 'text/html');
    expect(document.querySelector('#availability a[href="/demo/specialists"]')).not.toBeNull();
  });
  it('handles missing and inactive profiles with directory recovery', async () => {
    mocks.getById.mockResolvedValue(null);
    const html = renderToStaticMarkup(await detail());
    expect(html).toContain('Специалист не найден');
    expect(html).toContain('href="/demo/specialists"');
  });
  it('provides a retry after a data error without exposing details', async () => {
    mocks.getById.mockRejectedValue(new Error('private database detail'));
    const html = renderToStaticMarkup(await detail());
    expect(html).toContain('role="alert"');
    expect(html).toContain('Повторить');
    expect(html).not.toContain('private database detail');
  });
});
