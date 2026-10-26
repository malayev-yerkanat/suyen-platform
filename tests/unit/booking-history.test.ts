import { describe, expect, it } from 'vitest';
import { classifyBooking, filterBookingHistory, parseBookingView } from '@/lib/booking-history';
import type { BookingSummary } from '@/lib/data/bookings';
const now = Date.parse('2026-10-26T10:00:00Z');
const booking = (id: string, startsAt: string, status: BookingSummary['status'] = 'confirmed'): BookingSummary => ({ id, startsAt, status, endsAt: startsAt, childNickname: 'Demo', specialistId: 'specialist-id', specialistName: 'Demo', specialistRole: 'Demo', specialistRoleKk: 'Demo' });
describe('appointment history', () => {
  it('uses start time and never treats cancelled bookings as past or upcoming', () => {
    expect(classifyBooking(booking('1', '2026-10-26T10:00:01Z'), now)).toBe('upcoming');
    expect(classifyBooking(booking('1', '2026-10-26T10:00:00Z'), now)).toBe('past');
    expect(classifyBooking(booking('1', '2026-10-25T10:00:00Z', 'cancelled'), now)).toBe('cancelled');
  });
  it('defaults malformed and repeated views to upcoming', () => {
    for (const value of [undefined, 'bad', ['past', 'cancelled']]) expect(parseBookingView(value)).toBe('upcoming');
    expect(parseBookingView('past')).toBe('past');
    expect(parseBookingView('cancelled')).toBe('cancelled');
  });
  it('sorts upcoming soonest first and history newest first without mutating', () => {
    const rows = [booking('later', '2026-10-28T10:00:00Z'), booking('sooner', '2026-10-27T10:00:00Z'), booking('old', '2026-10-23T10:00:00Z'), booking('recent', '2026-10-25T10:00:00Z')];
    expect(filterBookingHistory(rows, 'upcoming', now).map(row => row.id)).toEqual(['sooner', 'later']);
    expect(filterBookingHistory(rows, 'past', now).map(row => row.id)).toEqual(['recent', 'old']);
    expect(rows[0].id).toBe('later');
    expect(filterBookingHistory([], 'cancelled', now)).toEqual([]);
  });
});
