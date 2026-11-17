const crypto = require('crypto');
const store = require('../_lib/store');
const { method } = require('../_lib/http');

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function makeCode(len = 6) {
  const bytes = crypto.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

module.exports = async (req, res) => {
  if (!method(req, res, 'POST')) return;
  const data = req.body && req.body.data;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Valid sync data required' });
  }
  const serialized = JSON.stringify(data);
  if (serialized.length > 512 * 1024) {
    return res.status(413).json({ error: 'Sync payload too large (max 512 KB)' });
  }
  const code = makeCode(6);
  await store.saveSyncSnapshot(code, data, 900);
  res.status(201).json({ code, expiresIn: 900 });
};
