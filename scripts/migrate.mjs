// Applies db/migrations/*.sql in order, once each, or loads db/seed.sql with --seed.
// Usage: npm run db:migrate   |   npm run db:seed
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import pg from 'pg';

import { loadEnv } from './env.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
loadEnv(join(root, '.env.local'));

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Add it to .env.local (see .env.example).');
  process.exit(1);
}

const seed = process.argv.includes('--seed');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  // One runner at a time, even if two terminals start it together.
  await client.query('select pg_advisory_lock(727274)');

  if (seed) {
    await client.query(readFileSync(join(root, 'db', 'seed.sql'), 'utf8'));
    console.log('Seed applied (safe to rerun).');
  } else {
    await client.query(`create table if not exists public.schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )`);
    const { rows } = await client.query('select name from public.schema_migrations');
    const applied = new Set(rows.map((row) => row.name));
    const files = readdirSync(join(root, 'db', 'migrations')).filter((name) => name.endsWith('.sql')).sort();

    let count = 0;
    for (const name of files) {
      if (applied.has(name)) continue;
      await client.query('begin');
      try {
        await client.query(readFileSync(join(root, 'db', 'migrations', name), 'utf8'));
        await client.query('insert into public.schema_migrations (name) values ($1)', [name]);
        await client.query('commit');
      } catch (error) {
        await client.query('rollback');
        throw new Error(`Migration ${name} failed: ${error.message}`);
      }
      console.log(`Applied ${name}`);
      count += 1;
    }
    console.log(count === 0 ? 'Database is up to date.' : `Applied ${count} migration(s).`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
