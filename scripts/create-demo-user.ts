// Creates the shared team demo account. Public sign-up stays off in the running
// app; this script is the only place that enables it, for one call.
// Usage: set DEMO_EMAIL and DEMO_PASSWORD in your shell (not in a file), then
//   npm run db:create-demo-user
import { join } from 'node:path';

import { betterAuth } from 'better-auth';
import pg from 'pg';

import { authOptions } from '../lib/auth-config';
import { loadEnv } from './env.mjs';

loadEnv(join(process.cwd(), '.env.local'));

const { DATABASE_URL, DEMO_EMAIL, DEMO_PASSWORD, BETTER_AUTH_SECRET } = process.env;
if (!DATABASE_URL || !BETTER_AUTH_SECRET) {
  console.error('DATABASE_URL and BETTER_AUTH_SECRET must be set in .env.local.');
  process.exit(1);
}
if (!DEMO_EMAIL || !DEMO_PASSWORD) {
  console.error('Set DEMO_EMAIL and DEMO_PASSWORD in this shell first. They are not stored anywhere.');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 1 });
try {
  const auth = betterAuth(authOptions(pool, { allowSignUp: true }));
  await auth.api.signUpEmail({
    body: { name: 'Süyen demo', email: DEMO_EMAIL, password: DEMO_PASSWORD },
  });
  console.log(`Created demo account ${DEMO_EMAIL}.`);
} catch (error) {
  console.error(`Could not create the account: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
