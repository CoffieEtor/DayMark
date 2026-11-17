// Persistent store for Vercel functions (Upstash Redis over REST).
// Env vars (set automatically by the Vercel Upstash/Redis integration):
//   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN   (or KV_REST_API_URL + KV_REST_API_TOKEN)
const { Redis } = require('@upstash/redis');

let client;
function redis() {
  if (client) return client;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error('Redis is not configured (set UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN).');
  client = new Redis({ url, token });
  return client;
}

const SUBS = 'dm:subs';       // hash: endpoint -> subscription
const REMS = 'dm:reminders';  // hash: reminderId -> reminder
const RETENTION_MS = 7 * 24 * 3600 * 1000;

const parse = (v) => (typeof v === 'string' ? JSON.parse(v) : v);

module.exports = {
  RETENTION_MS,
  async addSubscription(sub) { await redis().hset(SUBS, { [sub.endpoint]: JSON.stringify(sub) }); },
  async removeSubscription(endpoint) {
    await redis().hdel(SUBS, endpoint);
    const all = (await redis().hgetall(REMS)) || {};
    const gone = Object.keys(all).filter((id) => parse(all[id]).endpoint === endpoint);
    if (gone.length) await redis().hdel(REMS, ...gone);
  },
  async getSubscription(endpoint) { const v = await redis().hget(SUBS, endpoint); return v ? parse(v) : null; },
  async countSubscriptions() { return redis().hlen(SUBS); },
  async saveReminder(r) { await redis().hset(REMS, { [r.id]: JSON.stringify(r) }); },
  async getReminder(id) { const v = await redis().hget(REMS, id); return v ? parse(v) : null; },
  async cancelReminder(id) { await redis().hdel(REMS, id); },
  async allReminders() {
    const all = (await redis().hgetall(REMS)) || {};
    return Object.values(all).map(parse);
  },
  async saveSyncSnapshot(code, payload, ttlSeconds = 900) {
    await redis().set(`dm:sync:${code}`, JSON.stringify(payload), { ex: ttlSeconds });
  },
  async getSyncSnapshot(code) {
    const v = await redis().get(`dm:sync:${code}`);
    return v ? parse(v) : null;
  },
};
