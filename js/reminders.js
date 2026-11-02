/* DAYMARK — Enhanced Reminder Management Module with Snooze & Presets */

const Reminders = {
  activeReminderIdToEdit: null,

  /**
   * Initialize Reminder module
   */
  init() {
    this.bindFilterChips();
    this.bindSearch();
    this.renderReminderList();

    // Subscribe to state changes
    State.subscribe('REMINDERS_UPDATED', () => {
      this.updateFilterCounts();
      this.renderReminderList();
    });

    State.subscribe('REMINDER_FILTER_CHANGED', () => {
      this.renderReminderList();
    });

    State.subscribe('REMINDER_SEARCH_CHANGED', () => {
      this.renderReminderList();
    });
  },

  /**
   * Bind reminder filter chips
   */
  bindFilterChips() {
    const chips = document.querySelectorAll('#reminderFiltersBar .filter-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        Utils.playSound('click');
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const filter = chip.getAttribute('data-filter');
        State.setReminderFilter(filter);
      });
    });
  },

  /**
   * Bind search input
   */
  bindSearch() {
    const searchInput = document.getElementById('reminderSearchInput');
    const searchClear = document.getElementById('reminderSearchClear');

    if (searchInput) {
      searchInput.addEventListener('input', Utils.debounce((e) => {
        State.setReminderSearch(e.target.value);
        if (searchClear) {
          searchClear.classList.toggle('visible', !!e.target.value);
        }
      }, 150));
    }

    if (searchClear && searchInput) {
      searchClear.addEventListener('click', () => {
        Utils.playSound('click');
        searchInput.value = '';
        searchClear.classList.remove('visible');
        State.setReminderSearch('');
      });
    }
  },

  /**
   * Update filter counts
   */
  updateFilterCounts() {
    const reminders = State.reminders || [];
    const todayStr = Utils.getTodayDateString();
    const tomorrowStr = Utils.getTomorrowDateString();

    const counts = {
      all: reminders.filter(r => !r.completed).length,
      today: reminders.filter(r => !r.completed && r.reminderDate === todayStr).length,
      tomorrow: reminders.filter(r => !r.completed && r.reminderDate === tomorrowStr).length,
      upcoming: reminders.filter(r => !r.completed && r.reminderDate > tomorrowStr).length,
      overdue: reminders.filter(r => !r.completed && r.reminderDate < todayStr).length,
      completed: reminders.filter(r => r.completed).length
    };

    const chips = document.querySelectorAll('#reminderFiltersBar .filter-chip');
    chips.forEach(chip => {
      const filter = chip.getAttribute('data-filter');
      const badge = chip.querySelector('.filter-count');
      if (badge && counts[filter] !== undefined) {
        badge.textContent = counts[filter];
      }
    });
  },

  /**
   * Filter and sort reminders
   */
  getVisibleReminders() {
    let list = [...(State.reminders || [])];
    const todayStr = Utils.getTodayDateString();
    const tomorrowStr = Utils.getTomorrowDateString();

    switch (State.data.reminderFilter) {
      case 'today':
        list = list.filter(r => !r.completed && r.reminderDate === todayStr);
        break;
      case 'tomorrow':
        list = list.filter(r => !r.completed && r.reminderDate === tomorrowStr);
        break;
      case 'upcoming':
        list = list.filter(r => !r.completed && r.reminderDate > tomorrowStr);
        break;
      case 'overdue':
        list = list.filter(r => !r.completed && r.reminderDate < todayStr);
        break;
      case 'completed':
        list = list.filter(r => r.completed);
        break;
      case 'all':
      default:
        list = list.filter(r => !r.completed);
        break;
    }

    const query = State.data.reminderSearch;
    if (query) {
      list = list.filter(r => {
        const titleMatch = (r.title || '').toLowerCase().includes(query);
        const descMatch = (r.description || '').toLowerCase().includes(query);
        return titleMatch || descMatch;
      });
    }

    list.sort((a, b) => {
      const aKey = (a.reminderDate || '9999') + (a.reminderTime || '23:59');
      const bKey = (b.reminderDate || '9999') + (b.reminderTime || '23:59');
      return aKey.localeCompare(bKey);
    });

    return list;
  },

  /**
   * Render Reminder list HTML
   */
  renderReminderList() {
    const container = document.getElementById('reminderListContainer');
    if (!container) return;

    const reminders = this.getVisibleReminders();

    if (reminders.length === 0) {
      let emptyTitle = 'No reminders found';
      let emptyMsg = 'Stay ahead by creating reminders for key tasks or routines.';
      if (State.data.reminderSearch) {
        emptyTitle = 'No matching reminders';
        emptyMsg = `No reminders matched "${Utils.escapeHtml(State.data.reminderSearch)}".`;
      } else if (State.data.reminderFilter === 'overdue') {
        emptyTitle = 'No overdue reminders';
        emptyMsg = 'All your reminders are currently on schedule!';
      } else if (State.data.reminderFilter === 'completed') {
        emptyTitle = 'No completed reminders';
        emptyMsg = 'Done reminders will be stored here for review.';
      }

      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div class="empty-title">${emptyTitle}</div>
          <div class="empty-text">${emptyMsg}</div>
          <button class="btn btn-primary btn-sm" onclick="App.openReminderModal()">+ Add New Reminder</button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="items-list">
        ${reminders.map(r => this.renderReminderItemHtml(r)).join('')}
      </div>
    `;
  },

  /**
   * Single reminder HTML with quick snooze actions
   */
  renderReminderItemHtml(reminder) {
    const isCompleted = !!reminder.completed;
    const dateStatus = Utils.getDateStatus(reminder.reminderDate, reminder.reminderTime);
    const isOverdue = !isCompleted && dateStatus === 'overdue';

    let dateBadgeText = Utils.formatShortDate(reminder.reminderDate);
    if (dateStatus === 'today') dateBadgeText = 'Today';
    else if (dateStatus === 'tomorrow') dateBadgeText = 'Tomorrow';

    const formattedTime = Utils.formatTime(reminder.reminderTime || '09:00');

    // Snooze buttons if active and overdue/today
    const showSnooze = !isCompleted;

    return `
      <div class="reminder-item ${isCompleted ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}" id="reminder-card-${reminder.id}">
        <button class="checkbox-btn ${isCompleted ? 'checked' : ''}" 
                onclick="Reminders.toggleComplete('${reminder.id}')"
                aria-label="${isCompleted ? 'Mark reminder pending' : 'Mark reminder completed'}">
          <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
        </button>

        <div class="reminder-time-block">
          <span class="reminder-time-date">${dateBadgeText}</span>
          <span class="reminder-time-hour">${formattedTime}</span>
        </div>

        <div class="task-body" onclick="Reminders.editReminder('${reminder.id}')" style="cursor: pointer;">
          <div class="task-title">${Utils.escapeHtml(reminder.title)}</div>
          ${reminder.description ? `<div class="task-desc">${Utils.escapeHtml(reminder.description)}</div>` : ''}
          <div class="item-meta-row">
            ${isOverdue ? `<span class="badge badge-urgent">Overdue</span>` : ''}
            <span class="meta-chip">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              ${isCompleted ? 'Completed' : (reminder.notificationStatus === 'sent' ? 'Notified' : 'Scheduled')}
            </span>
            ${showSnooze ? `
              <div class="snooze-actions-row" style="display: inline-flex; gap: 4px; margin-left: 4px;" onclick="event.stopPropagation();">
                <button class="btn btn-ghost btn-sm" style="padding: 2px 6px; font-size: 0.72rem; color: var(--text-muted);" 
                        onclick="Reminders.snooze('${reminder.id}', 60)" title="Snooze for 1 hour">+1h</button>
                <button class="btn btn-ghost btn-sm" style="padding: 2px 6px; font-size: 0.72rem; color: var(--text-muted);" 
                        onclick="Reminders.snoozeToTomorrow('${reminder.id}')" title="Snooze to tomorrow">Tomorrow</button>
              </div>
            ` : ''}
          </div>
        </div>

        <div class="item-actions">
          <button class="btn-icon" onclick="Reminders.editReminder('${reminder.id}')" title="Edit reminder" aria-label="Edit reminder">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </button>
          <button class="btn-icon" onclick="Reminders.deleteReminder('${reminder.id}')" title="Delete reminder" aria-label="Delete reminder">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    `;
  },

  /**
   * Snooze reminder by N minutes
   */
  async snooze(id, minutes = 60) {
    const reminder = State.reminders.find(r => r.id === id);
    if (!reminder) return;

    const now = new Date();
    now.setMinutes(now.getMinutes() + minutes);

    reminder.reminderDate = Utils.formatDateToISO(now);
    reminder.reminderTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    reminder.notificationStatus = 'pending';
    reminder.updatedAt = Date.now();

    Utils.playSound('click');
    await DB.put(STORES.REMINDERS, reminder);
    await State.reloadFromDB();
    Utils.showToast(`Snoozed to ${Utils.formatTime(reminder.reminderTime)}`, 'info');

    if (window.Notifications) {
      Notifications.scheduleReminder(reminder);
    }
  },

  /**
   * Snooze reminder to tomorrow morning at 09:00
   */
  async snoozeToTomorrow(id) {
    const reminder = State.reminders.find(r => r.id === id);
    if (!reminder) return;

    reminder.reminderDate = Utils.getTomorrowDateString();
    reminder.reminderTime = '09:00';
    reminder.notificationStatus = 'pending';
    reminder.updatedAt = Date.now();

    Utils.playSound('click');
    await DB.put(STORES.REMINDERS, reminder);
    await State.reloadFromDB();
    Utils.showToast('Snoozed to tomorrow at 9:00 AM', 'info');

    if (window.Notifications) {
      Notifications.scheduleReminder(reminder);
    }
  },

  /**
   * Toggle completion
   */
  async toggleComplete(id) {
    const reminder = State.reminders.find(r => r.id === id);
    if (!reminder) return;

    const newCompleted = !reminder.completed;
    reminder.completed = newCompleted;
    reminder.completedAt = newCompleted ? Date.now() : null;
    reminder.updatedAt = Date.now();

    if (newCompleted) {
      Utils.playSound('complete');
      Utils.triggerConfetti();
    } else {
      Utils.playSound('click');
    }

    try {
      await DB.put(STORES.REMINDERS, reminder);
      await State.reloadFromDB();
      Utils.showToast(newCompleted ? 'Reminder completed! ✨' : 'Reminder reopened', 'success');

      if (newCompleted && window.Notifications) {
        Notifications.cancelScheduledReminder(id);
      }
    } catch (err) {
      console.error('Failed to update reminder:', err);
      Utils.showToast('Failed to update reminder', 'error');
    }
  },

  /**
   * Open modal to edit reminder
   */
  editReminder(id) {
    const reminder = State.reminders.find(r => r.id === id);
    if (!reminder) return;
    this.activeReminderIdToEdit = id;
    App.openReminderModal(reminder);
  },

  /**
   * Delete reminder
   */
  async deleteReminder(id) {
    const reminder = State.reminders.find(r => r.id === id);
    if (!reminder) return;

    const confirmed = await Utils.confirm({
      title: 'Delete Reminder',
      message: `Delete reminder "${reminder.title}"?`,
      confirmText: 'Delete',
      isDanger: true
    });

    if (!confirmed) return;

    try {
      await DB.delete(STORES.REMINDERS, id);
      await State.reloadFromDB();
      Utils.showToast('Reminder deleted', 'info');

      if (window.Notifications) {
        Notifications.cancelScheduledReminder(id);
      }
    } catch (err) {
      console.error('Failed to delete reminder:', err);
      Utils.showToast('Failed to delete reminder', 'error');
    }
  },

  /**
   * Save reminder from form
   */
  async saveReminderFromForm(formData) {
    const title = (formData.title || '').trim();
    const reminderDate = formData.reminderDate;
    const reminderTime = formData.reminderTime || '09:00';

    if (!title) {
      Utils.showToast('Reminder title is required', 'error');
      return false;
    }
    if (!reminderDate) {
      Utils.showToast('Date is required for reminders', 'error');
      return false;
    }

    try {
      let savedReminder;
      if (this.activeReminderIdToEdit) {
        const existing = State.reminders.find(r => r.id === this.activeReminderIdToEdit);
        if (!existing) return false;

        savedReminder = {
          ...existing,
          title,
          description: (formData.description || '').trim(),
          reminderDate,
          reminderTime,
          updatedAt: Date.now()
        };

        await DB.put(STORES.REMINDERS, savedReminder);
        this.activeReminderIdToEdit = null;
        Utils.playSound('click');
        Utils.showToast('Reminder updated', 'success');
      } else {
        savedReminder = {
          id: Utils.generateId(),
          title,
          description: (formData.description || '').trim(),
          reminderDate,
          reminderTime,
          completed: false,
          completedAt: null,
          notificationStatus: 'pending',
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        await DB.add(STORES.REMINDERS, savedReminder);
        Utils.playSound('click');
        Utils.showToast('Reminder scheduled', 'success');
      }

      await State.reloadFromDB();

      if (window.Notifications) {
        Notifications.scheduleReminder(savedReminder);
      }

      return true;
    } catch (err) {
      console.error('Error saving reminder:', err);
      Utils.showToast('Failed to save reminder', 'error');
      return false;
    }
  }
};

window.Reminders = Reminders;
