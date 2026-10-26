import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ cancel: vi.fn() }));
vi.mock('@/app/demo/bookings/actions', () => ({ cancelBookingAction: mocks.cancel }));
import { CancelBooking } from '@/app/demo/bookings/CancelBooking';
import { formatBookingSession } from '@/lib/time';

afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe('booking clarity', () => {
  it.each(['ru', 'kk'] as const)('shows a complete session once with friendly timezone (%s)', (locale) => {
    const result = formatBookingSession('2026-10-27T10:00:00Z', '2026-10-27T10:50:00Z', locale);
    expect(result).toContain('15:00–15:50');
    expect(result).toContain('50 мин');
    expect(result.match(/Алматы/g)).toHaveLength(1);
    expect(result).not.toMatch(/Asia\/Almaty|GMT|UTC/);
  });
  it('shows both calendar dates for a session crossing midnight', () => {
    const result = formatBookingSession('2026-10-27T18:30:00Z', '2026-10-27T19:20:00Z', 'ru');
    expect(result).toContain('27 октября');
    expect(result).toContain('28 октября');
    expect(result).toContain('50 мин');
  });
  it.each([['bad', '2026-10-27T10:50:00Z'], ['2026-10-27T11:00:00Z', '2026-10-27T10:50:00Z']])('rejects invalid or reversed intervals', (start, end) => {
    expect(() => formatBookingSession(start, end, 'ru')).toThrow(RangeError);
  });
  it('disables both actions while cancelling and reports a failed cancellation', async () => {
    let finish!: (value: { status: string; error: string }) => void;
    mocks.cancel.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const { container } = render(<CancelBooking bookingId="booking-id" locale="ru" />);
    fireEvent.click(container.querySelector('summary')!);
    fireEvent.submit(container.querySelector('form')!);
    expect(await screen.findByRole('button', { name: 'Отменяем…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Оставить запись' })).toBeDisabled();
    finish({ status: 'error', error: 'common.error' });
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Оставить запись' })).toBeEnabled();
  });
  it.each([
    ['ru', 'Отменить запись', 'Оставить запись'],
    ['kk', 'Жазылымнан бас тарту', 'Жазылымды сақтау'],
  ] as const)('allows keeping the appointment and restores trigger focus (%s)', (locale, cancel, keep) => {
    const { container } = render(<CancelBooking bookingId="booking-id" locale={locale} />);
    const disclosure = container.querySelector('details')!;
    const trigger = container.querySelector('summary')!;
    fireEvent.click(trigger);
    expect(disclosure.open).toBe(true);
    expect(screen.getByRole('button', { name: cancel })).toHaveAttribute('type', 'submit');
    fireEvent.click(screen.getByRole('button', { name: keep }));
    expect(disclosure.open).toBe(false);
    expect(trigger).toHaveFocus();
  });
});
