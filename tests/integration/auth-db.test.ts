// @vitest-environment node
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { betterAuth } from 'better-auth';
import { getMigrations } from 'better-auth/db/migration';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { authOptions } from '@/lib/auth-config';

import { readMigrations } from '../helpers/test-db';

const PORT = 54331;
const email = 'shared-demo@example.invalid';
const password = 'a-long-synthetic-password';

let db: PGlite;
let server: PGLiteSocketServer;
let pool: pg.Pool;

// Better Auth reads these when it is constructed.
vi.stubEnv('BETTER_AUTH_SECRET', 'test-secret-that-is-at-least-thirty-two-characters');
vi.stubEnv('BETTER_AUTH_URL', 'http://localhost:3000');

beforeAll(async () => {
  db = await PGlite.create();
  for (const migration of readMigrations()) await db.exec(migration.sql);
  server = new PGLiteSocketServer({ db, port: PORT, host: '127.0.0.1', maxConnections: 4 });
  await server.start();
  pool = new pg.Pool({ connectionString: `postgres://postgres:postgres@127.0.0.1:${PORT}/postgres`, max: 1 });

  // The one place sign-up is enabled: creating the shared account, as the script does.
  const creator = betterAuth(authOptions(pool, { allowSignUp: true }));
  await creator.api.signUpEmail({ body: { name: 'Süyen demo', email, password } });
});

afterAll(async () => {
  await pool.end();
  await server.stop();
  await db.close();
});

const runningApp = () => betterAuth(authOptions(pool));

function cookieHeader(response: Response): string {
  const set = response.headers.getSetCookie?.() ?? [response.headers.get('set-cookie') ?? ''];
  return set.map((cookie) => cookie.split(';')[0]).join('; ');
}

describe('Better Auth against the real migrations', () => {
  it('has every table and column Better Auth expects, so the SQL cannot drift', async () => {
    const { toBeCreated, toBeAdded } = await getMigrations(authOptions(pool));
    expect(toBeCreated).toEqual([]);
    expect(toBeAdded).toEqual([]);
  });

  it('uses uuid ids that application tables can reference', async () => {
    const { rows } = await pool.query('select id, "emailVerified" from "user" where email = $1', [email]);
    expect(rows[0].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

    await pool.query(
      `insert into public.child_profiles (owner_id, nickname, age_band, preferred_language, support_area)
       values ($1, 'Тест', '4_6', 'ru', 'speech_language')`,
      [rows[0].id],
    );
  });

  it('stores only a hash of the password', async () => {
    const { rows } = await pool.query(
      `select a.password from account a join "user" u on u.id = a."userId" where u.email = $1`, [email],
    );
    expect(rows[0].password).toBeTruthy();
    expect(rows[0].password).not.toContain(password);
  });
});

describe('the running app configuration', () => {
  it('does not allow public sign-up', async () => {
    await expect(runningApp().api.signUpEmail({
      body: { name: 'Intruder', email: 'intruder@example.invalid', password: 'another-long-password' },
    })).rejects.toBeDefined();
    const { rows } = await pool.query('select 1 from "user" where email = $1', ['intruder@example.invalid']);
    expect(rows).toHaveLength(0);
  });

  it('rejects short passwords when the account is created', async () => {
    await expect(betterAuth(authOptions(pool, { allowSignUp: true })).api.signUpEmail({
      body: { name: 'Short', email: 'short@example.invalid', password: 'short' },
    })).rejects.toBeDefined();
  });

  it('signs in with the right password and rejects the wrong one', async () => {
    const auth = runningApp();
    await expect(auth.api.signInEmail({ body: { email, password: 'not-the-password' } })).rejects.toBeDefined();
    await expect(auth.api.signInEmail({ body: { email: 'nobody@example.invalid', password } })).rejects.toBeDefined();

    const ok = await auth.api.signInEmail({ body: { email, password } });
    expect(ok.user.email).toBe(email);
  });

  it('keeps a session through its cookie and ends it on sign-out', async () => {
    const auth = runningApp();
    const response = await auth.api.signInEmail({ body: { email, password }, asResponse: true });
    const cookie = cookieHeader(response);
    expect(cookie).toContain('session_token=');

    const headers = new Headers({ cookie });
    const session = await auth.api.getSession({ headers });
    expect(session?.user.email).toBe(email);

    await auth.api.signOut({ headers });
    expect(await auth.api.getSession({ headers })).toBeNull();
  });

  it('treats a missing or forged cookie as signed out', async () => {
    const auth = runningApp();
    expect(await auth.api.getSession({ headers: new Headers() })).toBeNull();
    expect(await auth.api.getSession({
      headers: new Headers({ cookie: 'better-auth.session_token=forged.value' }),
    })).toBeNull();
  });
});
