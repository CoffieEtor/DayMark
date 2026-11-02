/* DAYMARK — Notification & Push Service Controller */

const Notifications = {
  vapidPublicKey: null,
  swRegistration: null,
  isPushSupported: false,
  checkTimer: null,

  /**
   * Helper to convert Base64 string to Uint8Array for VAPID
   */
  urlB64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  },

  /**
   * Initialize notification system
   */
  async init() {
    this.isPushSupported = ('serviceWorker' in navigator) && ('PushManager' in window);

    // Update permission in State
    if ('Notification' in window) {
      State.setNotificationPermission(Notification.permission);
    } else {
      State.setNotificationPermission('unsupported');
    }

    // Check service worker registration
    if ('serviceWorker' in navigator) {
      try {
        this.swRegistration = await navigator.serviceWorker.ready;
      } catch (err) {
        console.warn('Service worker not ready for notifications yet:', err);
      }
    }

    // Try fetching VAPID public key from backend if running
    this.fetchVapidKey();

    // Start in-app reminder checker (runs every 30s while app is open)
    this.startInAppReminderMonitor();
  },

  /**
   * Fetch VAPID public key from server
   */
  async fetchVapidKey() {
    try {
      const res = await fetch('/api/vapid-public-key');
      if (res.ok) {
        const data = await res.json();
        if (data.publicKey) {
          this.vapidPublicKey = data.publicKey;
        }
      }
    } catch (e) {
      // Backend not running or static hosting, fallback to local notifications
    }
  },

  /**
   * Request notification permission from user
   */
  async requestPermission() {
    if (!('Notification' in window)) {
      Utils.showToast('Notifications are not supported in this browser.', 'error');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      State.setNotificationPermission(permission);

      if (permission === 'granted') {
        Utils.showToast('Notification permission granted!', 'success');
        // Try subscribing to push manager if SW is registered
        await this.subscribeToPush();
        return true;
      } else if (permission === 'denied') {
        Utils.showToast('Notification permission was denied in browser settings.', 'error');
        return false;
      } else {
        Utils.showToast('Notification permission dismissed.', 'info');
        return false;
      }
    } catch (err) {
      console.error('Error requesting notification permission:', err);
      Utils.showToast('Could not request notification permission.', 'error');
      return false;
    }
  },

  /**
   * Subscribe service worker to push notifications
   */
  async subscribeToPush() {
    if (!this.isPushSupported || !this.swRegistration) {
      console.log('Push manager or SW not ready');
      return null;
    }

    try {
      let subscription = await this.swRegistration.pushManager.getSubscription();

      if (!subscription) {
        if (!this.vapidPublicKey) {
          await this.fetchVapidKey();
        }

        if (this.vapidPublicKey) {
          const applicationServerKey = this.urlB64ToUint8Array(this.vapidPublicKey);
          subscription = await this.swRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey
          });
        }
      }

      if (subscription) {
        // Send subscription to server
        await this.sendSubscriptionToServer(subscription);
        await DB.setSetting('pushSubscription', JSON.stringify(subscription));
      }

      return subscription;
    } catch (err) {
      console.warn('Push subscription notice:', err.message);
      return null;
    }
  },

  /**
   * Send push subscription object to backend
   */
  async sendSubscriptionToServer(subscription) {
    try {
      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription })
      });
    } catch (e) {
      // Silently ignore if backend server is not running
    }
  },

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe() {
    if (!this.swRegistration) return;
    try {
      const subscription = await this.swRegistration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        await fetch('/api/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        }).catch(() => {});
        await DB.setSetting('pushSubscription', null);
      }
      Utils.showToast('Unsubscribed from push notifications', 'info');
    } catch (err) {
      console.error('Failed to unsubscribe:', err);
    }
  },

  /**
   * Schedule reminder on server
   */
  async scheduleReminder(reminder) {
    if (!reminder || reminder.completed) return;

    try {
      await fetch('/api/reminders/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminder })
      });
    } catch (e) {
      // Backend not running; client monitor handles it while open
    }
  },

  /**
   * Cancel reminder on server
   */
  async cancelScheduledReminder(reminderId) {
    try {
      await fetch('/api/reminders/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminderId })
      });
    } catch (e) {
      // Handled silently
    }
  },

  /**
   * Send immediate test notification
   */
  async sendTestNotification() {
    if (Notification.permission !== 'granted') {
      const granted = await this.requestPermission();
      if (!granted) return;
    }

    // 1. Try sending via backend push
    try {
      const res = await fetch('/api/test-push', { method: 'POST' });
      if (res.ok) {
        Utils.showToast('Test push sent via server!', 'success');
        return;
      }
    } catch (e) {
      // Fallback to local notification
    }

    // 2. Direct browser notification
    try {
      if (this.swRegistration && this.swRegistration.showNotification) {
        await this.swRegistration.showNotification('DAYMARK — Test Notification', {
          body: 'Notifications are functioning properly on this device.',
          icon: './assets/icons/icon-192.png',
          badge: './assets/icons/favicon.svg',
          vibrate: [100, 50, 100],
          tag: 'test-notification'
        });
      } else {
        new Notification('DAYMARK — Test Notification', {
          body: 'Notifications are functioning properly on this device.',
          icon: './assets/icons/icon-192.png'
        });
      }
      Utils.showToast('Local notification delivered!', 'success');
    } catch (err) {
      console.error('Test notification failed:', err);
      Utils.showToast('Failed to trigger notification: ' + err.message, 'error');
    }
  },

  /**
   * Periodic in-app monitor for reminders due right now
   */
  startInAppReminderMonitor() {
    if (this.checkTimer) clearInterval(this.checkTimer);

    this.checkTimer = setInterval(async () => {
      const reminders = State.reminders || [];
      const todayStr = Utils.getTodayDateString();
      const now = new Date();
      const currentHourMin = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      for (const r of reminders) {
        if (!r.completed && r.notificationStatus !== 'sent' && r.reminderDate === todayStr) {
          const time = r.reminderTime || '09:00';
          if (time <= currentHourMin) {
            // Trigger alert
            r.notificationStatus = 'sent';
            r.updatedAt = Date.now();
            await DB.put(STORES.REMINDERS, r);

            if (Notification.permission === 'granted') {
              try {
                if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                  navigator.serviceWorker.controller.postMessage({
                    type: 'TRIGGER_NOTIFICATION',
                    title: `Reminder: ${r.title}`,
                    body: r.description || `Scheduled for ${time}`
                  });
                } else {
                  new Notification(`DAYMARK: ${r.title}`, {
                    body: r.description || `Scheduled for ${time}`,
                    icon: './assets/icons/icon-192.png'
                  });
                }
              } catch (e) {
                // In-app toast fallback
              }
            }

            Utils.showToast(`Reminder: ${r.title}`, 'info', 6000);
            State.reloadFromDB();
          }
        }
      }
    }, 30000);
  }
};

window.Notifications = Notifications;
