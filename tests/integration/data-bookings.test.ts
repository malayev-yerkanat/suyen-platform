// @vitest-environment node
import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { createTestDb, type TestDb } from '../helpers/test-db';

const holder = vi.hoisted(() => ({ pool: null as unknown }));
vi.mock('@/lib/db', () => ({
  requireAppPool: () => holder.pool,
  isDatabaseConfigured: () => true,
}));

import {
  cancelBookingForUser,
  canCancelBooking,
  getBookingForUser,
  getBookingsForUser,
  getNextBookingForUser,
  getSlotForReview,
  reserveSlotForUser,
} from '@/lib/data/bookings';
import { saveProfileForUser } from '@/lib/data/profile';

const input = {
  nickname: 'Алия', ageBand: '4_6' as const,
  preferredLanguage: 'kk' as const, supportArea: 'speech_language' as const,
};

let test: TestDb;
let alice: string;
let bob: string;
let aliceProfile: string;
let bobProfile: string;

beforeAll(async () => {
  test = await createTestDb();
  holder.pool = test.pool;
  alice = await test.createUser('alice@example.invalid');
  bob = await test.createUser('bob@example.invalid');
  aliceProfile = (await saveProfileForUser(alice, input)).id;
  bobProfile = (await saveProfileForUser(bob, input)).id;
});
afterAll(() => test.close());

/** The nth bookable future slot, so every test works on its own slot. */
let nextIndex = 0;
async function freshSlot(): Promise<string> {
  const { rows } = await test.pool.query(
    `select sl.id from public.slots sl join public.specialists s on s.id = sl.specialist_id
     where sl.active and not sl.reserved and s.active and sl.starts_at > now()
     order by sl.starts_at, sl.id offset $1 limit 1`,
    [nextIndex++],
  );
  expect(rows[0]?.id).toBeTruthy();
  return rows[0].id as string;
}

async function reservedFlag(slotId: string): Promise<boolean> {
  const { rows } = await test.pool.query('select reserved from public.slots where id = $1', [slotId]);
  return rows[0].reserved as boolean;
}

describe('reservation rules', () => {
  it('reserves a slot, and a repeated submit returns the original booking', async () => {
    const slotId = await freshSlot();
    const first = await reserveSlotForUser(alice, aliceProfile, slotId);
    const [second, third] = await Promise.all([
      reserveSlotForUser(alice, aliceProfile, slotId),
      reserveSlotForUser(alice, aliceProfile, slotId),
    ]);

    expect(first.status).toBe('confirmed');
    expect(second.id).toBe(first.id);
    expect(third.id).toBe(first.id);
    const { rows } = await test.pool.query(
      "select id from public.bookings where slot_id = $1 and status = 'confirmed'", [slotId],
    );
    expect(rows).toHaveLength(1);
    expect(await reservedFlag(slotId)).toBe(true);
  });

  it('gives a competing account a stable conflict and leaves the slot reserved once', async () => {
    const slotId = await freshSlot();
    await reserveSlotForUser(alice, aliceProfile, slotId);

    await expect(reserveSlotForUser(bob, bobProfile, slotId))
      .rejects.toMatchObject({ name: 'BookingFailure', kind: 'conflict' });
    const { rows } = await test.pool.query('select owner_id from public.bookings where slot_id = $1', [slotId]);
    expect(rows).toEqual([{ owner_id: alice }]);
  });

  it('lets exactly one of two accounts win a simultaneous request for one slot', async () => {
    const slotId = await freshSlot();
    const results = await Promise.allSettled([
      reserveSlotForUser(alice, aliceProfile, slotId),
      reserveSlotForUser(bob, bobProfile, slotId),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const loser = results.find((result) => result.status === 'rejected');
    expect(loser).toMatchObject({ reason: { kind: 'conflict' } });
  });

  it("refuses to book with another account's child profile", async () => {
    const slotId = await freshSlot();
    await expect(reserveSlotForUser(bob, aliceProfile, slotId))
      .rejects.toMatchObject({ kind: 'profile_not_found' });
    expect(await reservedFlag(slotId)).toBe(false);
  });

  it('treats unknown slots and past slots as conflicts', async () => {
    await expect(reserveSlotForUser(alice, aliceProfile, randomUUID()))
      .rejects.toMatchObject({ kind: 'conflict' });

    const { rows: [specialist] } = await test.pool.query('select id from public.specialists where active limit 1');
    const pastId = randomUUID();
    await test.pool.query(
      `insert into public.slots (id, specialist_id, starts_at, ends_at)
       values ($1, $2, now() - interval '2 hours', now() - interval '1 hour')`,
      [pastId, specialist.id],
    );
    await expect(reserveSlotForUser(alice, aliceProfile, pastId))
      .rejects.toMatchObject({ kind: 'conflict' });
  });

  it('does not offer slots of an inactive specialist', async () => {
    const { rows: [specialist] } = await test.pool.query(
      "select id from public.specialists where display_name = 'Нурай Касымова'",
    );
    const slotId = randomUUID();
    await test.pool.query(
      `insert into public.slots (id, specialist_id, starts_at, ends_at)
       values ($1, $2, now() + interval '3 days', now() + interval '3 days 50 minutes')`,
      [slotId, specialist.id],
    );
    await test.pool.query('update public.specialists set active = false where id = $1', [specialist.id]);
    try {
      await expect(reserveSlotForUser(alice, aliceProfile, slotId))
        .rejects.toMatchObject({ kind: 'conflict' });
      expect(await getSlotForReview(slotId)).toMatchObject({ available: false });
    } finally {
      await test.pool.query('update public.specialists set active = true where id = $1', [specialist.id]);
    }
  });
});

describe('cancellation rules', () => {
  it('cancels, frees the slot, and a repeated cancel returns the same result', async () => {
    const slotId = await freshSlot();
    const booking = await reserveSlotForUser(alice, aliceProfile, slotId);

    expect(await cancelBookingForUser(alice, booking.id)).toEqual({ id: booking.id, status: 'cancelled' });
    expect(await cancelBookingForUser(alice, booking.id)).toEqual({ id: booking.id, status: 'cancelled' });
    expect(await reservedFlag(slotId)).toBe(false);

    // The freed slot can be booked again by someone else.
    await expect(reserveSlotForUser(bob, bobProfile, slotId)).resolves.toMatchObject({ status: 'confirmed' });
  });

  it("does not let another account cancel or even see someone's booking", async () => {
    const slotId = await freshSlot();
    const booking = await reserveSlotForUser(alice, aliceProfile, slotId);

    await expect(cancelBookingForUser(bob, booking.id))
      .rejects.toMatchObject({ kind: 'booking_not_found' });
    await expect(cancelBookingForUser(bob, randomUUID()))
      .rejects.toMatchObject({ kind: 'booking_not_found' });
    expect(await getBookingForUser(bob, booking.id)).toBeNull();
    expect(await reservedFlag(slotId)).toBe(true);
  });

  it('refuses to cancel once the session has started', async () => {
    const { rows: [specialist] } = await test.pool.query('select id from public.specialists where active limit 1');
    const slotId = randomUUID();
    await test.pool.query(
      `insert into public.slots (id, specialist_id, starts_at, ends_at)
       values ($1, $2, now() + interval '10 minutes', now() + interval '60 minutes')`,
      [slotId, specialist.id],
    );
    const booking = await reserveSlotForUser(alice, aliceProfile, slotId);
    await test.pool.query(
      `update public.slots set starts_at = now() - interval '1 hour', ends_at = now() - interval '10 minutes'
       where id = $1`,
      [slotId],
    );

    await expect(cancelBookingForUser(alice, booking.id)).rejects.toMatchObject({ kind: 'cannot_cancel' });
  });
});

describe('reads', () => {
  it('scopes bookings to their owner and joins profile, session and specialist', async () => {
    const carol = await test.createUser('carol@example.invalid');
    const carolProfile = (await saveProfileForUser(carol, { ...input, nickname: 'Самал' })).id;
    const slotId = await freshSlot();
    const booking = await reserveSlotForUser(carol, carolProfile, slotId);

    const list = await getBookingsForUser(carol);
    expect(list).toEqual([expect.objectContaining({
      id: booking.id, status: 'confirmed', childNickname: 'Самал',
      specialistName: expect.any(String), specialistRoleKk: expect.any(String),
    })]);
    expect(await getBookingForUser(carol, booking.id)).toMatchObject({ id: booking.id });
    expect(await getBookingsForUser(await test.createUser('nobody@example.invalid'))).toEqual([]);
  });

  it('picks the next upcoming confirmed appointment and ignores cancelled ones', async () => {
    const dave = await test.createUser('dave@example.invalid');
    const daveProfile = (await saveProfileForUser(dave, input)).id;
    const slotId = await freshSlot();
    const booking = await reserveSlotForUser(dave, daveProfile, slotId);

    expect(await getNextBookingForUser(dave)).toMatchObject({ id: booking.id });
    await cancelBookingForUser(dave, booking.id);
    expect(await getNextBookingForUser(dave)).toBeNull();
  });

  it('reports review availability for open, reserved, inactive and past slots', async () => {
    const open = await freshSlot();
    expect(await getSlotForReview(open)).toMatchObject({ id: open, available: true });
    expect(await getSlotForReview(randomUUID())).toBeNull();

    await reserveSlotForUser(alice, aliceProfile, open);
    expect(await getSlotForReview(open)).toMatchObject({ available: false });

    const inactive = await freshSlot();
    await test.pool.query('update public.slots set active = false where id = $1', [inactive]);
    expect(await getSlotForReview(inactive)).toMatchObject({ available: false });

    const { rows: [specialist] } = await test.pool.query('select id from public.specialists where active limit 1');
    const past = randomUUID();
    await test.pool.query(
      `insert into public.slots (id, specialist_id, starts_at, ends_at)
       values ($1, $2, now() - interval '2 hours', now() - interval '1 hour')`,
      [past, specialist.id],
    );
    expect(await getSlotForReview(past)).toMatchObject({ available: false });
  });

  it('hides database error details behind a generic message', async () => {
    const spy = vi.spyOn(test.pool, 'query').mockRejectedValue(new Error('private diagnostic'));
    try {
      await expect(getBookingsForUser(alice)).rejects.toThrow('Booking service unavailable');
      await expect(getSlotForReview(randomUUID())).rejects.toThrow('Booking service unavailable');
      await expect(reserveSlotForUser(alice, aliceProfile, randomUUID()))
        .rejects.toThrow('Booking service unavailable');
    } finally {
      spy.mockRestore();
    }
  });
});

describe('canCancelBooking', () => {
  const base = {
    id: 'b', status: 'confirmed' as const, childNickname: 'n', specialistId: 's',
    specialistName: 'n', specialistRole: 'r', specialistRoleKk: 'r',
    startsAt: '2099-01-01T10:00:00.000Z', endsAt: '2099-01-01T10:50:00.000Z',
  };
  it('allows only confirmed bookings that have not started', () => {
    expect(canCancelBooking(base)).toBe(true);
    expect(canCancelBooking({ ...base, status: 'cancelled' })).toBe(false);
    expect(canCancelBooking({ ...base, startsAt: '2000-01-01T10:00:00.000Z' })).toBe(false);
  });
});
