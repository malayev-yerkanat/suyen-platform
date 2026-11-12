import 'server-only';

import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';

import { authOptions } from '@/lib/auth-config';
import { getAuthPool } from '@/lib/db';

function createAuth() {
  const pool = getAuthPool();
  if (!pool) return null;
  // nextCookies lets server actions set the session cookie. No HTTP handler is
  // mounted: sign-in and sign-out happen only through our own server actions, so
  // there is no public sign-up or password endpoint to reach.
  return betterAuth({ ...authOptions(pool), plugins: [nextCookies()] });
}

type AuthInstance = NonNullable<ReturnType<typeof createAuth>>;

declare global {
  var __suyenAuth: AuthInstance | undefined;
}

/** Returns null when DATABASE_URL is not configured. */
export function getAuth(): AuthInstance | null {
  if (!globalThis.__suyenAuth) {
    const auth = createAuth();
    if (!auth) return null;
    globalThis.__suyenAuth = auth;
  }
  return globalThis.__suyenAuth;
}
