'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { requireDemoUser } from '@/lib/auth';
import {
  BookingFailure, cancelBookingForUser, reserveSlotForUser,
} from '@/lib/data/bookings';
import type { TranslationKey } from '@/lib/i18n/catalog';
import { bookingIdSchema, reservationSchema } from '@/lib/validation/booking';

export type BookingActionState = {
  status: 'idle' | 'error';
  error?: TranslationKey;
};

function stringField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

export async function reserveBookingAction(
  _previous: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const user = await requireDemoUser('/demo/bookings/new');
  const parsed = reservationSchema.safeParse({
    profileId: stringField(formData, 'profileId'),
    slotId: stringField(formData, 'slotId'),
  });
  if (!parsed.success) return { status: 'error', error: 'booking.slotUnavailable' };

  let bookingId: string;
  try {
    const booking = await reserveSlotForUser(user.id, parsed.data.profileId, parsed.data.slotId);
    bookingId = booking.id;
  } catch (error) {
    if (error instanceof BookingFailure) {
      if (error.kind === 'conflict') {
        revalidatePath('/demo/specialists');
        return { status: 'error', error: 'booking.conflict' };
      }
      if (error.kind === 'profile_not_found') {
        return { status: 'error', error: 'booking.profileRequired' };
      }
    }
    console.error('Reservation failed', error);
    return { status: 'error', error: 'booking.retry' };
  }

  revalidatePath('/demo');
  revalidatePath('/demo/specialists');
  redirect(`/demo/bookings/${bookingId}`);
}

export async function cancelBookingAction(
  _previous: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const bookingId = stringField(formData, 'bookingId');
  const user = await requireDemoUser(`/demo/bookings/${bookingId}`);
  if (!bookingIdSchema.safeParse(bookingId).success) {
    return { status: 'error', error: 'booking.notFound' };
  }

  try {
    await cancelBookingForUser(user.id, bookingId);
  } catch (error) {
    if (error instanceof BookingFailure) {
      if (error.kind === 'cannot_cancel') {
        return { status: 'error', error: 'booking.cancelUnavailable' };
      }
      if (error.kind === 'booking_not_found') {
        return { status: 'error', error: 'booking.notFound' };
      }
    }
    console.error('Cancellation failed', error);
    return { status: 'error', error: 'common.error' };
  }

  revalidatePath('/demo');
  revalidatePath('/demo/specialists');
  revalidatePath(`/demo/bookings/${bookingId}`);
  redirect(`/demo/bookings/${bookingId}`);
}
