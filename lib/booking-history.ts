import type { BookingSummary } from '@/lib/data/bookings';

export const bookingViews = ['upcoming', 'past', 'cancelled'] as const;
export type BookingView = typeof bookingViews[number];

export function parseBookingView(value: string | string[] | undefined): BookingView {
  return value === 'past' || value === 'cancelled' ? value : 'upcoming';
}

export function classifyBooking(booking: BookingSummary, now: number): BookingView {
  if (booking.status === 'cancelled') return 'cancelled';
  return Date.parse(booking.startsAt) > now ? 'upcoming' : 'past';
}

export function filterBookingHistory(
  bookings: readonly BookingSummary[], view: BookingView, now: number = Date.now(),
): BookingSummary[] {
  return bookings.filter((booking) => classifyBooking(booking, now) === view)
    .sort((a, b) => view === 'upcoming'
      ? Date.parse(a.startsAt) - Date.parse(b.startsAt)
      : Date.parse(b.startsAt) - Date.parse(a.startsAt));
}
