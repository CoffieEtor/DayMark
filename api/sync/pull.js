const store = require('../_lib/store');
const { method } = require('../_lib/http');

module.exports = async (req, res) => {
  if (!method(req, res, 'GET')) return;
  const raw = (req.query && req.query.code) || '';
  const code = String(raw).trim().toUpperCase();
  if (!/^[A-Z0-9]{6,8}$/.test(code)) {
    return res.status(400).json({ error: 'Valid sync code required' });
  }
  const data = await store.getSyncSnapshot(code);
  if (!data) {
    return res.status(404).json({ error: 'Sync code not found or expired' });
  }
  res.status(200).json({ data });
};
