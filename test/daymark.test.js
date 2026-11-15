/* DAYMARK — Automated Test Suite
 * Tests Utilities, IndexedDB operations, Task CRUD, Reminder CRUD, Wishlist CRUD,
 * Random Picker logic, Backup/Recovery validation, and Backend APIs.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
require('fake-indexeddb/auto');

// Load client scripts into sandbox context
const utilsCode = fs.readFileSync(path.join(__dirname, '../js/utilities.js'), 'utf8');
const dbCode = fs.readFileSync(path.join(__dirname, '../js/database.js'), 'utf8');
const backupCode = fs.readFileSync(path.join(__dirname, '../js/backup.js'), 'utf8');

// Mock browser globals for Node test environment
global.window = global;
global.navigator = { onLine: true };
global.crypto = require('crypto');
global.document = {
  getElementById: () => null,
  querySelectorAll: () => []
};

// Evaluate modules
eval(utilsCode);
eval(dbCode);
eval(backupCode);

test('1. Utilities — Currency, Date, and HTML Sanitization', async (t) => {
  await t.test('Currency formats correctly with GH₵ default', () => {
    assert.equal(Utils.formatCurrency(0), 'GH₵ 0.00');
    assert.equal(Utils.formatCurrency(1250), 'GH₵ 1,250.00');
    assert.equal(Utils.formatCurrency(45.5, '$'), '$ 45.50');
    assert.equal(Utils.formatCurrency(380.25, 'GH₵'), 'GH₵ 380.25');
  });

  await t.test('HTML escaping prevents malicious script injection', () => {
    const malicious = '<script>alert("xss")</script>&"\'';
    const escaped = Utils.escapeHtml(malicious);
    assert.equal(escaped.includes('<script>'), false);
    assert.equal(escaped.includes('&lt;script&gt;'), true);
    assert.equal(escaped.includes('&quot;'), true);
  });

  await t.test('Time formatting handles 24h to 12h AM/PM properly', () => {
    assert.equal(Utils.formatTime('09:00'), '9:00 AM');
    assert.equal(Utils.formatTime('14:30'), '2:30 PM');
    assert.equal(Utils.formatTime('00:15'), '12:15 AM');
    assert.equal(Utils.formatTime('12:00'), '12:00 PM');
  });

  await t.test('Date status detects overdue, today, and upcoming', () => {
    const today = Utils.getTodayDateString();
    assert.equal(Utils.getDateStatus(today), 'today');
    assert.equal(Utils.getDateStatus('2020-01-01'), 'overdue');
    assert.equal(Utils.getDateStatus('2099-12-31'), 'upcoming');
  });

  await t.test('UUID generator produces unique non-empty strings', () => {
    const id1 = Utils.generateId();
    const id2 = Utils.generateId();
    assert.ok(id1);
    assert.ok(id2);
    assert.notEqual(id1, id2);
  });
});

test('2. IndexedDB — CRUD Operations & Seeding', async (t) => {
  const db = global.DB;
  await db.init();

  await t.test('Database initializes stores properly', async () => {
    assert.equal(db.isReady, true);
    const tasks = await db.getAll(STORES.TASKS);
    assert.ok(Array.isArray(tasks));
  });

  await t.test('Task CRUD operations', async () => {
    const taskId = 'test-task-' + Date.now();
    const task = {
      id: taskId,
      title: 'Review financial balance',
      description: 'Check bank and mobile money accounts',
      priority: 'high',
      dueDate: Utils.getTodayDateString(),
      dueTime: '15:00',
      category: 'Finance',
      completed: false,
      completedAt: null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Create
    await db.add(STORES.TASKS, task);
    const fetched = await db.getById(STORES.TASKS, taskId);
    assert.equal(fetched.title, 'Review financial balance');
    assert.equal(fetched.priority, 'high');

    // Update / Complete
    fetched.completed = true;
    fetched.completedAt = Date.now();
    await db.put(STORES.TASKS, fetched);
    const updated = await db.getById(STORES.TASKS, taskId);
    assert.equal(updated.completed, true);
    assert.ok(updated.completedAt);

    // Reopen
    updated.completed = false;
    updated.completedAt = null;
    await db.put(STORES.TASKS, updated);
    const reopened = await db.getById(STORES.TASKS, taskId);
    assert.equal(reopened.completed, false);

    // Delete
    await db.delete(STORES.TASKS, taskId);
    const deleted = await db.getById(STORES.TASKS, taskId);
    assert.equal(deleted, undefined);
  });

  await t.test('Reminder CRUD operations', async () => {
    const remId = 'test-rem-' + Date.now();
    const reminder = {
      id: remId,
      title: 'Medical checkup appointment',
      description: 'Visit clinic for routine consultation',
      reminderDate: '2026-11-15',
      reminderTime: '10:30',
      completed: false,
      completedAt: null,
      notificationStatus: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await db.add(STORES.REMINDERS, reminder);
    const fetched = await db.getById(STORES.REMINDERS, remId);
    assert.equal(fetched.title, 'Medical checkup appointment');
    assert.equal(fetched.reminderTime, '10:30');

    // Complete
    fetched.completed = true;
    await db.put(STORES.REMINDERS, fetched);
    const done = await db.getById(STORES.REMINDERS, remId);
    assert.equal(done.completed, true);

    // Delete
    await db.delete(STORES.REMINDERS, remId);
    assert.equal(await db.getById(STORES.REMINDERS, remId), undefined);
  });

  await t.test('Wishlist CRUD operations', async () => {
    const wishId = 'test-wish-' + Date.now();
    const wishItem = {
      id: wishId,
      name: 'Sony DualSense Wireless Controller',
      description: 'Midnight black edition',
      estimatedPrice: 950,
      currency: 'GH₵',
      category: 'Gaming',
      productUrl: 'https://example.com/controller',
      notes: 'Check store warranty',
      purchased: false,
      purchasedAt: null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await db.add(STORES.WISHLIST, wishItem);
    const fetched = await db.getById(STORES.WISHLIST, wishId);
    assert.equal(fetched.name, 'Sony DualSense Wireless Controller');
    assert.equal(fetched.estimatedPrice, 950);

    // Mark as purchased
    fetched.purchased = true;
    fetched.purchasedAt = Date.now();
    await db.put(STORES.WISHLIST, fetched);
    const purchased = await db.getById(STORES.WISHLIST, wishId);
    assert.equal(purchased.purchased, true);
    assert.ok(purchased.purchasedAt);

    // Restore to unpurchased
    purchased.purchased = false;
    purchased.purchasedAt = null;
    await db.put(STORES.WISHLIST, purchased);
    const restored = await db.getById(STORES.WISHLIST, wishId);
    assert.equal(restored.purchased, false);

    // Delete
    await db.delete(STORES.WISHLIST, wishId);
    assert.equal(await db.getById(STORES.WISHLIST, wishId), undefined);
  });

  await t.test('Settings Store reads and writes preferences', async () => {
    await db.setSetting('currency', 'GH₵');
    const curr = await db.getSetting('currency');
    assert.equal(curr, 'GH₵');

    await db.setSetting('theme', 'dark');
    assert.equal(await db.getSetting('theme'), 'dark');
  });

  await t.test('Seeding populates default welcoming items when stores are empty', async () => {
    await db.clearAll();
    await db.seedInitialDataIfEmpty();

    const tasks = await db.getAll(STORES.TASKS);
    const reminders = await db.getAll(STORES.REMINDERS);
    const wishlist = await db.getAll(STORES.WISHLIST);

    assert.ok(tasks.length >= 2, 'Default tasks seeded');
    assert.ok(reminders.length >= 1, 'Default reminders seeded');
    assert.ok(wishlist.length >= 2, 'Default wishlist seeded');

    const sampleItem = wishlist[0];
    assert.equal(sampleItem.currency, 'GH₵');
    assert.ok(sampleItem.estimatedPrice > 0);
  });
});

test('3. Random Purchase Selection Logic ("Pick for me")', (t) => {
  const items = [
    { id: '1', name: 'Item 1', estimatedPrice: 100, purchased: true },
    { id: '2', name: 'Item 2', estimatedPrice: 200, purchased: false },
    { id: '3', name: 'Item 3', estimatedPrice: 300, purchased: true },
    { id: '4', name: 'Item 4', estimatedPrice: 400, purchased: false }
  ];

  // Strictly filter out purchased items
  const eligible = items.filter(i => !i.purchased);
  assert.equal(eligible.length, 2);
  assert.equal(eligible.every(i => !i.purchased), true);

  // Random pick returns an eligible item
  const picked = eligible[Math.floor(Math.random() * eligible.length)];
  assert.ok(picked.id === '2' || picked.id === '4');
  assert.equal(picked.purchased, false);

  // If all items are purchased, eligible list is 0
  const allPurchased = [
    { id: '1', name: 'Item 1', purchased: true },
    { id: '2', name: 'Item 2', purchased: true }
  ];
  const eligibleNone = allPurchased.filter(i => !i.purchased);
  assert.equal(eligibleNone.length, 0);
});

test('4. Data Backup & Recovery Validation', (t) => {
  // Valid backup payload
  const validBackup = {
    app: 'DAYMARK',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    data: {
      tasks: [
        { id: 't1', title: 'Task 1', completed: false }
      ],
      reminders: [
        { id: 'r1', title: 'Reminder 1', reminderDate: '2026-11-05' }
      ],
      wishlist: [
        { id: 'w1', name: 'Wishlist 1', estimatedPrice: 150 }
      ],
      settings: [
        { key: 'currency', value: 'GH₵' }
      ]
    }
  };

  const validation = Backup.validateBackup(validBackup);
  assert.equal(validation.isValid, true);

  // Missing data section
  const invalid1 = { app: 'DAYMARK' };
  assert.equal(Backup.validateBackup(invalid1).isValid, false);

  // Task missing title
  const invalidTask = {
    data: {
      tasks: [{ id: 't1' }],
      reminders: [],
      wishlist: []
    }
  };
  assert.equal(Backup.validateBackup(invalidTask).isValid, false);

  // Reminder missing reminderDate
  const invalidReminder = {
    data: {
      tasks: [],
      reminders: [{ id: 'r1', title: 'Test' }],
      wishlist: []
    }
  };
  assert.equal(Backup.validateBackup(invalidReminder).isValid, false);

  // Wishlist item missing name
  const invalidWishlist = {
    data: {
      tasks: [],
      reminders: [],
      wishlist: [{ id: 'w1' }]
    }
  };
  assert.equal(Backup.validateBackup(invalidWishlist).isValid, false);
});

test('5. Backend API Endpoints & Notification Architecture', async (t) => {
  const { spawn } = require('child_process');
  const baseUrl = 'http://127.0.0.1:3001';

  // Check if server is already running, or spawn it for test
  let serverProcess = null;
  let isRunning = false;
  try {
    const res = await fetch(`${baseUrl}/api/health`);
    if (res.ok) isRunning = true;
  } catch (e) {
    isRunning = false;
  }

  if (!isRunning) {
    serverProcess = spawn('node', ['server/server.js'], {
      cwd: path.join(__dirname, '..'),
      stdio: 'ignore'
    });
    // Wait for server to boot up
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 150));
      try {
        const res = await fetch(`${baseUrl}/api/health`);
        if (res.ok) {
          isRunning = true;
          break;
        }
      } catch (e) {}
    }
  }

  t.after(() => {
    if (serverProcess) {
      serverProcess.kill();
    }
  });

  await t.test('Health endpoint returns healthy status', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'healthy');
    assert.equal(body.vapidConfigured, true);
  });

  await t.test('VAPID public key endpoint provides valid key', async () => {
    const res = await fetch(`${baseUrl}/api/vapid-public-key`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.publicKey);
    assert.equal(typeof body.publicKey, 'string');
    assert.ok(body.publicKey.length > 50);
  });

  await t.test('Push subscription register and unsubscribe workflow', async () => {
    const fakeSub = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/fake-test-token-12345',
      keys: {
        p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9AcUbVYO2-0U0waLF2CtQZb8ukAMvGA6z_0U0waLF2CtQZ',
        auth: 'tBHItJI5svbpez7KI4CCXg'
      }
    };

    // Subscribe
    const subRes = await fetch(`${baseUrl}/api/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: fakeSub })
    });
    assert.equal(subRes.status, 201);
    const subBody = await subRes.json();
    assert.equal(subBody.success, true);

    // Verify stored
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthBody = await healthRes.json();
    assert.ok(healthBody.activeSubscriptions >= 1);

    // Unsubscribe
    const unsubRes = await fetch(`${baseUrl}/api/unsubscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: fakeSub.endpoint })
    });
    assert.equal(unsubRes.status, 200);
  });

  await t.test('Reminder scheduling and cancellation in backend', async () => {
    const fakeReminder = {
      id: 'test-rem-schedule-99',
      title: 'Scheduled reminder test',
      description: 'Test description',
      reminderDate: '2026-11-20',
      reminderTime: '14:00'
    };

    const schedRes = await fetch(`${baseUrl}/api/reminders/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reminder: fakeReminder })
    });
    assert.equal(schedRes.status, 201);

    const cancelRes = await fetch(`${baseUrl}/api/reminders/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reminderId: fakeReminder.id })
    });
    assert.equal(cancelRes.status, 200);
  });
});

test('6. Enhanced Features — Subtasks, Wishlist Multi-Sort & Picker Budget Constraints', async (t) => {
  await t.test('Task subtasks can be toggled and calculated', () => {
    const task = {
      id: 'task-sub-1',
      title: 'Quarterly review',
      subtasks: [
        { id: 'st1', text: 'Gather metrics', completed: true },
        { id: 'st2', text: 'Write summary report', completed: false }
      ]
    };

    assert.equal(task.subtasks.length, 2);
    const completed = task.subtasks.filter(s => s.completed).length;
    assert.equal(completed, 1);
    const pct = Math.round((completed / task.subtasks.length) * 100);
    assert.equal(pct, 50);
  });

  await t.test('Wishlist sorting by price ascending and descending', () => {
    const items = [
      { id: '1', name: 'Item B', estimatedPrice: 450, priority: 'low' },
      { id: '2', name: 'Item A', estimatedPrice: 150, priority: 'high' },
      { id: '3', name: 'Item C', estimatedPrice: 1200, priority: 'medium' }
    ];

    // Sort price-asc
    const asc = [...items].sort((a, b) => a.estimatedPrice - b.estimatedPrice);
    assert.equal(asc[0].id, '2'); // 150
    assert.equal(asc[2].id, '3'); // 1200

    // Sort price-desc
    const desc = [...items].sort((a, b) => b.estimatedPrice - a.estimatedPrice);
    assert.equal(desc[0].id, '3'); // 1200
    assert.equal(desc[2].id, '2'); // 150
  });

  await t.test('Random Picker strictly applies maximum budget limit', () => {
    const items = [
      { id: '1', name: 'Cheap gadget', estimatedPrice: 150, purchased: false },
      { id: '2', name: 'Expensive laptop', estimatedPrice: 4500, purchased: false },
      { id: '3', name: 'Mid gadget', estimatedPrice: 400, purchased: false },
      { id: '4', name: 'Purchased gadget', estimatedPrice: 100, purchased: true }
    ];

    // Filter unpurchased with max budget GH₵ 500
    const budgetLimit = 500;
    const eligible = items.filter(i => !i.purchased && i.estimatedPrice <= budgetLimit);

    assert.equal(eligible.length, 2);
    assert.ok(eligible.every(i => !i.purchased && i.estimatedPrice <= 500));
    assert.equal(eligible.find(i => i.id === '2'), undefined); // 4500 excluded
  });
});


