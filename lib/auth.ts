import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { getAuth } from '@/lib/auth-server';

const baseUrl = 'https://suyen.invalid';

export type DemoUser = { id: string; email: string };

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

/** The signed-in user, or null. Never throws: an unreachable database means signed out. */
export async function getDemoUser(): Promise<DemoUser | null> {
  const auth = getAuth();
  if (!auth) return null;
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    return session ? { id: session.user.id, email: session.user.email } : null;
  } catch {
    // An unavailable Auth service must never allow access to a protected page.
    return null;
  }
}

export async function requireDemoUser(next = '/demo'): Promise<DemoUser> {
  const user = await getDemoUser();
  if (user) return user;

  redirect(`/demo/login?next=${encodeURIComponent(safeDemoPath(next))}`);
}
