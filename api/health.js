const push = require('./_lib/push');
module.exports = async (req, res) => {
  const out = { status: 'healthy', timestamp: new Date().toISOString(), vapidConfigured: push.configured, cronSecretConfigured: !!process.env.CRON_SECRET };
  try { out.activeSubscriptions = await require('./_lib/store').countSubscriptions(); out.storage = 'ok'; }
  catch (e) { out.status = 'degraded'; out.storage = 'not configured'; }
  res.status(out.status === 'healthy' ? 200 : 503).json(out);
};
