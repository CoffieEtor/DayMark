// Small helpers shared by the API routes.
exports.method = (req, res, m) => {
  if (req.method !== m) { res.setHeader('Allow', m); res.status(405).json({ error: 'Method not allowed' }); return false; }
  return true;
};
exports.isEndpoint = (e) => typeof e === 'string' && e.length < 2048 && /^https:\/\//.test(e);
exports.isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
exports.isTime = (s) => typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
/** Epoch ms when a reminder is due. tzOffset is JS getTimezoneOffset() (minutes, UTC - local). */
exports.dueMs = (r) => {
  const [y, m, d] = r.reminderDate.split('-').map(Number);
  const [h, min] = (r.reminderTime || '09:00').split(':').map(Number);
  return Date.UTC(y, m - 1, d, h, min) + (Number(r.tzOffset) || 0) * 60000;
};
