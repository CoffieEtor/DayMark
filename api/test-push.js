const store = require('./_lib/store');
const push = require('./_lib/push');
const { method, isEndpoint } = require('./_lib/http');
module.exports = async (req, res) => {
  if (!method(req, res, 'POST')) return;
  const endpoint = req.body && req.body.endpoint;
  const sub = isEndpoint(endpoint) ? await store.getSubscription(endpoint) : null;
  if (!sub) return res.status(400).json({ error: 'This device is not subscribed.' });
  const r = await push.send(sub, { title: 'DAYMARK — Push Verification', body: 'Test push received from the DAYMARK server.', icon: './assets/icons/icon-192.png', url: './index.html#settings', id: 'test-' + Date.now() });
  if (r.gone) await store.removeSubscription(endpoint);
  res.status(r.ok ? 200 : 502).json({ success: r.ok });
};
