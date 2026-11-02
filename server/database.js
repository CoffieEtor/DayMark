/* DAYMARK Server — Lightweight Local Store */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'server-data.json');

class ServerStore {
  constructor() {
    this.data = {
      subscriptions: [],
      scheduledReminders: []
    };
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        this.data = JSON.parse(raw);
        if (!Array.isArray(this.data.subscriptions)) this.data.subscriptions = [];
        if (!Array.isArray(this.data.scheduledReminders)) this.data.scheduledReminders = [];
      } else {
        this.save();
      }
    } catch (err) {
      console.warn('[Server DB] Could not read server-data.json, initializing fresh store.', err.message);
      this.save();
    }
  }

  save() {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err) {
      console.error('[Server DB] Error saving data file:', err);
    }
  }

  // Subscriptions
  addSubscription(sub) {
    if (!sub || !sub.endpoint) return;
    const existingIdx = this.data.subscriptions.findIndex(s => s.endpoint === sub.endpoint);
    if (existingIdx >= 0) {
      this.data.subscriptions[existingIdx] = sub;
    } else {
      this.data.subscriptions.push(sub);
    }
    this.save();
  }

  removeSubscription(endpoint) {
    this.data.subscriptions = this.data.subscriptions.filter(s => s.endpoint !== endpoint);
    this.save();
  }

  getSubscriptions() {
    return this.data.subscriptions;
  }

  // Scheduled reminders
  scheduleReminder(reminder) {
    if (!reminder || !reminder.id) return;
    const idx = this.data.scheduledReminders.findIndex(r => r.id === reminder.id);
    if (idx >= 0) {
      this.data.scheduledReminders[idx] = reminder;
    } else {
      this.data.scheduledReminders.push(reminder);
    }
    this.save();
  }

  cancelReminder(reminderId) {
    this.data.scheduledReminders = this.data.scheduledReminders.filter(r => r.id !== reminderId);
    this.save();
  }

  getPendingReminders() {
    return this.data.scheduledReminders.filter(r => !r.sent && !r.completed);
  }

  markReminderSent(reminderId) {
    const reminder = this.data.scheduledReminders.find(r => r.id === reminderId);
    if (reminder) {
      reminder.sent = true;
      reminder.sentAt = Date.now();
      this.save();
    }
  }
}

module.exports = new ServerStore();
