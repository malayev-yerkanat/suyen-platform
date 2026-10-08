import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  class BookingFailure extends Error {
    constructor(public readonly kind: string) {
      super(kind);
    }
  }
  return {
    BookingFailure,
    requireDemoUser: vi.fn(),
    reserveSlotForUser: vi.fn(),
    cancelBookingForUser: vi.fn(),
    revalidatePath: vi.fn(),
    redirect: vi.fn(),
  };
});

vi.mock('@/lib/auth', () => ({ requireDemoUser: mocks.requireDemoUser }));
vi.mock('@/lib/data/bookings', () => ({
  BookingFailure: mocks.BookingFailure,
  reserveSlotForUser: mocks.reserveSlotForUser,
  cancelBookingForUser: mocks.cancelBookingForUser,
}));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));

import {
  cancelBookingAction, reserveBookingAction,
  type BookingActionState,
} from '@/app/demo/bookings/actions';
import { BookingFailure } from '@/lib/data/bookings';

const profileId = '7e9e7ba3-5216-4e38-8f53-2995c035275c';
const slotId = 'b3737b1d-742e-4e87-99ee-53a2c647503b';
const bookingId = 'a87c397d-1356-4278-b366-21ef2b51c285';
const idle: BookingActionState = { status: 'idle' };

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe('booking server actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireDemoUser.mockResolvedValue({ id: 'session-owner' });
    mocks.reserveSlotForUser.mockResolvedValue({ id: bookingId });
    mocks.cancelBookingForUser.mockResolvedValue({ id: bookingId, status: 'cancelled' });
  });

  it('reauthenticates, validates IDs, reserves, and opens the confirmation', async () => {
    await reserveBookingAction(idle, form({ profileId, slotId, ownerId: 'forged' }));
    expect(mocks.requireDemoUser).toHaveBeenCalledWith('/demo/bookings/new');
    expect(mocks.reserveSlotForUser).toHaveBeenCalledWith('session-owner', profileId, slotId);
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/demo/specialists');
    expect(mocks.redirect).toHaveBeenCalledWith(`/demo/bookings/${bookingId}`);
  });

  it('never calls storage for a malformed reservation', async () => {
    const result = await reserveBookingAction(idle, form({ profileId: 'bad', slotId }));
    expect(result).toEqual({ status: 'error', error: 'booking.slotUnavailable' });
    expect(mocks.reserveSlotForUser).not.toHaveBeenCalled();
  });

  it('reports a taken slot and refreshes availability', async () => {
    mocks.reserveSlotForUser.mockRejectedValueOnce(new BookingFailure('conflict'));
    const result = await reserveBookingAction(idle, form({ profileId, slotId }));
    expect(result).toEqual({ status: 'error', error: 'booking.conflict' });
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/demo/specialists');
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it('keeps a retryable state on transient failure', async () => {
    mocks.reserveSlotForUser.mockRejectedValueOnce(new Error('network'));
    const result = await reserveBookingAction(idle, form({ profileId, slotId }));
    expect(result).toEqual({ status: 'error', error: 'booking.retry' });
  });

  it('reauthenticates and cancels only the submitted booking', async () => {
    await cancelBookingAction(idle, form({ bookingId, ownerId: 'forged' }));
    expect(mocks.requireDemoUser).toHaveBeenCalledWith(`/demo/bookings/${bookingId}`);
    expect(mocks.cancelBookingForUser).toHaveBeenCalledWith('session-owner', bookingId);
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/demo/specialists');
    expect(mocks.redirect).toHaveBeenCalledWith(`/demo/bookings/${bookingId}`);
  });

  it('does not send a malformed cancellation ID to storage', async () => {
    const result = await cancelBookingAction(idle, form({ bookingId: 'bad' }));
    expect(result).toEqual({ status: 'error', error: 'booking.notFound' });
    expect(mocks.cancelBookingForUser).not.toHaveBeenCalled();
  });

  it('reports cancellation after start without leaking database detail', async () => {
    mocks.cancelBookingForUser.mockRejectedValueOnce(new BookingFailure('cannot_cancel'));
    const result = await cancelBookingAction(idle, form({ bookingId }));
    expect(result).toEqual({ status: 'error', error: 'booking.cancelUnavailable' });
  });
});
