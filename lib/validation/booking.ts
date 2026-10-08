import { z } from 'zod';

// Seed fixtures use valid GUIDs but are not guaranteed to use a specific UUID variant.
export const bookingIdSchema = z.guid();

export const reservationSchema = z.object({
  profileId: z.guid(),
  slotId: z.guid(),
});

export type ReservationInput = z.infer<typeof reservationSchema>;
