/* DAYMARK — Backup & Recovery Module (Export & Import) */

const Backup = {
  SCHEMA_VERSION: 1,

  /**
   * Export all data as a JSON file download
   */
  async exportData() {
    try {
      const [tasks, reminders, wishlist, settings] = await Promise.all([
        DB.getAll(STORES.TASKS),
        DB.getAll(STORES.REMINDERS),
        DB.getAll(STORES.WISHLIST),
        DB.getAll(STORES.SETTINGS)
      ]);

      const backupObject = {
        app: 'DAYMARK',
        schemaVersion: this.SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        data: {
          tasks: tasks || [],
          reminders: reminders || [],
          wishlist: wishlist || [],
          settings: settings || []
        }
      };

      const jsonStr = JSON.stringify(backupObject, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const todayStr = Utils.getTodayDateString();
      const a = document.createElement('a');
      a.href = url;
      a.download = `daymark-backup-${todayStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      Utils.showToast('Backup exported successfully!', 'success');
    } catch (err) {
      console.error('Backup export failed:', err);
      Utils.showToast('Export failed: ' + err.message, 'error');
    }
  },

  /**
   * Trigger file input for JSON import
   */
  triggerImportDialog() {
    const fileInput = document.getElementById('backupFileInput');
    if (fileInput) {
      fileInput.value = '';
      fileInput.click();
    }
  },

  /**
   * Handle selected backup file
   */
  async handleFileSelected(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    try {
      const fileText = await file.text();
      let parsed;
      try {
        parsed = JSON.parse(fileText);
      } catch (parseErr) {
        throw new Error('Selected file is not valid JSON.');
      }

      // Validation
      const validation = this.validateBackup(parsed);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      const { tasks, reminders, wishlist, settings } = parsed.data;

      const confirmMsg = `Backup contains:\n• ${tasks.length} tasks\n• ${reminders.length} reminders\n• ${wishlist.length} wishlist items\n\nDo you want to import this data? Existing items with the same ID will be updated.`;

      const confirmed = await Utils.confirm({
        title: 'Confirm Data Import',
        message: confirmMsg,
        confirmText: 'Import Data',
        cancelText: 'Cancel'
      });

      if (!confirmed) return;

      // Import records safely (Merge strategy)
      let importedCount = 0;

      for (const t of tasks) {
        await DB.put(STORES.TASKS, t);
        importedCount++;
      }

      for (const r of reminders) {
        await DB.put(STORES.REMINDERS, r);
        importedCount++;
      }

      for (const w of wishlist) {
        await DB.put(STORES.WISHLIST, w);
        importedCount++;
      }

      if (Array.isArray(settings)) {
        for (const s of settings) {
          if (s.key && s.value !== undefined) {
            await DB.setSetting(s.key, s.value);
          }
        }
      }

      await State.reloadFromDB();
      Utils.showToast(`Import complete! ${importedCount} items loaded.`, 'success');
    } catch (err) {
      console.error('Import failed:', err);
      Utils.showToast('Import failed: ' + err.message, 'error');
    }
  },

  /**
   * Validate backup JSON data integrity
   */
  validateBackup(backup) {
    if (!backup || typeof backup !== 'object') {
      return { isValid: false, error: 'Backup root must be an object.' };
    }

    if (!backup.data || typeof backup.data !== 'object') {
      return { isValid: false, error: 'Missing or malformed "data" section in backup.' };
    }

    const { tasks, reminders, wishlist } = backup.data;

    if (!Array.isArray(tasks) || !Array.isArray(reminders) || !Array.isArray(wishlist)) {
      return { isValid: false, error: 'Tasks, reminders, and wishlist must each be arrays.' };
    }

    // Validate tasks
    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      if (!t.id || typeof t.id !== 'string') {
        return { isValid: false, error: `Task #${i + 1} has an invalid or missing ID.` };
      }
      if (!t.title || typeof t.title !== 'string') {
        return { isValid: false, error: `Task #${i + 1} has an invalid or missing title.` };
      }
    }

    // Validate reminders
    for (let i = 0; i < reminders.length; i++) {
      const r = reminders[i];
      if (!r.id || typeof r.id !== 'string') {
        return { isValid: false, error: `Reminder #${i + 1} has an invalid or missing ID.` };
      }
      if (!r.title || typeof r.title !== 'string') {
        return { isValid: false, error: `Reminder #${i + 1} has an invalid or missing title.` };
      }
      if (!r.reminderDate || typeof r.reminderDate !== 'string') {
        return { isValid: false, error: `Reminder #${i + 1} has an invalid or missing date.` };
      }
    }

    // Validate wishlist
    for (let i = 0; i < wishlist.length; i++) {
      const w = wishlist[i];
      if (!w.id || typeof w.id !== 'string') {
        return { isValid: false, error: `Wishlist item #${i + 1} has an invalid or missing ID.` };
      }
      if (!w.name || typeof w.name !== 'string') {
        return { isValid: false, error: `Wishlist item #${i + 1} has an invalid or missing name.` };
      }
    }

    return { isValid: true };
  }
};

window.Backup = Backup;
