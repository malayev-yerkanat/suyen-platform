import 'server-only';

import pg from 'pg';

const TIMESTAMPTZ_OID = 1184;

/**
 * The application pool returns timestamptz columns as ISO-8601 strings, which is
 * what the data modules validate and what crosses the server/client boundary.
 * Better Auth gets its own pool (see lib/auth-server.ts) because it expects Dates.
 */
const isoTypes = {
  getTypeParser(oid: number, format?: 'text' | 'binary') {
    if (oid === TIMESTAMPTZ_OID) return (value: string) => new Date(value).toISOString();
    return pg.types.getTypeParser(oid, format as 'text');
  },
} as unknown as pg.CustomTypesConfig;

declare global {
  var __suyenAppPool: pg.Pool | undefined;
  var __suyenAuthPool: pg.Pool | undefined;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function createPool(extra: pg.PoolConfig): pg.Pool {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    ...extra,
  });
  // Neon closes idle connections. Without a listener, the pool's 'error' event
  // would crash the whole server process; the pool simply opens a new connection.
  pool.on('error', () => {
    console.warn('Database connection closed while idle; it will be reopened.');
  });
  return pool;
}

/** Pool for application queries. Returns null when DATABASE_URL is not set. */
export function getAppPool(): pg.Pool | null {
  if (!isDatabaseConfigured()) return null;
  globalThis.__suyenAppPool ??= createPool({ types: isoTypes });
  return globalThis.__suyenAppPool;
}

export function requireAppPool(): pg.Pool {
  const pool = getAppPool();
  if (!pool) throw new Error('Database is not configured');
  return pool;
}

/** Pool for Better Auth, which reads timestamps as Date objects. */
export function getAuthPool(): pg.Pool | null {
  if (!isDatabaseConfigured()) return null;
  globalThis.__suyenAuthPool ??= createPool({});
  return globalThis.__suyenAuthPool;
}
