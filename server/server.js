/* DAYMARK Server — Express API & Static Server */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');

const store = require('./database');
const push = require('./push');
const scheduler = require('./scheduler');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static frontend files from project root
app.use(express.static(path.join(__dirname, '..')));

// Endpoint 1: VAPID Public Key
app.get('/api/vapid-public-key', (req, res) => {
  const publicKey = push.getPublicKey();
  if (!publicKey) {
    return res.status(500).json({ error: 'VAPID public key not configured' });
  }
  res.json({ publicKey });
});

// Endpoint 2: Register Push Subscription
app.post('/api/subscribe', (req, res) => {
  const { subscription } = req.body;
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Valid subscription object required' });
  }

  store.addSubscription(subscription);
  console.log('[API] New push subscription registered:', subscription.endpoint.slice(0, 40) + '...');
  res.status(201).json({ success: true, message: 'Subscription saved' });
});

// Endpoint 3: Unsubscribe
app.post('/api/unsubscribe', (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) {
    return res.status(400).json({ error: 'Endpoint required' });
  }

  store.removeSubscription(endpoint);
  console.log('[API] Subscription removed:', endpoint.slice(0, 40) + '...');
  res.json({ success: true, message: 'Subscription removed' });
});

// Endpoint 4: Schedule Reminder
app.post('/api/reminders/schedule', (req, res) => {
  const { reminder } = req.body;
  if (!reminder || !reminder.id) {
    return res.status(400).json({ error: 'Valid reminder required' });
  }

  store.scheduleReminder(reminder);
  res.status(201).json({ success: true, message: 'Reminder scheduled in backend' });
});

// Endpoint 5: Cancel Scheduled Reminder
app.post('/api/reminders/cancel', (req, res) => {
  const { reminderId } = req.body;
  if (!reminderId) {
    return res.status(400).json({ error: 'reminderId required' });
  }

  store.cancelReminder(reminderId);
  res.json({ success: true, message: 'Scheduled reminder cancelled' });
});

// Endpoint 6: Test Push Notification
app.post('/api/test-push', async (req, res) => {
  const subscriptions = store.getSubscriptions();
  if (subscriptions.length === 0) {
    return res.status(400).json({ error: 'No active push subscriptions registered on this server.' });
  }

  const payload = {
    title: 'DAYMARK — Push Verification',
    body: 'Test push notification received successfully from DAYMARK server.',
    icon: './assets/icons/icon-192.png',
    url: './index.html#settings',
    id: 'test-push-' + Date.now()
  };

  const results = await push.broadcastNotification(payload);
  res.json({ success: true, deliveredTo: results.length, results });
});

// Endpoint 7: Health & Diagnostics
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    activeSubscriptions: store.getSubscriptions().length,
    pendingReminders: store.getPendingReminders().length,
    vapidConfigured: !!push.getPublicKey()
  });
});

// Start scheduler background loop
scheduler.start(30000);

// Start server
app.listen(PORT, () => {
  console.log(`[DAYMARK] Server running on http://localhost:${PORT}`);
  console.log(`[DAYMARK] Static app served directly from root directory.`);
});
