const store = require('../_lib/store');
const { method, isEndpoint, isDate, isTime } = require('../_lib/http');
module.exports = async (req, res) => {
  if (!method(req, res, 'POST')) return;
  const r = req.body && req.body.reminder;
  if (!r || typeof r.id !== 'string' || r.id.length > 100) return res.status(400).json({ error: 'Valid reminder required' });
  if (!isDate(r.reminderDate) || !isTime(r.reminderTime || '09:00')) return res.status(400).json({ error: 'Invalid date or time' });
  // Reminders are private to the device that created them: it must be a known subscription.
  if (!isEndpoint(r.endpoint) || !(await store.getSubscription(r.endpoint))) return res.status(400).json({ error: 'Subscribe to push notifications first' });
  const tz = Number(r.tzOffset);
  await store.saveReminder({
    id: r.id, endpoint: r.endpoint,
    title: String(r.title || 'Reminder').slice(0, 200), description: String(r.description || '').slice(0, 500),
    reminderDate: r.reminderDate, reminderTime: r.reminderTime || '09:00',
    tzOffset: Number.isFinite(tz) && Math.abs(tz) <= 14 * 60 ? tz : 0,
    completed: !!r.completed, sent: false,
  });
  res.status(201).json({ success: true });
};
