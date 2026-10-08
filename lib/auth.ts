import type { User } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';

import { createServerSupabaseClient } from '@/lib/supabase/server';

const baseUrl = 'https://suyen.invalid';

export function safeDemoPath(destination: string | undefined | null): string {
  if (!destination || !destination.startsWith('/') || destination.startsWith('//')) return '/demo';
  if (/[\\\u0000-\u001f\u007f]/.test(destination)) return '/demo';

  try {
    const url = new URL(destination, baseUrl);
    if (url.origin !== baseUrl || !/^\/demo(?:\/|$)/.test(url.pathname)) return '/demo';
    return `${url.pathname}${url.search}`;
  } catch {
    return '/demo';
  }
}

export async function requireDemoUser(next = '/demo'): Promise<User> {
  const client = await createServerSupabaseClient();
  if (client) {
    try {
      const { data: { user }, error } = await client.auth.getUser();
      if (!error && user) return user;
    } catch {
      // An unavailable Auth service must never allow access to a protected page.
    }
  }

  redirect(`/demo/login?next=${encodeURIComponent(safeDemoPath(next))}`);
}
