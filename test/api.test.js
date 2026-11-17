// Tests the Vercel API routes against an in-memory stand-in for Upstash Redis.
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');

const hashes = {};
const kv = {};
class FakeRedis {
  async hset(k, o) { hashes[k] = { ...(hashes[k] || {}), ...o }; }
  async hget(k, f) { return (hashes[k] || {})[f] ?? null; }
  async hdel(k, ...f) { f.forEach((x) => delete (hashes[k] || {})[x]); }
  async hgetall(k) { return hashes[k] ? { ...hashes[k] } : null; }
  async hlen(k) { return Object.keys(hashes[k] || {}).length; }
  async set(k, v) { kv[k] = v; }
  async get(k) { return kv[k] ?? null; }
}
const origLoad = Module._load;
const sent = [];
Module._load = function (req, ...a) {
  if (req === '@upstash/redis') return { Redis: FakeRedis };
  if (req === 'web-push') return { setVapidDetails() {}, sendNotification: async (sub, body) => { sent.push({ sub, body: JSON.parse(body) }); } };
  return origLoad.call(this, req, ...a);
};
process.env.UPSTASH_REDIS_REST_URL = 'x'; process.env.UPSTASH_REDIS_REST_TOKEN = 'y';
process.env.VAPID_PUBLIC_KEY = 'pub'; process.env.VAPID_PRIVATE_KEY = 'priv'; process.env.CRON_SECRET = 's3cret';

const call = async (handler, method, body, headers = {}) => {
  const res = { code: 200, body: null, headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
  await handler({ method, body, headers }, res);
  return res;
};
const subA = { endpoint: 'https://push.test/a', keys: { p256dh: 'k', auth: 'a' } };
const subB = { endpoint: 'https://push.test/b', keys: { p256dh: 'k', auth: 'a' } };
const api = (n) => require('../api/' + n);

test('subscribe validates input', async () => {
  assert.equal((await call(api('subscribe'), 'POST', { subscription: { endpoint: 'http://x' } })).code, 400);
  assert.equal((await call(api('subscribe'), 'GET')).code, 405);
  assert.equal((await call(api('subscribe'), 'POST', { subscription: subA })).code, 201);
  assert.equal((await call(api('subscribe'), 'POST', { subscription: subB })).code, 201);
});

test('schedule requires subscription and valid time', async () => {
  const base = { id: 'r1', title: 'T', reminderDate: '2026-11-15', reminderTime: '09:00', endpoint: subA.endpoint, tzOffset: 0 };
  assert.equal((await call(api('reminders/schedule'), 'POST', { reminder: { ...base, endpoint: 'https://unknown/x' } })).code, 400);
  assert.equal((await call(api('reminders/schedule'), 'POST', { reminder: { ...base, reminderTime: '25:00' } })).code, 400);
  assert.equal((await call(api('reminders/schedule'), 'POST', { reminder: base })).code, 201);
});

test('cron rejects bad secret', async () => {
  assert.equal((await call(api('cron'), 'GET', null, {})).code, 401);
  assert.equal((await call(api('cron'), 'GET', null, { authorization: 'Bearer nope' })).code, 401);
});

test('cron sends due reminders only to the owning device, once, honouring timezone', async () => {
  const { dueMs } = api('_lib/http');
  // 09:00 local in UTC+2 (tzOffset -120) is 07:00 UTC
  assert.equal(new Date(dueMs({ reminderDate: '2026-11-15', reminderTime: '09:00', tzOffset: -120 })).toISOString(), '2026-11-15T07:00:00.000Z');
  const hdr = { authorization: 'Bearer s3cret' };
  const r = await call(api('cron'), 'GET', null, hdr);
  assert.deepEqual([r.code, r.body.sent], [200, 1]);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].sub.endpoint, subA.endpoint);   // not subB
  assert.equal(sent[0].body.title, 'DAYMARK: T');
  assert.equal((await call(api('cron'), 'GET', null, hdr)).body.sent, 0); // not re-sent
  // future reminder is not sent
  await call(api('reminders/schedule'), 'POST', { reminder: { id: 'r2', title: 'F', reminderDate: '2999-01-01', reminderTime: '09:00', endpoint: subA.endpoint, tzOffset: 0 } });
  assert.equal((await call(api('cron'), 'GET', null, hdr)).body.sent, 0);
});

test('cancel only by owner; unsubscribe removes reminders; test-push is per device', async () => {
  assert.equal(Object.keys(hashes['dm:reminders']).includes('r2'), true);
  await call(api('reminders/cancel'), 'POST', { reminderId: 'r2', endpoint: subB.endpoint });
  assert.equal(Object.keys(hashes['dm:reminders']).includes('r2'), true);
  await call(api('reminders/cancel'), 'POST', { reminderId: 'r2', endpoint: subA.endpoint });
  assert.equal(Object.keys(hashes['dm:reminders']).includes('r2'), false);
  sent.length = 0;
  assert.equal((await call(api('test-push'), 'POST', { endpoint: subB.endpoint })).code, 200);
  assert.equal(sent[0].sub.endpoint, subB.endpoint);
  assert.equal((await call(api('test-push'), 'POST', {})).code, 400);
  await call(api('unsubscribe'), 'POST', { endpoint: subA.endpoint });
  assert.equal(Object.keys(hashes['dm:subs']).length, 1);
  const h = await call(api('health'), 'GET');
  assert.deepEqual([h.code, h.body.vapidConfigured], [200, true]);
});

test('sync/push and sync/pull transfer snapshot by one-time code', async () => {
  const pushRes = await call(api('sync/push'), 'POST', { data: { app: 'DAYMARK', schemaVersion: 1, data: { tasks: [{ id: 't1' }], reminders: [], wishlist: [], settings: [] } } });
  assert.equal(pushRes.code, 201);
  assert.match(pushRes.body.code, /^[A-Z0-9]{6}$/);

  const pullRes = { code: 200, body: null, headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
  await api('sync/pull')({ method: 'GET', query: { code: pushRes.body.code }, headers: {} }, pullRes);
  assert.equal(pullRes.code, 200);
  assert.equal(pullRes.body.data.data.tasks[0].id, 't1');

  const missRes = { code: 200, body: null, headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
  await api('sync/pull')({ method: 'GET', query: { code: 'ZZZZZZ' }, headers: {} }, missRes);
  assert.equal(missRes.code, 404);
});
