import type { BetterAuthOptions } from 'better-auth';
import type { Pool } from 'pg';

/**
 * Shared Better Auth options. Kept free of Next.js imports so scripts and tests can
 * build the same configuration against any pg-compatible pool.
 *
 * Sign-up is off for the running app: the shared demo account is created out of
 * band with `npm run db:create-demo-user`, which passes allowSignUp.
 */
export function authOptions(
  pool: Pool,
  { allowSignUp = false }: { allowSignUp?: boolean } = {},
): BetterAuthOptions {
  return {
    database: pool,
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    emailAndPassword: {
      enabled: true,
      disableSignUp: !allowSignUp,
      autoSignIn: false,
      minPasswordLength: 12,
    },
    // uuid ids let application tables reference "user" (id) with a real foreign key.
    advanced: { database: { generateId: 'uuid' } },
  };
}
