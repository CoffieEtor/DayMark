/* DAYMARK — Enhanced Settings Module with Accent Themes & Sound Toggle */

const Settings = {
  /**
   * Initialize settings module
   */
  async init() {
    this.bindControls();
    this.updateUI();

    State.subscribe('SETTINGS_UPDATED', () => this.updateUI());
    State.subscribe('NOTIFICATION_PERMISSION_CHANGED', () => this.updateNotificationStatus());
    State.subscribe('DATA_RELOADED', () => this.updateStorageStats());
  },

  /**
   * Bind settings inputs and buttons
   */
  bindControls() {
    // Currency selector
    const currencySelect = document.getElementById('settingsCurrencySelect');
    if (currencySelect) {
      currencySelect.addEventListener('change', async (e) => {
        const newCurrency = e.target.value;
        await DB.setSetting('currency', newCurrency);
        await State.reloadFromDB();
        Utils.playSound('click');
        Utils.showToast(`Currency set to ${newCurrency}`, 'success');
      });
    }

    // Sound toggle
    const soundToggle = document.getElementById('settingsSoundToggle');
    if (soundToggle) {
      soundToggle.addEventListener('change', async (e) => {
        const enabled = e.target.checked;
        await DB.setSetting('soundEnabled', enabled);
        await State.reloadFromDB();
        if (enabled) Utils.playSound('complete');
        Utils.showToast(enabled ? 'Haptic sound feedback enabled' : 'Sound feedback muted', 'info');
      });
    }

    // Theme Accent Buttons
    const accentBtns = document.querySelectorAll('.accent-picker-chip');
    accentBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const accent = btn.getAttribute('data-accent');
        accentBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        document.documentElement.setAttribute('data-accent', accent);
        await DB.setSetting('themeAccent', accent);
        await State.reloadFromDB();
        Utils.playSound('click');
        Utils.showToast(`Theme accent changed to ${accent.charAt(0).toUpperCase() + accent.slice(1)}`, 'success');
      });
    });

    // Notification permission request
    const reqPermBtn = document.getElementById('settingsRequestPermBtn');
    if (reqPermBtn) {
      reqPermBtn.addEventListener('click', async () => {
        await Notifications.requestPermission();
        this.updateNotificationStatus();
      });
    }

    // Test notification button
    const testPushBtn = document.getElementById('settingsTestPushBtn');
    if (testPushBtn) {
      testPushBtn.addEventListener('click', async () => {
        await Notifications.sendTestNotification();
      });
    }

    // Export Data button
    const exportBtn = document.getElementById('settingsExportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        Utils.playSound('click');
        Backup.exportData();
      });
    }

    // Import Data button
    const importBtn = document.getElementById('settingsImportBtn');
    const fileInput = document.getElementById('backupFileInput');
    if (importBtn) {
      importBtn.addEventListener('click', () => {
        Utils.playSound('click');
        Backup.triggerImportDialog();
      });
    }
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        Backup.handleFileSelected(e);
      });
    }

    // Clear All Data button
    const clearBtn = document.getElementById('settingsClearBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', async () => {
        const confirmed = await Utils.confirm({
          title: 'Reset All Data?',
          message: 'This will delete ALL tasks, reminders, and wishlist items stored on this device. This action cannot be reversed. Are you sure?',
          confirmText: 'Erase Everything',
          isDanger: true
        });

        if (!confirmed) return;

        try {
          await DB.clearAll();
          await State.reloadFromDB();
          Utils.showToast('All application data cleared', 'info');
        } catch (err) {
          console.error('Clear failed:', err);
          Utils.showToast('Failed to clear data: ' + err.message, 'error');
        }
      });
    }
  },

  /**
   * Update Settings UI with current values
   */
  updateUI() {
    const currencySelect = document.getElementById('settingsCurrencySelect');
    if (currencySelect) {
      currencySelect.value = State.currency || 'GH₵';
    }

    const soundToggle = document.getElementById('settingsSoundToggle');
    if (soundToggle) {
      soundToggle.checked = State.settings.soundEnabled !== false;
    }

    const currentAccent = State.settings.themeAccent || 'gold';
    const accentBtns = document.querySelectorAll('.accent-picker-chip');
    accentBtns.forEach(btn => {
      if (btn.getAttribute('data-accent') === currentAccent) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    this.updateNotificationStatus();
    this.updateStorageStats();
  },

  /**
   * Update storage stats
   */
  updateStorageStats() {
    const statsEl = document.getElementById('settingsStorageStats');
    if (!statsEl) return;

    const tasksCount = (State.tasks || []).length;
    const remindersCount = (State.reminders || []).length;
    const wishlistCount = (State.wishlist || []).length;
    const total = tasksCount + remindersCount + wishlistCount;

    statsEl.textContent = `${total} total items stored locally (${tasksCount} tasks, ${remindersCount} reminders, ${wishlistCount} wishlist items).`;
  },

  /**
   * Update notification status badges and buttons
   */
  updateNotificationStatus() {
    const statusPill = document.getElementById('settingsNotificationStatus');
    const reqPermBtn = document.getElementById('settingsRequestPermBtn');
    const testPushBtn = document.getElementById('settingsTestPushBtn');

    if (!('Notification' in window)) {
      if (statusPill) statusPill.textContent = 'Unsupported';
      if (reqPermBtn) reqPermBtn.style.display = 'none';
      if (testPushBtn) testPushBtn.style.display = 'none';
      return;
    }

    const perm = Notification.permission;
    if (statusPill) {
      statusPill.textContent = perm.charAt(0).toUpperCase() + perm.slice(1);
      if (perm === 'granted') {
        statusPill.style.color = 'var(--success)';
      } else if (perm === 'denied') {
        statusPill.style.color = 'var(--danger)';
      } else {
        statusPill.style.color = 'var(--warning)';
      }
    }

    if (reqPermBtn) {
      reqPermBtn.style.display = (perm === 'granted') ? 'none' : 'inline-flex';
    }

    if (testPushBtn) {
      testPushBtn.style.display = 'inline-flex';
    }
  }
};

window.Settings = Settings;
