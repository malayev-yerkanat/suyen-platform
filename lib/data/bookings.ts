import 'server-only';

import { z } from 'zod';

import { createServerSupabaseClient } from '@/lib/supabase/server';

const bookingRow = z.object({
  id: z.guid(),
  owner_id: z.guid(),
  child_profile_id: z.guid(),
  slot_id: z.guid(),
  status: z.enum(['confirmed', 'cancelled']),
});

const specialistRow = z.object({
  id: z.guid(),
  display_name: z.string(),
  role: z.string(),
  role_kk: z.string(),
  active: z.boolean(),
});

const slotRow = z.object({
  id: z.guid(),
  starts_at: z.string().datetime({ offset: true }),
  ends_at: z.string().datetime({ offset: true }),
  active: z.boolean(),
  reserved: z.boolean(),
  specialist_id: z.guid(),
});

const profileRow = z.object({ id: z.guid(), nickname: z.string() });

export type BookingStatus = 'confirmed' | 'cancelled';
export type BookingSummary = {
  id: string;
  status: BookingStatus;
  childNickname: string;
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

async function clientOrThrow() {
  const client = await createServerSupabaseClient();
  if (!client) throw new Error('Booking service unavailable');
  return client;
}

export async function getSlotForReview(slotId: string): Promise<SlotReview | null> {
  const client = await clientOrThrow();
  const { data, error } = await client.from('slots')
    .select('id,starts_at,ends_at,active,reserved,specialist_id')
    .eq('id', slotId).maybeSingle();
  if (error) throw new Error('Booking service unavailable');
  if (!data) return null;
  const slot = slotRow.parse(data);

  const specialistResult = await client.from('specialists')
    .select('id,display_name,role,role_kk,active')
    .eq('id', slot.specialist_id).maybeSingle();
  if (specialistResult.error) throw new Error('Booking service unavailable');
  if (!specialistResult.data) return null;
  const specialist = specialistRow.parse(specialistResult.data);

  return {
    id: slot.id,
    specialistName: specialist.display_name,
    specialistRole: specialist.role,
    specialistRoleKk: specialist.role_kk,
    startsAt: slot.starts_at,
    endsAt: slot.ends_at,
    available: specialist.active && slot.active && !slot.reserved
      && new Date(slot.starts_at).getTime() > Date.now(),
  };
}

export async function reserveSlotForUser(ownerId: string, profileId: string, slotId: string) {
  const client = await clientOrThrow();
  const { data, error } = await client.rpc('reserve_slot', {
    profile_id: profileId, slot_id: slotId,
  });
  if (error) mapBookingError(error);
  const booking = bookingRow.parse(data);
  if (booking.owner_id !== ownerId || booking.child_profile_id !== profileId
    || booking.slot_id !== slotId) throw new Error('Booking response mismatch');
  return { id: booking.id, status: booking.status };
}

export async function cancelBookingForUser(ownerId: string, bookingId: string) {
  const client = await clientOrThrow();
  const { data, error } = await client.rpc('cancel_booking', { booking_id: bookingId });
  if (error) mapBookingError(error);
  const booking = bookingRow.parse(data);
  if (booking.owner_id !== ownerId || booking.id !== bookingId) {
    throw new Error('Booking response mismatch');
  }
  return { id: booking.id, status: booking.status };
}

async function enrichBooking(
  booking: z.infer<typeof bookingRow>,
): Promise<BookingSummary> {
  const client = await clientOrThrow();
  const [profileResult, slotResult] = await Promise.all([
    client.from('child_profiles').select('id,nickname')
      .eq('id', booking.child_profile_id).eq('owner_id', booking.owner_id).maybeSingle(),
    client.from('slots').select('id,starts_at,ends_at,active,reserved,specialist_id')
      .eq('id', booking.slot_id).maybeSingle(),
  ]);
  if (profileResult.error || slotResult.error || !profileResult.data || !slotResult.data) {
    throw new Error('Booking details unavailable');
  }
  const profile = profileRow.parse(profileResult.data);
  const slot = slotRow.parse(slotResult.data);
  const specialistResult = await client.from('specialists')
    .select('id,display_name,role,role_kk,active')
    .eq('id', slot.specialist_id).maybeSingle();
  if (specialistResult.error || !specialistResult.data) {
    throw new Error('Booking details unavailable');
  }
  const specialist = specialistRow.parse(specialistResult.data);
  return {
    id: booking.id,
    status: booking.status,
    childNickname: profile.nickname,
    specialistName: specialist.display_name,
    specialistRole: specialist.role,
    specialistRoleKk: specialist.role_kk,
    startsAt: slot.starts_at,
    endsAt: slot.ends_at,
  };
}

export async function getBookingForUser(ownerId: string, bookingId: string): Promise<BookingSummary | null> {
  const client = await clientOrThrow();
  const { data, error } = await client.from('bookings')
    .select('id,owner_id,child_profile_id,slot_id,status')
    .eq('id', bookingId).eq('owner_id', ownerId).maybeSingle();
  if (error) throw new Error('Booking details unavailable');
  return data ? enrichBooking(bookingRow.parse(data)) : null;
}

export async function getNextBookingForUser(ownerId: string): Promise<BookingSummary | null> {
  const client = await clientOrThrow();
  const { data, error } = await client.from('bookings')
    .select('id,owner_id,child_profile_id,slot_id,status')
    .eq('owner_id', ownerId).eq('status', 'confirmed');
  if (error) throw new Error('Booking details unavailable');
  const bookings = bookingRow.array().parse(data);
  if (bookings.length === 0) return null;
  const summaries = await Promise.all(bookings.map(enrichBooking));
  return summaries
    .filter((booking) => new Date(booking.startsAt).getTime() > Date.now())
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))[0] ?? null;
}
