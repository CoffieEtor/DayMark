const store = require('./_lib/store');
const { method, isEndpoint } = require('./_lib/http');
module.exports = async (req, res) => {
  if (!method(req, res, 'POST')) return;
  const endpoint = req.body && req.body.endpoint;
  if (!isEndpoint(endpoint)) return res.status(400).json({ error: 'Endpoint required' });
  await store.removeSubscription(endpoint);
  res.json({ success: true });
};
