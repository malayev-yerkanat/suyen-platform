import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/server', () => ({ createServerSupabaseClient: mocks.create }));
import { cancelBookingForUser, canCancelBooking, getBookingForUser, getSlotForReview, reserveSlotForUser } from '@/lib/data/bookings';
const owner = '11111111-1111-4111-8111-111111111111';
const id = '22222222-2222-4222-8222-222222222222';
const other = '33333333-3333-4333-8333-333333333333';
const booking = { id, owner_id: owner, child_profile_id: id, slot_id: id, status: 'confirmed' };
const slot = { id, starts_at: '2026-10-27T10:00:00Z', ends_at: '2026-10-27T10:50:00Z', specialist_id: id, active: true, reserved: false };
const specialist = { id, display_name: 'Demo', role: 'Role', role_kk: 'Рөл', active: true };
const defaults: Record<string, unknown> = { bookings: booking, slots: slot, specialists: specialist, child_profiles: { id, nickname: 'Demo child' } };
function setup(overrides: Record<string, unknown> = {}, failed?: string) {
  const queries: Record<string, { eq: ReturnType<typeof vi.fn> }> = {};
  const from = vi.fn((table: string) => {
    const result = { data: Object.hasOwn(overrides, table) ? overrides[table] : defaults[table], error: failed === table ? { message: 'private diagnostic' } : null };
    const query = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn().mockResolvedValue(result) };
    query.select.mockReturnValue(query); query.eq.mockReturnValue(query);
    queries[table] = query;
    return query;
  });
  const rpc = vi.fn().mockResolvedValue({ data: booking, error: null });
  mocks.create.mockResolvedValue({ from, rpc });
  return { from, rpc, queries };
}
beforeEach(() => { vi.clearAllMocks(); vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-26T10:00:00Z')); });
afterEach(() => vi.restoreAllMocks());

describe('slot review boundary', () => {
  it('returns a future active unreserved session and localized specialist fields', async () => {
    const { queries } = setup();
    expect(await getSlotForReview(id)).toEqual({ id, specialistName: 'Demo', specialistRole: 'Role', specialistRoleKk: 'Рөл', startsAt: slot.starts_at, endsAt: slot.ends_at, available: true });
    expect(queries.slots.eq).toHaveBeenCalledWith('id', id);
    expect(queries.specialists.eq).toHaveBeenCalledWith('id', id);
  });
  it.each([
    { slots: { ...slot, active: false } },
    { slots: { ...slot, reserved: true } },
    { slots: { ...slot, starts_at: '2026-10-26T10:00:00Z' } },
    { slots: { ...slot, starts_at: '2026-10-25T10:00:00Z' } },
    { specialists: { ...specialist, active: false } },
  ])('marks unusable slots unavailable', async (overrides) => {
    setup(overrides);
    expect(await getSlotForReview(id)).toMatchObject({ available: false });
  });
  it.each(['slots', 'specialists'])('returns null when %s is missing', async (table) => {
    setup({ [table]: null });
    expect(await getSlotForReview(id)).toBeNull();
  });
  it.each(['slots', 'specialists'])('hides %s diagnostic errors', async (table) => {
    setup({}, table);
    await expect(getSlotForReview(id)).rejects.toThrow('Booking service unavailable');
  });
});

describe('booking detail boundary', () => {
  it('scopes the booking and profile to the requested account and enriches its details', async () => {
    const { queries } = setup();
    const result = await getBookingForUser(owner, id);
    expect(result).toMatchObject({ id, specialistId: id, childNickname: 'Demo child', specialistName: 'Demo', status: 'confirmed' });
    expect(queries.bookings.eq).toHaveBeenCalledWith('owner_id', owner);
    expect(queries.bookings.eq).toHaveBeenCalledWith('id', id);
    expect(queries.child_profiles.eq).toHaveBeenCalledWith('owner_id', owner);
    expect(canCancelBooking(result!)).toBe(true);
    expect(canCancelBooking({ ...result!, status: 'cancelled' })).toBe(false);
    expect(canCancelBooking({ ...result!, startsAt: '2026-10-26T10:00:00Z' })).toBe(false);
  });
  it('returns null without loading relations when the owner-visible booking is missing', async () => {
    const { from } = setup({ bookings: null });
    expect(await getBookingForUser(owner, id)).toBeNull();
    expect(from).toHaveBeenCalledTimes(1);
  });
  it.each(['bookings', 'child_profiles', 'slots', 'specialists'])('handles %s query errors', async (table) => {
    setup({}, table);
    await expect(getBookingForUser(owner, id)).rejects.toThrow('Booking details unavailable');
  });
  it.each(['child_profiles', 'slots', 'specialists'])('handles missing %s relationships', async (table) => {
    setup({ [table]: null });
    await expect(getBookingForUser(owner, id)).rejects.toThrow('Booking details unavailable');
  });
});

describe('booking RPC boundaries', () => {
  it('reserves with only profile/slot inputs and validates the returned account', async () => {
    const { rpc } = setup();
    expect(await reserveSlotForUser(owner, id, id)).toEqual({ id, status: 'confirmed' });
    expect(rpc).toHaveBeenCalledWith('reserve_slot', { profile_id: id, slot_id: id });
  });
  it('cancels with only booking id', async () => {
    const { rpc } = setup();
    rpc.mockResolvedValue({ data: { ...booking, status: 'cancelled' }, error: null });
    expect(await cancelBookingForUser(owner, id)).toEqual({ id, status: 'cancelled' });
    expect(rpc).toHaveBeenCalledWith('cancel_booking', { booking_id: id });
  });
  it.each(['owner_id', 'child_profile_id', 'slot_id'])('rejects mismatched reserve %s', async (field) => {
    const { rpc } = setup();
    rpc.mockResolvedValue({ data: { ...booking, [field]: other }, error: null });
    await expect(reserveSlotForUser(owner, id, id)).rejects.toThrow('Booking response mismatch');
  });
  it.each(['owner_id', 'id'])('rejects mismatched cancellation %s', async (field) => {
    const { rpc } = setup();
    rpc.mockResolvedValue({ data: { ...booking, [field]: other }, error: null });
    await expect(cancelBookingForUser(owner, id)).rejects.toThrow('Booking response mismatch');
  });
  it.each([
    [{ message: 'slot_conflict' }, 'conflict'],
    [{ message: 'private diagnostic', code: '23505' }, 'conflict'],
    [{ message: 'profile_not_found' }, 'profile_not_found'],
    [{ message: 'booking_not_found' }, 'booking_not_found'],
    [{ message: 'cannot_cancel' }, 'cannot_cancel'],
  ])('maps expected reservation errors to safe typed failures', async (error, kind) => {
    const { rpc } = setup();
    rpc.mockResolvedValue({ data: null, error });
    await expect(reserveSlotForUser(owner, id, id)).rejects.toMatchObject({ name: 'BookingFailure', kind });
  });
  it('maps cancellation failures through the same boundary', async () => {
    const { rpc } = setup();
    rpc.mockResolvedValue({ data: null, error: { message: 'cannot_cancel' } });
    await expect(cancelBookingForUser(owner, id)).rejects.toMatchObject({ kind: 'cannot_cancel' });
  });
  it('hides unexpected database error details', async () => {
    const { rpc } = setup();
    rpc.mockResolvedValue({ data: null, error: { message: 'private diagnostic' } });
    await expect(reserveSlotForUser(owner, id, id)).rejects.toThrow('Booking service unavailable');
  });
  it('rejects malformed successful RPC responses', async () => {
    const { rpc } = setup();
    rpc.mockResolvedValue({ data: { id: 'invalid' }, error: null });
    await expect(reserveSlotForUser(owner, id, id)).rejects.toThrow();
  });
});
