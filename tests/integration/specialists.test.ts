import { createClient } from '@supabase/supabase-js';
import { beforeAll, describe, expect, it } from 'vitest';

const url = process.env.TEST_SUPABASE_URL;
const key = process.env.TEST_SUPABASE_PUBLISHABLE_KEY;
const email = process.env.TEST_DEMO_EMAIL;
const password = process.env.TEST_DEMO_PASSWORD;
const configured = Boolean(url && key && email && password);

function client() {
  return createClient(url!, key!, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
}

describe.skipIf(!configured)('specialist directory database access', () => {
  let authenticated: ReturnType<typeof client>;

  beforeAll(async () => {
    authenticated = client();
    const { error } = await authenticated.auth.signInWithPassword({ email: email!, password: password! });
    if (error) throw error;
  });

  it('requires sign-in for specialists and slots', async () => {
    const anonymous = client();
    const [specialists, slots] = await Promise.all([
      anonymous.from('specialists').select('id'),
      anonymous.from('slots').select('id'),
    ]);
    expect(specialists.error).not.toBeNull();
    expect(slots.error).not.toBeNull();
  });

  it('exposes four synthetic support areas and future available slots', async () => {
    const [specialists, slots] = await Promise.all([
      authenticated.from('specialists').select('id,support_area,languages').eq('active', true),
      authenticated.from('slots').select('id,specialist_id,starts_at')
        .eq('active', true).eq('reserved', false).gt('starts_at', new Date().toISOString()),
    ]);
    expect(specialists.error).toBeNull();
    expect(slots.error).toBeNull();
    expect(new Set(specialists.data?.map((item) => item.support_area)).size).toBe(4);
    expect(slots.data?.length).toBeGreaterThan(0);
    expect(specialists.data?.some((item) =>
      !slots.data?.some((slot) => slot.specialist_id === item.id),
    )).toBe(true);
  });
});
