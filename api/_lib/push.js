const webpush = require('web-push');

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
if (publicKey && privateKey) {
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.com', publicKey, privateKey);
}

module.exports = {
  publicKey,
  configured: !!(publicKey && privateKey),
  /** Returns { ok } or { ok:false, gone:true } when the subscription has expired. */
  async send(subscription, payload) {
    if (!publicKey || !privateKey) return { ok: false, error: 'VAPID keys not configured' };
    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload));
      return { ok: true };
    } catch (err) {
      return { ok: false, gone: err.statusCode === 404 || err.statusCode === 410, error: err.message };
    }
  },
};
