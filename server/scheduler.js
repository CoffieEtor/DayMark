/* DAYMARK Server — Reminder Background Scheduler */

const store = require('./database');
const push = require('./push');

class ReminderScheduler {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
  }

  start(intervalMs = 30000) {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`[Scheduler] Background reminder worker active (polling every ${intervalMs / 1000}s).`);

    this.checkReminders();
    this.intervalId = setInterval(() => this.checkReminders(), intervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  async checkReminders() {
    const pending = store.getPendingReminders();
    if (pending.length === 0) return;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const currentDay = String(now.getDate()).padStart(2, '0');
    const todayStr = `${currentYear}-${currentMonth}-${currentDay}`;
    const currentHourMin = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    for (const reminder of pending) {
      const remDate = reminder.reminderDate;
      const remTime = reminder.reminderTime || '09:00';

      const isDue = (remDate < todayStr) || (remDate === todayStr && remTime <= currentHourMin);

      if (isDue) {
        console.log(`[Scheduler] Reminder due: "${reminder.title}" at ${remDate} ${remTime}`);

        const payload = {
          title: `DAYMARK: ${reminder.title}`,
          body: reminder.description || `Reminder scheduled for ${remTime}`,
          icon: './assets/icons/icon-192.png',
          url: './index.html#reminders',
          id: reminder.id
        };

        await push.broadcastNotification(payload);
        store.markReminderSent(reminder.id);
      }
    }
  }
}

module.exports = new ReminderScheduler();
