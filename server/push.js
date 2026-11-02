/* DAYMARK Server — Push Notification Sender */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const webpush = require('web-push');
const store = require('./database');

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || 'mailto:admin@daymark.local';

if (publicKey && privateKey) {
  webpush.setVapidDetails(subject, publicKey, privateKey);
} else {
  console.warn('[Push] VAPID keys not configured. Push notifications will be mocked.');
}

async function sendNotification(subscription, payload) {
  if (!publicKey || !privateKey) {
    return { success: false, reason: 'VAPID keys not configured' };
  }

  try {
    const stringifiedPayload = typeof payload === 'string' ? payload : JSON.stringify(payload);
    await webpush.sendNotification(subscription, stringifiedPayload);
    return { success: true };
  } catch (err) {
    console.error('[Push] Delivery failed for endpoint:', subscription.endpoint, err.statusCode, err.message);
    // If subscription is expired or unsubscribed (HTTP 410 or 404), purge it from store
    if (err.statusCode === 410 || err.statusCode === 404) {
      console.log('[Push] Removing expired subscription:', subscription.endpoint);
      store.removeSubscription(subscription.endpoint);
    }
    return { success: false, error: err };
  }
}

async function broadcastNotification(payload) {
  const subscriptions = store.getSubscriptions();
  const results = await Promise.all(
    subscriptions.map(sub => sendNotification(sub, payload))
  );
  return results;
}

module.exports = {
  sendNotification,
  broadcastNotification,
  getPublicKey: () => publicKey
};
