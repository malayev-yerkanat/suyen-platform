import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createServerSupabaseClient: createClient }));
import { getSpecialistById, getSpecialistDirectory } from '@/lib/data/specialists';

const id = '11111111-1111-4111-8111-111111111111';
const row = { id, display_name: 'Demo', role: 'Role', role_kk: 'Рөл', support_area: 'speech_language', languages: ['ru'], description: 'Example', description_kk: 'Мысал' };
function query(result: unknown) {
  const chain = { select: vi.fn(), eq: vi.fn(), gt: vi.fn(), order: vi.fn(), then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve) };
  for (const method of ['select', 'eq', 'gt', 'order'] as const) chain[method].mockReturnValue(chain);
  return chain;
}
function setup(specialists: unknown = [row], slots: unknown = [], error: unknown = null) {
  const specialistQuery = query({ data: specialists, error });
  const slotQuery = query({ data: slots, error: null });
  createClient.mockResolvedValue({ from: (table: string) => table === 'specialists' ? specialistQuery : slotQuery });
  return { specialistQuery, slotQuery };
}
beforeEach(() => vi.clearAllMocks());
describe('specialist queries', () => {
  it('rejects invalid identifiers without querying', async () => {
    expect(await getSpecialistById('bad')).toBeNull();
    expect(createClient).not.toHaveBeenCalled();
  });
  it('scopes both queries to an active specialist and available future slots', async () => {
    const { specialistQuery, slotQuery } = setup([row], [{ id, specialist_id: id, starts_at: '2030-01-01T10:00:00Z', ends_at: '2030-01-01T10:50:00Z' }]);
    expect((await getSpecialistById(id))?.slots).toHaveLength(1);
    expect(specialistQuery.eq).toHaveBeenCalledWith('id', id);
    expect(specialistQuery.eq).toHaveBeenCalledWith('active', true);
    expect(slotQuery.eq).toHaveBeenCalledWith('specialist_id', id);
    expect(slotQuery.eq).toHaveBeenCalledWith('reserved', false);
    expect(slotQuery.gt).toHaveBeenCalledWith('starts_at', expect.any(String));
  });
  it('returns null for missing or inactive specialists', async () => {
    setup([]);
    expect(await getSpecialistById(id)).toBeNull();
  });
  it('retains specialists without available times', async () => {
    setup();
    expect(await getSpecialistDirectory()).toEqual([expect.objectContaining({ id, slots: [] })]);
  });
  it('fails cleanly on unavailable client and query errors', async () => {
    createClient.mockResolvedValue(null);
    await expect(getSpecialistDirectory()).rejects.toThrow('Directory is unavailable');
    setup([], [], { message: 'private details' });
    await expect(getSpecialistById(id)).rejects.toThrow('Directory is unavailable');
  });
  it('rejects malformed slot intervals', async () => {
    setup([row], [{ id, specialist_id: id, starts_at: '2030-01-01T10:00:00Z', ends_at: '2030-01-01T09:50:00Z' }]);
    await expect(getSpecialistById(id)).rejects.toThrow();
  });
});
