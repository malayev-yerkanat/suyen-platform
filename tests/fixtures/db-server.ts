/**
 * Loopback-only synthetic backend for the browser tests: a real in-process PostgreSQL
 * (PGlite) with the real migrations, the real Better Auth tables and one fixture
 * account. The app connects to it through DATABASE_URL exactly as it would to Neon.
 *
 *   54332  PGlite wire-protocol server (internal)
 *   54330  fault-injecting TCP proxy the app connects to
 *   54329  HTTP control surface: /health, /__fixture/*
 *
 * The control endpoints exist only in this test process and are never app routes.
 */
import { createServer as createHttpServer } from 'node:http';
import net from 'node:net';

import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { betterAuth } from 'better-auth';
import pg from 'pg';

import { authOptions } from '../../lib/auth-config';
import { readMigrations } from '../helpers/test-db';

const CONTROL_PORT = 54329;
const PROXY_PORT = 54330;
const DB_PORT = 54332;

const FIXTURE_EMAIL = 'fixture@suyen.example';
const FIXTURE_PASSWORD = 'fixture-password';

const specialistId = '30000000-0000-4000-8000-000000000001';
const emptySpecialistId = '30000000-0000-4000-8000-000000000002';
const pastSlotId = '40000000-0000-4000-8000-000000000099';
const pastBookingId = '50000000-0000-4000-8000-000000000099';

process.env.BETTER_AUTH_SECRET ??= 'fixture-secret-that-is-at-least-thirty-two-chars';
process.env.BETTER_AUTH_URL ??= 'http://127.0.0.1:3107';

const db = await PGlite.create();
for (const migration of readMigrations()) await db.exec(migration.sql);
const dbServer = new PGLiteSocketServer({ db, port: DB_PORT, host: '127.0.0.1', maxConnections: 12 });
await dbServer.start();

const adminPool = new pg.Pool({
  connectionString: `postgres://postgres:postgres@127.0.0.1:${DB_PORT}/postgres`,
  max: 1,
});
await betterAuth(authOptions(adminPool, { allowSignUp: true })).api.signUpEmail({
  body: { name: 'Fixture account', email: FIXTURE_EMAIL, password: FIXTURE_PASSWORD },
});
const { rows: [fixtureUser] } = await adminPool.query('select id from "user" where email = $1', [FIXTURE_EMAIL]);
const ownerId = fixtureUser.id as string;

const day = 86_400_000;
const sql = (value: Date) => value.toISOString();

async function reset() {
  await adminPool.query(`
    delete from public.demo_feedback;
    delete from public.bookings;
    delete from public.slots;
    delete from public.specialists;
    delete from public.child_profiles;
  `);
  await adminPool.query(
    `insert into public.child_profiles (owner_id, nickname, age_band, preferred_language, support_area)
     values ($1, 'Demo child', '4_6', 'ru', 'speech_language')`,
    [ownerId],
  );
  await adminPool.query(
    `insert into public.specialists
       (id, display_name, role, role_kk, support_area, languages, description, description_kk)
     values
       ($1, 'Демо специалист', 'Логопед', 'Логопед', 'speech_language', array['ru','kk'],
        'Демонстрационный профиль специалиста.', 'Маманның демонстрациялық профилі.'),
       ($2, 'Нет времени', 'Логопед', 'Логопед', 'speech_language', array['ru','kk'],
        'Без доступного времени.', 'Бос уақыт жоқ.')`,
    [specialistId, emptySpecialistId],
  );
  for (let index = 1; index <= 6; index += 1) {
    const start = new Date(Date.now() + index * day);
    await adminPool.query(
      'insert into public.slots (id, specialist_id, starts_at, ends_at) values ($1, $2, $3, $4)',
      [`40000000-0000-4000-8000-00000000000${index}`, specialistId, sql(start), sql(new Date(+start + 3_000_000))],
    );
  }
}

async function addPastBooking() {
  const start = new Date(Date.now() - day);
  await adminPool.query(
    `insert into public.slots (id, specialist_id, starts_at, ends_at, reserved)
     values ($1, $2, $3, $4, true)`,
    [pastSlotId, specialistId, sql(start), sql(new Date(+start + 3_000_000))],
  );
  await adminPool.query(
    `insert into public.bookings (id, owner_id, child_profile_id, slot_id, status)
     select $1, $2, id, $3, 'confirmed' from public.child_profiles where owner_id = $2`,
    [pastBookingId, ownerId, pastSlotId],
  );
}

async function state() {
  const tables = ['child_profiles', 'specialists', 'slots', 'bookings', 'demo_feedback'];
  const entries = await Promise.all(tables.map(async (table) => [
    table, (await adminPool.query(`select * from public.${table}`)).rows,
  ] as const));
  return Object.fromEntries(entries);
}

await reset();

// --- Fault injection -------------------------------------------------------
// "failure": the save never reaches the database and the connection drops.
// "lose":    the save is committed, then the connection drops before the app
//            hears back, so the app must retry safely.
const faults = { feedbackFailure: false, loseFeedbackResponse: false };
const FEEDBACK_INSERT = 'insert into public.demo_feedback';

const proxy = net.createServer((client) => {
  const upstream = net.connect(DB_PORT, '127.0.0.1');
  let dropping = false;
  let timer: NodeJS.Timeout | undefined;
  const closeBoth = () => { client.destroy(); upstream.destroy(); };

  client.on('data', (chunk) => {
    const isFeedbackInsert = chunk.toString('latin1').toLowerCase().includes(FEEDBACK_INSERT);
    if (isFeedbackInsert && faults.feedbackFailure) return closeBoth();
    if (isFeedbackInsert && faults.loseFeedbackResponse) {
      faults.loseFeedbackResponse = false;
      dropping = true;
    }
    upstream.write(chunk);
    if (dropping) {
      clearTimeout(timer);
      timer = setTimeout(closeBoth, 300);
    }
  });
  upstream.on('data', (chunk) => { if (!dropping) client.write(chunk); });
  client.on('close', () => upstream.destroy());
  upstream.on('close', () => client.destroy());
  client.on('error', () => upstream.destroy());
  upstream.on('error', () => client.destroy());
});
proxy.listen(PROXY_PORT, '127.0.0.1');

// --- Control surface -------------------------------------------------------
createHttpServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1');
  const send = (status: number, data: unknown) => {
    response.writeHead(status, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(data));
  };
  let raw = '';
  for await (const chunk of request) raw += chunk;
  const body = raw ? JSON.parse(raw) : {};

  try {
    if (url.pathname === '/health') return send(200, { ready: true });
    if (url.pathname === '/__fixture/reset') {
      faults.feedbackFailure = false;
      faults.loseFeedbackResponse = false;
      await reset();
      return send(200, {});
    }
    if (url.pathname === '/__fixture/feedback-failure') {
      faults.feedbackFailure = Boolean(body.enabled);
      return send(200, {});
    }
    if (url.pathname === '/__fixture/lose-feedback-response') {
      faults.loseFeedbackResponse = true;
      return send(200, {});
    }
    if (url.pathname === '/__fixture/past-booking') {
      await addPastBooking();
      return send(200, {});
    }
    if (url.pathname === '/__fixture/state') return send(200, await state());
    return send(404, { message: 'Unknown fixture endpoint' });
  } catch (error) {
    return send(500, { message: error instanceof Error ? error.message : 'Fixture error' });
  }
}).listen(CONTROL_PORT, '127.0.0.1');
