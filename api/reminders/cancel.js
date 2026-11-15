const store = require('../_lib/store');
const { method, isEndpoint } = require('../_lib/http');
module.exports = async (req, res) => {
  if (!method(req, res, 'POST')) return;
  const { reminderId, endpoint } = req.body || {};
  if (typeof reminderId !== 'string') return res.status(400).json({ error: 'reminderId required' });
  const existing = await store.getReminder(reminderId);
  // Only the owning device may cancel.
  if (existing && isEndpoint(endpoint) && existing.endpoint === endpoint) await store.cancelReminder(reminderId);
  res.json({ success: true });
};
