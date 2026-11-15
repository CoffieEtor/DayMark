// Sends due reminders. Called every few minutes by GitHub Actions (free) or Vercel Cron (Pro).
// Protected by CRON_SECRET: send header  Authorization: Bearer <CRON_SECRET>.
const store = require('./_lib/store');
const push = require('./_lib/push');
const { dueMs } = require('./_lib/http');

module.exports = async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ error: 'Unauthorized' });
  const now = Date.now();
  let sent = 0, removed = 0;
  for (const r of await store.allReminders()) {
    const due = dueMs(r);
    if (r.sent || r.completed) {
      if (now - due > store.RETENTION_MS) { await store.cancelReminder(r.id); removed++; }
      continue;
    }
    if (due > now) continue;
    const sub = await store.getSubscription(r.endpoint);
    if (!sub) { await store.cancelReminder(r.id); removed++; continue; }
    const out = await push.send(sub, { title: `DAYMARK: ${r.title}`, body: r.description || `Reminder scheduled for ${r.reminderTime}`, icon: './assets/icons/icon-192.png', url: './index.html#reminders', id: r.id });
    if (out.ok) { await store.saveReminder({ ...r, sent: true, sentAt: now }); sent++; }
    else if (out.gone) { await store.removeSubscription(r.endpoint); removed++; }
  }
  res.json({ success: true, sent, removed });
};
