import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/server', () => ({ createServerSupabaseClient: mocks.create }));
import { getBookingsForUser, getNextBookingForUser } from '@/lib/data/bookings';
const owner = '11111111-1111-4111-8111-111111111111';
const id = '22222222-2222-4222-8222-222222222222';
const records: Record<string, unknown[]> = {
  bookings: [{ id, owner_id: owner, child_profile_id: id, slot_id: id, status: 'confirmed' }],
  child_profiles: [{ id, nickname: 'Demo' }],
  slots: [{ id, starts_at: '2099-10-27T10:00:00Z', ends_at: '2099-10-27T10:50:00Z', specialist_id: id, active: true, reserved: true }],
  specialists: [{ id, display_name: 'Demo', role: 'Role', role_kk: 'Рөл', active: true }],
};
function setup(overrides: Record<string, unknown[]> = {}, failed?: string) {
  const queries: Record<string, { select: ReturnType<typeof vi.fn>; eq: ReturnType<typeof vi.fn>; in: ReturnType<typeof vi.fn> }> = {};
  const from = vi.fn((table: string) => {
    const result = { data: overrides[table] ?? records[table], error: table === failed ? { message: 'private database detail' } : null };
    const query = { select: vi.fn(), eq: vi.fn(), in: vi.fn(), then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve) };
    query.select.mockReturnValue(query); query.eq.mockReturnValue(query); query.in.mockReturnValue(query);
    queries[table] = query;
    return query;
  });
  mocks.create.mockResolvedValue({ from });
  return { from, queries };
}
describe('batched appointment reads', () => {
  beforeEach(() => vi.clearAllMocks());
  it('scopes bookings and profiles to owner and batches all relationships in four queries', async () => {
    const { from, queries } = setup();
    expect(await getBookingsForUser(owner)).toEqual([expect.objectContaining({ id, specialistId: id, childNickname: 'Demo', specialistRoleKk: 'Рөл' })]);
    expect(from).toHaveBeenCalledTimes(4);
    expect(queries.bookings.eq).toHaveBeenCalledWith('owner_id', owner);
    expect(queries.child_profiles.eq).toHaveBeenCalledWith('owner_id', owner);
    expect(queries.slots.in).toHaveBeenCalledWith('id', [id]);
  });
  it('returns an empty result without relation requests', async () => {
    const { from } = setup({ bookings: [] });
    expect(await getBookingsForUser(owner)).toEqual([]);
    expect(from).toHaveBeenCalledTimes(1);
  });
  it('rejects rows belonging to another account even if returned by storage', async () => {
    setup({ bookings: [{ ...(records.bookings[0] as object), owner_id: id }] });
    await expect(getBookingsForUser(owner)).rejects.toThrow('Booking details unavailable');
  });
  it.each(['bookings', 'child_profiles', 'slots', 'specialists'])('handles %s read failures without exposing database messages', async (table) => {
    setup({}, table);
    await expect(getBookingsForUser(owner)).rejects.toThrow('Booking details unavailable');
  });
  it.each(['child_profiles', 'slots', 'specialists'])('rejects missing %s relationships', async (table) => {
    setup({ [table]: [] });
    await expect(getBookingsForUser(owner)).rejects.toThrow('Booking details unavailable');
  });
  it('selects only future confirmed appointments for dashboard', async () => {
    setup();
    expect(await getNextBookingForUser(owner)).toMatchObject({ id });
    setup({ bookings: [{ ...(records.bookings[0] as object), status: 'cancelled' }] });
    expect(await getNextBookingForUser(owner)).toBeNull();
  });
  it('reports unavailable client', async () => {
    mocks.create.mockResolvedValue(null);
    await expect(getBookingsForUser(owner)).rejects.toThrow('Booking service unavailable');
  });
});
