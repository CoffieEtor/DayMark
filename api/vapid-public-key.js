const push = require('./_lib/push');
module.exports = (req, res) => {
  if (!push.publicKey) return res.status(500).json({ error: 'VAPID public key not configured' });
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.json({ publicKey: push.publicKey });
};
