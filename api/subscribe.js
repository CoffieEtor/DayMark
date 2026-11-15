const store = require('./_lib/store');
const { method, isEndpoint } = require('./_lib/http');
module.exports = async (req, res) => {
  if (!method(req, res, 'POST')) return;
  const sub = req.body && req.body.subscription;
  if (!sub || !isEndpoint(sub.endpoint) || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) return res.status(400).json({ error: 'Valid subscription object required' });
  await store.addSubscription({ endpoint: sub.endpoint, expirationTime: sub.expirationTime ?? null, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } });
  res.status(201).json({ success: true });
};
