import { describe, expect, it } from 'vitest';

import { bookingIdSchema, reservationSchema } from '@/lib/validation/booking';

const profileId = '7e9e7ba3-5216-4e38-8f53-2995c035275c';
const slotId = 'b3737b1d-742e-4e87-99ee-53a2c647503b';

describe('booking boundary validation', () => {
  it('accepts only a profile and slot GUID', () => {
    expect(reservationSchema.parse({ profileId, slotId, ownerId: 'forged' }))
      .toEqual({ profileId, slotId });
  });

  it.each([
    { profileId: '', slotId },
    { profileId: 'not-a-guid', slotId },
    { profileId, slotId: '' },
    { profileId, slotId: '/demo/profile' },
  ])('rejects malformed or missing reservation IDs', (input) => {
    expect(reservationSchema.safeParse(input).success).toBe(false);
  });

  it('rejects a malformed cancellation ID', () => {
    expect(bookingIdSchema.safeParse('not-a-guid').success).toBe(false);
  });
});
