/* DAYMARK — QR Code Device Sync (Phone <-> Desktop, No Signup) */

const QrCode = (() => {
  // Compact QR Code generator (Versions 1-6, Byte mode, Error Correction M)
  const GF_EXP = new Uint8Array(512);
  const GF_LOG = new Uint8Array(256);
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];

  const gfMul = (a, b) => (a === 0 || b === 0 ? 0 : GF_EXP[GF_LOG[a] + GF_LOG[b]]);

  function rsGenerator(deg) {
    let poly = [1];
    for (let i = 0; i < deg; i++) {
      const next = new Array(poly.length + 1).fill(0);
      for (let j = 0; j < poly.length; j++) {
        next[j] ^= poly[j];
        next[j + 1] ^= gfMul(poly[j], GF_EXP[i]);
      }
      poly = next;
    }
    return poly;
  }

  function rsEncode(data, ecLen) {
    const gen = rsGenerator(ecLen);
    const res = new Array(data.length + ecLen).fill(0);
    for (let i = 0; i < data.length; i++) res[i] = data[i];
    for (let i = 0; i < data.length; i++) {
      const coef = res[i];
      if (coef !== 0) {
        for (let j = 0; j < gen.length; j++) res[i + j] ^= gfMul(gen[j], coef);
      }
    }
    return res.slice(data.length);
  }

  // Version specs for EC Level M: [totalDataBytes, ecBytesPerBlock, numBlocks, alignPositions]
  const VERSIONS = {
    1: [16, 10, 1, []],
    2: [28, 16, 1, [6, 18]],
    3: [44, 26, 1, [6, 22]],
    4: [64, 18, 2, [6, 26]],
    5: [86, 24, 2, [6, 30]],
    6: [108, 16, 4, [6, 34]],
  };

  function encode(text) {
    const bytes = new TextEncoder().encode(text);
    let ver = 1;
    while (ver <= 6 && bytes.length + 2 > VERSIONS[ver][0]) ver++;
    if (ver > 6) throw new Error('Sync URL too long for QR code');

    const [dataCap, ecPerBlock, blocks, align] = VERSIONS[ver];
    const bits = [];
    const pushBits = (val, len) => {
      for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1);
    };

    pushBits(0b0100, 4); // Byte mode
    pushBits(bytes.length, 8);
    for (const b of bytes) pushBits(b, 8);
    const maxBits = dataCap * 8;
    pushBits(0, Math.min(4, maxBits - bits.length));
    while (bits.length % 8 !== 0) bits.push(0);
    const padBytes = [0xec, 0x11];
    let padIdx = 0;
    while (bits.length < maxBits) {
      pushBits(padBytes[padIdx % 2], 8);
      padIdx++;
    }

    const codewords = [];
    for (let i = 0; i < bits.length; i += 8) {
      let b = 0;
      for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
      codewords.push(b);
    }

    const blockSize = Math.floor(dataCap / blocks);
    const dataBlocks = [];
    const ecBlocks = [];
    for (let b = 0; b < blocks; b++) {
      const slice = codewords.slice(b * blockSize, (b + 1) * blockSize);
      dataBlocks.push(slice);
      ecBlocks.push(rsEncode(slice, ecPerBlock));
    }

    const interleaved = [];
    for (let i = 0; i < blockSize; i++) {
      for (let b = 0; b < blocks; b++) interleaved.push(dataBlocks[b][i]);
    }
    for (let i = 0; i < ecPerBlock; i++) {
      for (let b = 0; b < blocks; b++) interleaved.push(ecBlocks[b][i]);
    }

    const size = ver * 4 + 17;
    const grid = Array.from({ length: size }, () => new Array(size).fill(null));
    const fixed = Array.from({ length: size }, () => new Array(size).fill(false));

    const setMod = (r, c, v, isFixed = true) => {
      if (r < 0 || r >= size || c < 0 || c >= size) return;
      grid[r][c] = v ? 1 : 0;
      if (isFixed) fixed[r][c] = true;
    };

    const drawFinder = (r0, c0) => {
      for (let r = -1; r <= 7; r++) {
        for (let c = -1; c <= 7; c++) {
          const inBounds = r >= 0 && r <= 6 && c >= 0 && c <= 6;
          const onEdge = r === 0 || r === 6 || c === 0 || c === 6;
          const inCore = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          setMod(r0 + r, c0 + c, inBounds && (onEdge || inCore));
        }
      }
    };

    drawFinder(0, 0);
    drawFinder(0, size - 7);
    drawFinder(size - 7, 0);

    for (let i = 8; i < size - 8; i++) {
      setMod(6, i, i % 2 === 0);
      setMod(i, 6, i % 2 === 0);
    }
    setMod(size - 8, 8, 1);

    for (const r of align) {
      for (const c of align) {
        if (fixed[r][c]) continue;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const on = Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0);
            setMod(r + dr, c + dc, on);
          }
        }
      }
    }

    // Reserve format info
    for (let i = 0; i < 9; i++) {
      if (!fixed[8][i]) setMod(8, i, 0);
      if (!fixed[i][8]) setMod(i, 8, 0);
    }
    for (let i = 0; i < 8; i++) {
      if (!fixed[8][size - 1 - i]) setMod(8, size - 1 - i, 0);
      if (!fixed[size - 1 - i][8]) setMod(size - 1 - i, 8, 0);
    }

    // Place data bits (mask 0: (r + c) % 2 === 0)
    let bitIdx = 0;
    const totalBits = interleaved.length * 8;
    let dir = -1;
    for (let col = size - 1; col > 0; col -= 2) {
      if (col === 6) col--;
      for (let row = dir === -1 ? size - 1 : 0; row >= 0 && row < size; row += dir) {
        for (let dc = 0; dc < 2; dc++) {
          const c = col - dc;
          if (fixed[row][c]) continue;
          let bit = 0;
          if (bitIdx < totalBits) {
            bit = (interleaved[bitIdx >> 3] >>> (7 - (bitIdx & 7))) & 1;
            bitIdx++;
          }
          if ((row + c) % 2 === 0) bit ^= 1;
          grid[row][c] = bit;
        }
      }
      dir *= -1;
    }

    // Format string for EC M (00) + Mask 0 (000) -> 0b00000 -> BCH+mask = 0x5412 (101010000010010)
    const fmt = 0x5412;
    for (let i = 0; i < 15; i++) {
      const bit = (fmt >>> i) & 1;
      if (i < 6) grid[i][8] = bit;
      else if (i < 8) grid[i + 1][8] = bit;
      else grid[size - 15 + i][8] = bit;

      if (i < 8) grid[8][size - 1 - i] = bit;
      else if (i < 9) grid[8][15 - i] = bit;
      else grid[8][14 - i] = bit;
    }

    return grid;
  }

  function toSvg(text) {
    const grid = encode(text);
    const n = grid.length;
    const quiet = 2;
    const total = n + quiet * 2;
    let paths = '';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (grid[r][c]) {
          paths += `M${c + quiet},${r + quiet}h1v1h-1z`;
        }
      }
    }
    return `<svg viewBox="0 0 ${total} ${total}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#ffffff"/><path d="${paths}" fill="#101114"/></svg>`;
  }

  return { toSvg };
})();

const Sync = {
  async generateQR() {
    const box = document.getElementById('syncQrContainer');
    const svgEl = document.getElementById('syncQrSvg');
    const codeEl = document.getElementById('syncCodeText');
    const btn = document.getElementById('settingsGenerateQrBtn');

    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Generating...';
    }

    try {
      const [tasks, reminders, wishlist, settings] = await Promise.all([
        DB.getAll(STORES.TASKS),
        DB.getAll(STORES.REMINDERS),
        DB.getAll(STORES.WISHLIST),
        DB.getAll(STORES.SETTINGS)
      ]);

      const payload = {
        app: 'DAYMARK',
        schemaVersion: Backup.SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        data: {
          tasks: tasks || [],
          reminders: reminders || [],
          wishlist: wishlist || [],
          settings: settings || []
        }
      };

      const res = await fetch('/api/sync/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: payload })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Sync server unavailable');
      }

      const { code } = await res.json();
      const syncUrl = `${window.location.origin}${window.location.pathname}#sync=${code}`;

      if (svgEl) svgEl.innerHTML = QrCode.toSvg(syncUrl);
      if (codeEl) codeEl.textContent = code;
      if (box) box.style.display = 'flex';
      Utils.showToast('Sync QR code ready (valid for 15 minutes)', 'success');
    } catch (err) {
      console.error('QR sync generation failed:', err);
      Utils.showToast('Sync unavailable: ' + err.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Generate QR';
      }
    }
  },

  async pullByCode(rawCode) {
    const code = String(rawCode || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{6,8}$/.test(code)) {
      Utils.showToast('Enter a valid 6-character sync code', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/sync/pull?code=${encodeURIComponent(code)}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Sync code not found or expired');
      }

      const { data: parsed } = await res.json();
      const validation = Backup.validateBackup(parsed);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      const { tasks, reminders, wishlist, settings } = parsed.data;
      const confirmed = await Utils.confirm({
        title: 'Sync from Another Device',
        message: `Found:\n• ${tasks.length} tasks\n• ${reminders.length} reminders\n• ${wishlist.length} wishlist items\n\nMerge this data into this device?`,
        confirmText: 'Sync Now',
        cancelText: 'Cancel'
      });

      if (!confirmed) return;

      for (const t of tasks) await DB.put(STORES.TASKS, t);
      for (const r of reminders) await DB.put(STORES.REMINDERS, r);
      for (const w of wishlist) await DB.put(STORES.WISHLIST, w);
      for (const s of settings) {
        if (s && s.key !== 'pushSubscription') {
          await DB.put(STORES.SETTINGS, s);
        }
      }

      await Profile.load(DB);
      await State.reloadFromDB();
      if (window.Dashboard) Dashboard.renderGreeting();
      if (window.Settings) Settings.updateUI();

      Utils.playSound('complete');
      Utils.showToast('Devices synced successfully!', 'success');
    } catch (err) {
      console.error('Sync pull failed:', err);
      Utils.showToast('Sync failed: ' + err.message, 'error');
    }
  },

  async checkUrlSync() {
    const hash = window.location.hash || '';
    const match = hash.match(/^#sync=([A-Za-z0-9]{6,8})$/i);
    if (!match) return;

    const code = match[1].toUpperCase();
    history.replaceState(null, '', window.location.pathname + window.location.search);
    await this.pullByCode(code);
  }
};

window.Sync = Sync;
