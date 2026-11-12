import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { PGlite, types } from '@electric-sql/pglite';

const root = process.cwd();

/** The slice of pg.Pool the data modules use, backed by an in-process PostgreSQL. */
export type TestPool = {
  // Rows are untyped on purpose: tests read arbitrary columns, as pg.Pool allows.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: (text: string, values?: unknown[]) => Promise<{ rows: any[]; rowCount: number }>;
};

export type TestDb = {
  db: PGlite;
  pool: TestPool;
  createUser: (email: string) => Promise<string>;
  close: () => Promise<void>;
};

export function readMigrations(): { name: string; sql: string }[] {
  const directory = join(root, 'db', 'migrations');
  return readdirSync(directory)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) => ({ name, sql: readFileSync(join(directory, name), 'utf8') }));
}

/**
 * Real PostgreSQL (PGlite), the real migrations and the real seed. timestamptz is
 * returned as ISO strings, exactly like the application pool in lib/db.ts.
 */
export async function createTestDb(): Promise<TestDb> {
  const db = await PGlite.create({
    parsers: { [types.TIMESTAMPTZ]: (value: string) => new Date(value).toISOString() },
  });
  for (const migration of readMigrations()) await db.exec(migration.sql);
  await db.exec(readFileSync(join(root, 'db', 'seed.sql'), 'utf8'));

  const pool: TestPool = {
    async query(text, values) {
      const result = await db.query(text, values);
      return { rows: result.rows, rowCount: result.affectedRows ?? result.rows.length };
    },
  };

  return {
    db,
    pool,
    async createUser(email) {
      const { rows } = await db.query<{ id: string }>(
        'insert into "user" (name, email, "emailVerified") values ($1, $2, true) returning id',
        ['Synthetic tester', email],
      );
      return rows[0].id;
    },
    close: () => db.close(),
  };
}
