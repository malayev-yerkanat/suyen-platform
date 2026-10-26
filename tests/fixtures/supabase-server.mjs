/** Loopback-only synthetic protocol fixture. This does NOT test PostgreSQL or RLS. */
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

const userId = '10000000-0000-4000-8000-000000000001';
const profileId = '20000000-0000-4000-8000-000000000001';
const specialistId = '30000000-0000-4000-8000-000000000001';
const user = { id: userId, aud: 'authenticated', role: 'authenticated', email: 'fixture@suyen.example', email_confirmed_at: new Date().toISOString(), app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: userId, exp: Math.floor(Date.now() / 1000) + 86400, role: 'authenticated' })}.fixture`;
const initial = () => ({
  child_profiles: [{ id: profileId, owner_id: userId, nickname: 'Demo child', age_band: '4_6', preferred_language: 'ru', support_area: 'speech_language' }],
  specialists: [
    { id: specialistId, display_name: 'Демо специалист', role: 'Логопед', role_kk: 'Логопед', support_area: 'speech_language', languages: ['ru', 'kk'], description: 'Демонстрационный профиль специалиста.', description_kk: 'Маманның демонстрациялық профилі.', active: true },
    { id: '30000000-0000-4000-8000-000000000002', display_name: 'Нет времени', role: 'Логопед', role_kk: 'Логопед', support_area: 'speech_language', languages: ['ru', 'kk'], description: 'Без доступного времени.', description_kk: 'Бос уақыт жоқ.', active: true },
  ],
  slots: Array.from({ length: 6 }, (_, i) => ({ id: `40000000-0000-4000-8000-00000000000${i + 1}`, specialist_id: specialistId, starts_at: new Date(Date.now() + (i + 1) * 86400000).toISOString(), ends_at: new Date(Date.now() + (i + 1) * 86400000 + 3000000).toISOString(), active: true, reserved: false })),
  bookings: [], demo_feedback: [],
});
let database = initial();
let failFeedback = false;
let loseFeedbackResponse = false;
const matches = (row, params) => [...params].every(([key, filter]) => {
  if (['select', 'order', 'limit', 'on_conflict'].includes(key)) return true;
  const [op, ...parts] = filter.split('.');
  const value = parts.join('.');
  if (op === 'eq') return String(row[key]) === value;
  if (op === 'gt') return row[key] > value;
  if (op === 'in') return value.slice(1, -1).split(',').includes(String(row[key]));
  return true;
});

createServer(async (request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1');
  const send = (status, data) => { response.writeHead(status, { 'Content-Type': 'application/json' }); response.end(JSON.stringify(data)); };
  let raw = '';
  for await (const chunk of request) raw += chunk;
  const body = raw ? JSON.parse(raw) : {};
  if (url.pathname === '/health') return send(200, { ready: true });
  if (url.pathname === '/__fixture/reset') { database = initial(); failFeedback = false; return send(200, {}); }
  if (url.pathname === '/__fixture/feedback-failure') { failFeedback = Boolean(body.enabled); return send(200, {}); }
  if (url.pathname === '/__fixture/lose-feedback-response') { loseFeedbackResponse = true; return send(200, {}); }
  if (url.pathname === '/__fixture/past-booking') {
    const slot = { ...database.slots[0], id: '40000000-0000-4000-8000-000000000099', starts_at: new Date(Date.now() - 86400000).toISOString(), ends_at: new Date(Date.now() - 83400000).toISOString(), reserved: true };
    database = { ...database, slots: [...database.slots, slot], bookings: [...database.bookings, { id: '50000000-0000-4000-8000-000000000099', owner_id: userId, child_profile_id: profileId, slot_id: slot.id, status: 'confirmed' }] };
    return send(200, {});
  }
  if (url.pathname === '/__fixture/state') return send(200, database);
  if (url.pathname === '/auth/v1/token') {
    if (url.searchParams.get('grant_type') !== 'refresh_token' && (body.email !== user.email || body.password !== 'fixture-password')) return send(400, { error_code: 'invalid_credentials', msg: 'Invalid credentials' });
    return send(200, { access_token: token, token_type: 'bearer', expires_in: 86400, refresh_token: 'fixture-refresh', user });
  }
  if (url.pathname === '/auth/v1/user') return request.headers.authorization === `Bearer ${token}` ? send(200, user) : send(401, { msg: 'Unauthorized' });
  if (url.pathname === '/auth/v1/logout') return send(200, {});
  if (!url.pathname.startsWith('/rest/v1/') || request.headers.authorization !== `Bearer ${token}`) return send(401, { message: 'Unauthorized' });
  if (url.pathname === '/rest/v1/rpc/reserve_slot') {
    const slot = database.slots.find(row => row.id === body.slot_id);
    if (!slot || slot.reserved) return send(409, { message: 'slot_conflict' });
    const booking = { id: randomUUID(), owner_id: userId, child_profile_id: profileId, slot_id: slot.id, status: 'confirmed' };
    database = { ...database, bookings: [...database.bookings, booking], slots: database.slots.map(row => row.id === slot.id ? { ...row, reserved: true } : row) };
    return send(200, booking);
  }
  if (url.pathname === '/rest/v1/rpc/cancel_booking') {
    const booking = database.bookings.find(row => row.id === body.booking_id);
    if (!booking) return send(404, { message: 'booking_not_found' });
    const cancelled = { ...booking, status: 'cancelled' };
    database = { ...database, bookings: database.bookings.map(row => row.id === booking.id ? cancelled : row), slots: database.slots.map(row => row.id === booking.slot_id ? { ...row, reserved: false } : row) };
    return send(200, cancelled);
  }
  const table = url.pathname.split('/').at(-1);
  if (!database[table]) return send(404, { message: 'Unknown table' });
  if (table === 'demo_feedback' && failFeedback) return send(503, { message: 'Fixture service unavailable' });
  let rows = database[table].filter(row => matches(row, url.searchParams));
  if (request.method === 'PATCH') {
    rows = rows.map(row => ({ ...row, ...body }));
    database = { ...database, [table]: database[table].map(row => rows.find(updated => updated.id === row.id) ?? row) };
  } else if (request.method === 'POST') {
    const row = { id: randomUUID(), created_at: new Date().toISOString(), ...body };
    const duplicate = table === 'demo_feedback' && database[table].find(old => old.id === row.id || (row.submission_id && old.submission_id === row.submission_id));
    if (duplicate) {
      if (!request.headers.prefer?.includes('ignore-duplicates')) return send(409, { code: '23505', message: 'Duplicate submission' });
      rows = [];
    } else { database = { ...database, [table]: [...database[table], row] }; rows = [row];
      if (table === 'demo_feedback' && loseFeedbackResponse) { loseFeedbackResponse = false; return send(503, { message: 'Synthetic lost response after commit' }); }
    }
  }
  const order = url.searchParams.get('order')?.split('.')[0];
  if (order) rows = [...rows].sort((a, b) => String(a[order]).localeCompare(String(b[order])));
  const single = request.headers.accept?.includes('vnd.pgrst.object');
  return send(200, single ? rows[0] ?? null : rows);
}).listen(54329, '127.0.0.1');
