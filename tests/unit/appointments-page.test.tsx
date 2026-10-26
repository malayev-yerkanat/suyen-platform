import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), bookings: vi.fn(), locale: vi.fn() }));
vi.mock('@/lib/auth', () => ({ requireDemoUser: mocks.auth }));
vi.mock('@/lib/data/bookings', () => ({ getBookingsForUser: mocks.bookings }));
vi.mock('@/lib/i18n/locale', () => ({ getLocale: mocks.locale }));
import BookingsPage from '@/app/demo/bookings/page';
import BookingsLoading from '@/app/demo/bookings/loading';
const rows = [{ id: 'future', status: 'confirmed', childNickname: 'Test child', specialistId: 'specialist-id', specialistName: 'Future specialist', specialistRole: 'Role', specialistRoleKk: 'Рөл', startsAt: '2099-10-27T10:00:00Z', endsAt: '2099-10-27T10:50:00Z' }, { id: 'past', status: 'confirmed', childNickname: 'Test child', specialistId: 'specialist-id', specialistName: 'Past specialist', specialistRole: 'Role', specialistRoleKk: 'Рөл', startsAt: '2020-10-27T10:00:00Z', endsAt: '2020-10-27T10:50:00Z' }, { id: 'cancelled', status: 'cancelled', childNickname: 'Test child', specialistId: 'specialist-id', specialistName: 'Cancelled specialist', specialistRole: 'Role', specialistRoleKk: 'Рөл', startsAt: '2099-10-27T10:00:00Z', endsAt: '2099-10-27T10:50:00Z' }];
describe('appointment history page', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.auth.mockResolvedValue({ id: 'session-owner' }); mocks.locale.mockResolvedValue('ru'); mocks.bookings.mockResolvedValue(rows); });
  afterEach(cleanup);
  it('uses the authenticated account and defaults to upcoming with detail/rebook links', async () => {
    render(await BookingsPage({ searchParams: Promise.resolve({ view: ['past', 'cancelled'] }) }));
    expect(mocks.auth).toHaveBeenCalledWith('/demo/bookings');
    expect(mocks.bookings).toHaveBeenCalledWith('session-owner');
    expect(screen.getByRole('heading', { name: 'Future specialist' })).toBeTruthy();
    expect(screen.queryByText('Past specialist')).toBeNull();
    expect(screen.getByText(/15:00–15:50 · 50 мин · Время Алматы/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Предстоящие' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'Выбрать другое время' }).getAttribute('href')).toBe('/demo/specialists/specialist-id');
    expect(screen.getByText(/Текущая запись сохранится/)).toBeTruthy();
    expect(document.querySelector('a[href="/demo/bookings/future"]')).toBeTruthy();
  });
  it('explains past appointments are not attendance confirmation', async () => {
    render(await BookingsPage({ searchParams: Promise.resolve({ view: 'past' }) }));
    expect(screen.getByText(/Это не подтверждает участие/)).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Past specialist' })).toBeTruthy();
  });
  it('renders cancelled appointments and Kazakh content', async () => {
    mocks.locale.mockResolvedValue('kk');
    render(await BookingsPage({ searchParams: Promise.resolve({ view: 'cancelled' }) }));
    expect(screen.getByRole('heading', { name: 'Менің жазылымдарым' })).toBeTruthy();
    expect(screen.getByText('Бас тартылды')).toBeTruthy();
    expect(screen.getByText('Рөл')).toBeTruthy();
  });
  it('renders empty history with discovery action', async () => {
    mocks.bookings.mockResolvedValue([]);
    render(await BookingsPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText('Предстоящих записей пока нет.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Найти специалиста' })).toBeTruthy();
  });
  it('shows retry in the selected section without exposing errors or a misleading empty state', async () => {
    mocks.bookings.mockRejectedValue(new Error('private database detail'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(await BookingsPage({ searchParams: Promise.resolve({ view: 'cancelled' }) }));
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Повторить' }).getAttribute('href')).toBe('/demo/bookings?view=cancelled');
    expect(screen.queryByText('private database detail')).toBeNull();
    expect(screen.queryByText('Отменённых записей пока нет.')).toBeNull();
    log.mockRestore();
  });
  it('marks loading state busy', () => {
    render(<BookingsLoading />);
    expect(screen.getByRole('main').getAttribute('aria-busy')).toBe('true');
  });
});
