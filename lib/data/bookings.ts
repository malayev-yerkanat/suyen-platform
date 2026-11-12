import 'server-only';

import { z } from 'zod';

import { filterBookingHistory } from '@/lib/booking-history';
import { requireAppPool } from '@/lib/db';

const bookingRow = z.object({
  id: z.guid(),
  owner_id: z.guid(),
  child_profile_id: z.guid(),
  slot_id: z.guid(),
  status: z.enum(['confirmed', 'cancelled']),
});

const summaryRow = z.object({
  id: z.guid(),
  status: z.enum(['confirmed', 'cancelled']),
  child_nickname: z.string(),
  specialist_id: z.guid(),
  display_name: z.string(),
  role: z.string(),
  role_kk: z.string(),
  starts_at: z.string().datetime({ offset: true }),
  ends_at: z.string().datetime({ offset: true }),
});

const reviewRow = z.object({
  id: z.guid(),
  display_name: z.string(),
  role: z.string(),
  role_kk: z.string(),
  starts_at: z.string().datetime({ offset: true }),
  ends_at: z.string().datetime({ offset: true }),
  available: z.boolean(),
});

export type BookingStatus = 'confirmed' | 'cancelled';
export type BookingSummary = {
  id: string;
  status: BookingStatus;
  childNickname: string;
  specialistId: string;
  specialistName: string;
  specialistRole: string;
  specialistRoleKk: string;
  startsAt: string;
  endsAt: string;
};

export type SlotReview = {
  id: string;
  specialistName: string;
  specialistRole: string;
  specialistRoleKk: string;
  startsAt: string;
  endsAt: string;
  available: boolean;
};

export function canCancelBooking(booking: BookingSummary): boolean {
  return booking.status === 'confirmed'
    && Date.parse(booking.startsAt) > Date.now();
}

export type BookingFailureKind =
  | 'conflict' | 'profile_not_found' | 'booking_not_found' | 'cannot_cancel';

export class BookingFailure extends Error {
  constructor(public readonly kind: BookingFailureKind) {
    super(kind);
    this.name = 'BookingFailure';
  }
}

function mapBookingError(error: { code?: string; message: string }): never {
  if (error.message === 'slot_conflict' || error.code === '23505') {
    throw new BookingFailure('conflict');
  }
  if (error.message === 'profile_not_found') throw new BookingFailure('profile_not_found');
  if (error.message === 'booking_not_found') throw new BookingFailure('booking_not_found');
  if (error.message === 'cannot_cancel') throw new BookingFailure('cannot_cancel');
  throw new Error('Booking service unavailable');
}

async function query<Row>(text: string, values: unknown[]): Promise<Row[]> {
  try {
    const { rows } = await requireAppPool().query(text, values);
    return rows as Row[];
  } catch {
    throw new Error('Booking service unavailable');
  }
}

// Joined in SQL and always scoped by owner: a booking is only ever read together
// with the profile that belongs to the same owner.
const summarySelect = `
  select b.id, b.status, p.nickname as child_nickname,
         s.id as specialist_id, s.display_name, s.role, s.role_kk,
         sl.starts_at, sl.ends_at
  from public.bookings b
  join public.child_profiles p on p.id = b.child_profile_id and p.owner_id = b.owner_id
  join public.slots sl on sl.id = b.slot_id
  join public.specialists s on s.id = sl.specialist_id`;

function toSummary(row: z.infer<typeof summaryRow>): BookingSummary {
  return {
    id: row.id,
    status: row.status,
    childNickname: row.child_nickname,
    specialistId: row.specialist_id,
    specialistName: row.display_name,
    specialistRole: row.role,
    specialistRoleKk: row.role_kk,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
  };
}

export async function getSlotForReview(slotId: string): Promise<SlotReview | null> {
  const rows = await query(
    `select sl.id, s.display_name, s.role, s.role_kk, sl.starts_at, sl.ends_at,
            (s.active and sl.active and not sl.reserved and sl.starts_at > now()) as available
     from public.slots sl
     join public.specialists s on s.id = sl.specialist_id
     where sl.id = $1`,
    [slotId],
  );
  if (rows.length === 0) return null;
  const row = reviewRow.parse(rows[0]);
  return {
    id: row.id,
    specialistName: row.display_name,
    specialistRole: row.role,
    specialistRoleKk: row.role_kk,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    available: row.available,
  };
}

export async function reserveSlotForUser(ownerId: string, profileId: string, slotId: string) {
  let rows: unknown[];
  try {
    ({ rows } = await requireAppPool().query(
      'select * from public.reserve_slot($1, $2, $3)', [ownerId, profileId, slotId],
    ));
  } catch (error) {
    return mapBookingError(error as { code?: string; message: string });
  }
  const booking = bookingRow.parse(rows[0]);
  if (booking.owner_id !== ownerId || booking.child_profile_id !== profileId
    || booking.slot_id !== slotId) throw new Error('Booking response mismatch');
  return { id: booking.id, status: booking.status };
}

export async function cancelBookingForUser(ownerId: string, bookingId: string) {
  let rows: unknown[];
  try {
    ({ rows } = await requireAppPool().query(
      'select * from public.cancel_booking($1, $2)', [ownerId, bookingId],
    ));
  } catch (error) {
    return mapBookingError(error as { code?: string; message: string });
  }
  const booking = bookingRow.parse(rows[0]);
  if (booking.owner_id !== ownerId || booking.id !== bookingId) {
    throw new Error('Booking response mismatch');
  }
  return { id: booking.id, status: booking.status };
}

export async function getBookingForUser(ownerId: string, bookingId: string): Promise<BookingSummary | null> {
  const rows = await query(`${summarySelect} where b.owner_id = $1 and b.id = $2`, [ownerId, bookingId]);
  return rows.length === 0 ? null : toSummary(summaryRow.parse(rows[0]));
}

export async function getBookingsForUser(ownerId: string): Promise<BookingSummary[]> {
  const rows = await query(
    `${summarySelect} where b.owner_id = $1 order by sl.starts_at, b.created_at`,
    [ownerId],
  );
  return summaryRow.array().parse(rows).map(toSummary);
}

export async function getNextBookingForUser(ownerId: string): Promise<BookingSummary | null> {
  const bookings = await getBookingsForUser(ownerId);
  return filterBookingHistory(bookings, 'upcoming', Date.now())[0] ?? null;
}
