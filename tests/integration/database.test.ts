// @vitest-environment node
import { randomUUID } from 'node:crypto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { beforeAll, describe, expect, it } from 'vitest';

const url = process.env.TEST_SUPABASE_URL;
const key = process.env.TEST_SUPABASE_PUBLISHABLE_KEY;
const email = process.env.TEST_DEMO_EMAIL;
const password = process.env.TEST_DEMO_PASSWORD;

const configured = Boolean(url && key && email && password);

function client(): SupabaseClient {
  return createClient(url!, key!, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

describe.skipIf(!configured)('Supabase demo database contract', () => {
  let signedIn: SupabaseClient;
  let ownerId: string;

  async function profileIdFor(account: SupabaseClient, accountOwnerId: string) {
    const { data: existing, error: readError } = await account.from('child_profiles')
      .select('id').eq('owner_id', accountOwnerId).maybeSingle();
    expect(readError).toBeNull();
    if (existing) return existing.id as string;
    const { data: created, error: createError } = await account.from('child_profiles')
      .insert({
        owner_id: accountOwnerId,
        nickname: 'Тест',
        age_band: '7_10',
        preferred_language: 'ru',
        support_area: 'speech_language',
      })
      .select('id').single();
    expect(createError).toBeNull();
    return created!.id as string;
  }

  beforeAll(async () => {
    signedIn = client();
    const { data, error } = await signedIn.auth.signInWithPassword({
      email: email!,
      password: password!,
    });
    if (error || !data.user) {
      throw new Error(`Could not sign in to isolated test project: ${error?.message}`);
    }
    ownerId = data.user.id;
  });

  it('denies directory reads to anonymous users', async () => {
    const anonymous = client();
    const { data, error } = await anonymous.from('specialists').select('id');
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  it('allows signed-in directory reads with four areas and an empty specialist', async () => {
    const { data: specialists, error: specialistsError } = await signedIn
      .from('specialists')
      .select('id,support_area,languages');
    expect(specialistsError).toBeNull();
    expect(new Set(specialists?.map((item) => item.support_area)).size).toBe(4);

    const { data: slots, error: slotsError } = await signedIn
      .from('slots')
      .select('specialist_id')
      .gt('starts_at', new Date().toISOString());
    expect(slotsError).toBeNull();
    expect(specialists?.some((specialist) =>
      !slots?.some((slot) => slot.specialist_id === specialist.id),
    )).toBe(true);
  });

  it('keeps reservation, replay, direct writes, and cancellation consistent', async () => {
    const profileId = await profileIdFor(signedIn, ownerId);

    const { data: availableSlots, error: slotError } = await signedIn
      .from('slots')
      .select('id')
      .eq('active', true)
      .eq('reserved', false)
      .gt('starts_at', new Date().toISOString())
      .order('starts_at')
      .limit(1);
    expect(slotError).toBeNull();
    const slotId = availableSlots?.[0]?.id;
    expect(slotId).toBeTruthy();

    try {
      const [first, second] = await Promise.all([
        signedIn.rpc('reserve_slot', { profile_id: profileId, slot_id: slotId }),
        signedIn.rpc('reserve_slot', { profile_id: profileId, slot_id: slotId }),
      ]);
      expect(first.error).toBeNull();
      expect(second.error).toBeNull();
      expect(first.data?.id).toBe(second.data?.id);

      const { data: confirmed } = await signedIn
        .from('bookings')
        .select('id')
        .eq('slot_id', slotId)
        .eq('status', 'confirmed');
      expect(confirmed).toHaveLength(1);

      const { data: reservedSlot } = await signedIn
        .from('slots')
        .select('reserved')
        .eq('id', slotId)
        .single();
      expect(reservedSlot?.reserved).toBe(true);

      const { error: illegalUpdate } = await signedIn
        .from('bookings')
        .update({ slot_id: slotId })
        .eq('id', first.data!.id);
      expect(illegalUpdate).not.toBeNull();

      const { error: illegalInsert } = await signedIn
        .from('bookings')
        .insert({
          owner_id: ownerId,
          child_profile_id: '00000000-0000-4000-8000-000000000000',
          slot_id: slotId,
          status: 'confirmed',
        });
      expect(illegalInsert?.message).toBe('profile_not_found');

      const { data: cancelled, error: cancelError } = await signedIn
        .rpc('cancel_booking', { booking_id: first.data!.id });
      expect(cancelError).toBeNull();
      expect(cancelled?.status).toBe('cancelled');

      const { data: availableAgain } = await signedIn
        .from('slots')
        .select('reserved')
        .eq('id', slotId)
        .single();
      expect(availableAgain?.reserved).toBe(false);

      const { error: illegalReplay } = await signedIn
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', first.data!.id);
      expect(illegalReplay).not.toBeNull();
    } finally {
      // A failed assertion must not leave a future slot reserved in this test project.
      const { data: active } = await signedIn
        .from('bookings')
        .select('id')
        .eq('slot_id', slotId)
        .eq('status', 'confirmed');
      if (active?.[0]) {
        await signedIn.rpc('cancel_booking', { booking_id: active[0].id });
      }
    }
  });

  it('enforces the same reservation and cancellation rules on direct writes', async () => {
    const profileId = await profileIdFor(signedIn, ownerId);
    const { data: slots } = await signedIn.from('slots').select('id')
      .eq('active', true).eq('reserved', false)
      .gt('starts_at', new Date().toISOString())
      .order('starts_at').limit(1);
    const slotId = slots?.[0]?.id as string;
    expect(slotId).toBeTruthy();

    try {
      const { data: booking, error: insertError } = await signedIn
        .from('bookings')
        .insert({
          owner_id: ownerId,
          child_profile_id: profileId,
          slot_id: slotId,
          status: 'confirmed',
        })
        .select('id,status').single();
      expect(insertError).toBeNull();
      expect(booking?.status).toBe('confirmed');

      const { data: occupied } = await signedIn.from('slots')
        .select('reserved').eq('id', slotId).single();
      expect(occupied?.reserved).toBe(true);

      const { data: cancelled, error: updateError } = await signedIn
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', booking!.id)
        .select('status').single();
      expect(updateError).toBeNull();
      expect(cancelled?.status).toBe('cancelled');

      const { data: availableAgain } = await signedIn.from('slots')
        .select('reserved').eq('id', slotId).single();
      expect(availableAgain?.reserved).toBe(false);

      const { error: illegalReplay } = await signedIn.from('bookings')
        .update({ status: 'confirmed' }).eq('id', booking!.id);
      expect(illegalReplay?.message).toBe('invalid_booking_change');
    } finally {
      const { data: active } = await signedIn.from('bookings').select('id')
        .eq('slot_id', slotId).eq('status', 'confirmed');
      if (active?.[0]) {
        await signedIn.rpc('cancel_booking', { booking_id: active[0].id });
      }
    }
  });

  it.skipIf(!process.env.TEST_OTHER_EMAIL || !process.env.TEST_OTHER_PASSWORD)(
    'does not expose another account’s profile or booking',
    async () => {
      const other = client();
      const { error: signInError } = await other.auth.signInWithPassword({
        email: process.env.TEST_OTHER_EMAIL!,
        password: process.env.TEST_OTHER_PASSWORD!,
      });
      expect(signInError).toBeNull();
      const { data: profiles } = await other
        .from('child_profiles')
        .select('id')
        .eq('owner_id', ownerId);
      const { data: bookings } = await other
        .from('bookings')
        .select('id')
        .eq('owner_id', ownerId);
      expect(profiles).toEqual([]);
      expect(bookings).toEqual([]);
    },
  );

  it.skipIf(!process.env.TEST_OTHER_EMAIL || !process.env.TEST_OTHER_PASSWORD)(
    'confirms exactly one direct insert when different accounts race for a slot',
    async () => {
      const other = client();
      const { data: otherAuth, error: otherSignInError } = await other.auth.signInWithPassword({
        email: process.env.TEST_OTHER_EMAIL!,
        password: process.env.TEST_OTHER_PASSWORD!,
      });
      expect(otherSignInError).toBeNull();
      const otherOwnerId = otherAuth.user!.id;

      const [firstProfileId, secondProfileId] = await Promise.all([
        profileIdFor(signedIn, ownerId),
        profileIdFor(other, otherOwnerId),
      ]);
      const { data: slots } = await signedIn.from('slots').select('id')
        .eq('active', true).eq('reserved', false)
        .gt('starts_at', new Date().toISOString())
        .order('starts_at').limit(1);
      const slotId = slots?.[0]?.id as string;
      expect(slotId).toBeTruthy();

      try {
        const results = await Promise.all([
          signedIn.from('bookings').insert({
            owner_id: ownerId,
            child_profile_id: firstProfileId,
            slot_id: slotId,
            status: 'confirmed',
          }).select('id').single(),
          other.from('bookings').insert({
            owner_id: otherOwnerId,
            child_profile_id: secondProfileId,
            slot_id: slotId,
            status: 'confirmed',
          }).select('id').single(),
        ]);
        expect(results.filter((result) => !result.error)).toHaveLength(1);
        expect(results.find((result) => result.error)?.error?.message).toBe('slot_conflict');

        const losingAccount = results[0].error ? signedIn : other;
        const losingProfileId = results[0].error ? firstProfileId : secondProfileId;
        const { error: rpcConflict } = await losingAccount.rpc('reserve_slot', {
          profile_id: losingProfileId,
          slot_id: slotId,
        });
        expect(rpcConflict?.message).toBe('slot_conflict');
        const { data: confirmed } = await signedIn.from('slots')
          .select('reserved').eq('id', slotId).single();
        expect(confirmed?.reserved).toBe(true);
      } finally {
        for (const account of [signedIn, other]) {
          const { data: ownBooking } = await account.from('bookings').select('id')
            .eq('slot_id', slotId).eq('status', 'confirmed').maybeSingle();
          if (ownBooking) {
            await account.rpc('cancel_booking', { booking_id: ownBooking.id });
          }
        }
      }
    },
  );

  it.skipIf(!process.env.TEST_OTHER_EMAIL || !process.env.TEST_OTHER_PASSWORD)(
    'confirms exactly one RPC when different accounts race for a slot',
    async () => {
      const other = client();
      const { data: otherAuth, error: signInError } = await other.auth.signInWithPassword({
        email: process.env.TEST_OTHER_EMAIL!,
        password: process.env.TEST_OTHER_PASSWORD!,
      });
      expect(signInError).toBeNull();
      const [firstProfileId, secondProfileId] = await Promise.all([
        profileIdFor(signedIn, ownerId),
        profileIdFor(other, otherAuth.user!.id),
      ]);
      const { data: slots } = await signedIn.from('slots').select('id')
        .eq('active', true).eq('reserved', false)
        .gt('starts_at', new Date().toISOString())
        .order('starts_at').limit(1);
      const slotId = slots?.[0]?.id as string;
      expect(slotId).toBeTruthy();

      try {
        const results = await Promise.all([
          signedIn.rpc('reserve_slot', { profile_id: firstProfileId, slot_id: slotId }),
          other.rpc('reserve_slot', { profile_id: secondProfileId, slot_id: slotId }),
        ]);
        expect(results.filter((result) => !result.error)).toHaveLength(1);
        expect(results.find((result) => result.error)?.error?.message).toBe('slot_conflict');
        const { data: slot } = await signedIn.from('slots')
          .select('reserved').eq('id', slotId).single();
        expect(slot?.reserved).toBe(true);
      } finally {
        for (const account of [signedIn, other]) {
          const { data: ownBooking } = await account.from('bookings').select('id')
            .eq('slot_id', slotId).eq('status', 'confirmed').maybeSingle();
          if (ownBooking) {
            await account.rpc('cancel_booking', { booking_id: ownBooking.id });
          }
        }
      }
    },
  );

  it.skipIf(!process.env.TEST_SUPABASE_SERVICE_ROLE_KEY)(
    'rejects a past slot and cancellation after slot start',
    async () => {
      // Only an isolated test project service key may create timing fixtures.
      const admin = createClient(url!, process.env.TEST_SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: specialist, error: directoryError } = await signedIn
        .from('specialists').select('id').limit(1).single();
      expect(directoryError).toBeNull();
      const profileId = await profileIdFor(signedIn, ownerId);
      const pastId = randomUUID();
      const futureId = randomUUID();
      let bookingId: string | undefined;

      try {
        const { error: pastFixtureError } = await admin.from('slots').insert({
          id: pastId,
          specialist_id: specialist!.id,
          starts_at: new Date(Date.now() - 3_600_000).toISOString(),
          ends_at: new Date(Date.now() - 3_000_000).toISOString(),
        });
        expect(pastFixtureError).toBeNull();
        const { error: pastReservationError } = await signedIn.rpc('reserve_slot', {
          profile_id: profileId,
          slot_id: pastId,
        });
        expect(pastReservationError?.message).toBe('slot_conflict');

        const { error: futureFixtureError } = await admin.from('slots').insert({
          id: futureId,
          specialist_id: specialist!.id,
          starts_at: new Date(Date.now() + 600_000).toISOString(),
          ends_at: new Date(Date.now() + 3_600_000).toISOString(),
        });
        expect(futureFixtureError).toBeNull();
        const { data: booking, error: bookingError } = await signedIn.rpc('reserve_slot', {
          profile_id: profileId,
          slot_id: futureId,
        });
        expect(bookingError).toBeNull();
        bookingId = booking?.id;

        const { error: moveError } = await admin.from('slots')
          .update({
            starts_at: new Date(Date.now() - 3_600_000).toISOString(),
            ends_at: new Date(Date.now() - 3_000_000).toISOString(),
          })
          .eq('id', futureId);
        expect(moveError).toBeNull();
        const { error: lateCancelError } = await signedIn.rpc('cancel_booking', {
          booking_id: bookingId,
        });
        expect(lateCancelError?.message).toBe('cannot_cancel');
      } finally {
        if (bookingId) {
          await admin.from('bookings').delete().eq('id', bookingId);
        }
        await admin.from('slots').delete().in('id', [pastId, futureId]);
      }
    },
  );
});
