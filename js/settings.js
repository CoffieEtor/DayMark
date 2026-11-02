/* DAYMARK — Settings Module */

const Settings = {
  /**
   * Initialize settings module
   */
  async init() {
    this.bindControls();
    this.updateUI();

    // Subscribe to state updates
    State.subscribe('SETTINGS_UPDATED', () => this.updateUI());
    State.subscribe('NOTIFICATION_PERMISSION_CHANGED', () => this.updateNotificationStatus());
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
        Utils.showToast(`Currency updated to ${newCurrency}`, 'success');
      });
    }

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
        Backup.exportData();
      });
    }

    // Import Data button
    const importBtn = document.getElementById('settingsImportBtn');
    const fileInput = document.getElementById('backupFileInput');
    if (importBtn) {
      importBtn.addEventListener('click', () => {
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

    this.updateNotificationStatus();
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
