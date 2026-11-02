/* DAYMARK — Application Main Coordinator with Global Quick Action & Upgraded Modals */

const App = {
  activeModal: null,
  activeSubtasksList: [],

  /**
   * Application Bootstrapping
   */
  async init() {
    console.log('[DAYMARK] Initializing application...');

    try {
      await DB.init();
      await DB.seedInitialDataIfEmpty();
      await State.reloadFromDB();

      this.registerServiceWorker();
      this.initNetworkMonitoring();

      Navigation.init();
      Dashboard.init();
      Tasks.init();
      Reminders.init();
      Wishlist.init();
      Picker.init();
      Notifications.init();
      Settings.init();

      this.bindModals();
      this.bindGlobalQuickMenu();
      this.bindSubtaskBuilder();
      this.bindPresetButtons();

      console.log('[DAYMARK] Application successfully initialized.');
    } catch (err) {
      console.error('[DAYMARK] Initialization error:', err);
      Utils.showToast('Initialization warning: ' + err.message, 'error');
    }
  },

  /**
   * Register Service Worker
   */
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.register('./sw.js', { scope: './' });
        console.log('[DAYMARK] Service Worker registered with scope:', reg.scope);
      } catch (err) {
        console.warn('[DAYMARK] Service Worker registration failed:', err);
      }
    }
  },

  /**
   * Monitor online / offline network state
   */
  initNetworkMonitoring() {
    const updateStatus = () => {
      const isOnline = navigator.onLine;
      State.setOnlineStatus(isOnline);

      const pill = document.getElementById('headerNetworkPill');
      const dot = document.getElementById('headerNetworkDot');
      const text = document.getElementById('headerNetworkText');

      if (pill && dot && text) {
        if (isOnline) {
          pill.className = 'status-pill';
          dot.className = 'status-indicator-dot';
          text.textContent = 'Ready';
        } else {
          pill.className = 'status-pill offline';
          dot.className = 'status-indicator-dot offline';
          text.textContent = 'Offline (Local)';
          Utils.showToast('Working offline — changes are saved to local database.', 'info');
        }
      }
    };

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    updateStatus();
  },

  /**
   * Global Quick "+ Add" Dropdown Menu
   */
  bindGlobalQuickMenu() {
    const triggerBtn = document.getElementById('globalAddBtn');
    const dropdownMenu = document.getElementById('globalAddDropdown');
    const fabBtn = document.getElementById('mobileFabBtn');

    const toggleDropdown = (e) => {
      e.stopPropagation();
      Utils.playSound('click');
      if (dropdownMenu) {
        dropdownMenu.classList.toggle('active');
      }
    };

    if (triggerBtn) triggerBtn.addEventListener('click', toggleDropdown);
    if (fabBtn) fabBtn.addEventListener('click', toggleDropdown);

    document.addEventListener('click', (e) => {
      if (dropdownMenu && dropdownMenu.classList.contains('active')) {
        if (!dropdownMenu.contains(e.target) && e.target !== triggerBtn && e.target !== fabBtn) {
          dropdownMenu.classList.remove('active');
        }
      }
    });

    document.querySelectorAll('[data-quick-action]').forEach(item => {
      item.addEventListener('click', () => {
        const action = item.getAttribute('data-quick-action');
        if (dropdownMenu) dropdownMenu.classList.remove('active');

        if (action === 'task') this.openTaskModal();
        else if (action === 'reminder') this.openReminderModal();
        else if (action === 'wishlist') this.openWishlistModal();
        else if (action === 'picker') {
          Navigation.navigateTo('wishlist');
          setTimeout(() => Picker.pick(), 100);
        }
      });
    });
  },

  /**
   * Subtasks builder in Task Modal
   */
  bindSubtaskBuilder() {
    const addSubtaskBtn = document.getElementById('taskAddSubtaskBtn');
    const subtaskInput = document.getElementById('taskSubtaskInput');

    const addSubtask = () => {
      if (!subtaskInput) return;
      const text = subtaskInput.value.trim();
      if (!text) return;

      this.activeSubtasksList.push({
        id: Utils.generateId(),
        text,
        completed: false
      });

      subtaskInput.value = '';
      this.renderSubtasksList();
      subtaskInput.focus();
    };

    if (addSubtaskBtn) addSubtaskBtn.addEventListener('click', addSubtask);
    if (subtaskInput) {
      subtaskInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addSubtask();
        }
      });
    }
  },

  /**
   * Render subtasks rows in modal form
   */
  renderSubtasksList() {
    const container = document.getElementById('taskSubtasksListContainer');
    if (!container) return;

    if (this.activeSubtasksList.length === 0) {
      container.innerHTML = '<div style="font-size: 0.8rem; color: var(--text-muted); font-style: italic;">No checklist subtasks added yet.</div>';
      return;
    }

    container.innerHTML = this.activeSubtasksList.map((st, idx) => `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; background: var(--bg-card); border-radius: var(--radius-xs); border: 1px solid var(--border-subtle); gap: 8px;">
        <span style="font-size: 0.85rem; color: var(--text-primary); flex: 1; word-break: break-word;">${Utils.escapeHtml(st.text)}</span>
        <button type="button" class="btn-icon" style="width: 24px; height: 24px; color: var(--text-muted);" onclick="App.removeSubtask(${idx})" title="Remove">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    `).join('');
  },

  /**
   * Remove subtask from list
   */
  removeSubtask(idx) {
    this.activeSubtasksList.splice(idx, 1);
    this.renderSubtasksList();
  },

  /**
   * Preset chips binding (Dates, Times, Categories, Priorities)
   */
  bindPresetButtons() {
    // Due Date presets in Task modal
    document.querySelectorAll('.date-preset-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const dateInput = document.getElementById('taskInputDate');
        if (!dateInput) return;

        const preset = chip.getAttribute('data-date-preset');
        let targetDate = Utils.getTodayDateString();

        if (preset === 'today') targetDate = Utils.getTodayDateString();
        else if (preset === 'tomorrow') targetDate = Utils.getTomorrowDateString();
        else if (preset === '3days') targetDate = Utils.getDateInDays(3);
        else if (preset === '1week') targetDate = Utils.getDateInDays(7);

        dateInput.value = targetDate;
        document.querySelectorAll('.date-preset-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        Utils.playSound('click');
      });
    });

    // Time presets in Reminder modal
    document.querySelectorAll('.time-preset-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const timeInput = document.getElementById('reminderInputTime');
        if (!timeInput) return;

        const timeVal = chip.getAttribute('data-time-preset');
        timeInput.value = timeVal;
        document.querySelectorAll('.time-preset-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        Utils.playSound('click');
      });
    });

    // Priority pill selectors in Task modal
    document.querySelectorAll('.prio-select-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const prioInput = document.getElementById('taskInputPriority');
        const prio = pill.getAttribute('data-priority');
        if (prioInput) prioInput.value = prio;

        document.querySelectorAll('.prio-select-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        Utils.playSound('click');
      });
    });

    // Priority pill selectors in Wishlist modal
    document.querySelectorAll('.wish-prio-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const prioInput = document.getElementById('wishlistInputPriority');
        const prio = pill.getAttribute('data-wish-prio');
        if (prioInput) prioInput.value = prio;

        document.querySelectorAll('.wish-prio-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        Utils.playSound('click');
      });
    });

    // Category quick suggestion chips
    document.querySelectorAll('.cat-suggest-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const targetInputId = chip.getAttribute('data-target-input');
        const targetInput = document.getElementById(targetInputId);
        if (targetInput) {
          targetInput.value = chip.textContent.trim();
          Utils.playSound('click');
        }
      });
    });
  },

  /**
   * Bind Modals, forms, backdrop clicks, Escape key
   */
  bindModals() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeModal) {
        this.closeModal(this.activeModal);
      }
    });

    // Task Form submit
    const taskForm = document.getElementById('taskForm');
    if (taskForm) {
      taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = {
          title: document.getElementById('taskInputTitle').value,
          description: document.getElementById('taskInputDesc').value,
          priority: document.getElementById('taskInputPriority').value,
          dueDate: document.getElementById('taskInputDate').value,
          dueTime: document.getElementById('taskInputTime').value,
          category: document.getElementById('taskInputCategory').value,
          subtasks: this.activeSubtasksList
        };
        const ok = await Tasks.saveTaskFromForm(formData);
        if (ok) {
          this.closeModal('taskModal');
        }
      });
    }

    // Reminder Form submit
    const reminderForm = document.getElementById('reminderForm');
    if (reminderForm) {
      reminderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = {
          title: document.getElementById('reminderInputTitle').value,
          description: document.getElementById('reminderInputDesc').value,
          reminderDate: document.getElementById('reminderInputDate').value,
          reminderTime: document.getElementById('reminderInputTime').value
        };
        const ok = await Reminders.saveReminderFromForm(formData);
        if (ok) {
          this.closeModal('reminderModal');
        }
      });
    }

    // Wishlist Form submit
    const wishlistForm = document.getElementById('wishlistForm');
    if (wishlistForm) {
      wishlistForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = {
          name: document.getElementById('wishlistInputName').value,
          description: document.getElementById('wishlistInputDesc').value,
          estimatedPrice: document.getElementById('wishlistInputPrice').value,
          category: document.getElementById('wishlistInputCategory').value,
          priority: document.getElementById('wishlistInputPriority').value,
          productUrl: document.getElementById('wishlistInputUrl').value,
          notes: document.getElementById('wishlistInputNotes').value
        };
        const ok = await Wishlist.saveItemFromForm(formData);
        if (ok) {
          this.closeModal('wishlistModal');
        }
      });
    }

    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-close-modal');
        this.closeModal(modalId);
      });
    });

    ['taskModal', 'reminderModal', 'wishlistModal', 'confirmModal'].forEach(id => {
      const modal = document.getElementById(id);
      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) {
            this.closeModal(id);
          }
        });
      }
    });
  },

  /**
   * Open Task Modal
   */
  openTaskModal(task = null) {
    const modal = document.getElementById('taskModal');
    const titleEl = document.getElementById('taskModalTitle');
    const form = document.getElementById('taskForm');
    if (!modal || !form) return;

    form.reset();
    this.activeSubtasksList = [];

    if (task) {
      titleEl.textContent = 'Edit Task';
      document.getElementById('taskInputTitle').value = task.title || '';
      document.getElementById('taskInputDesc').value = task.description || '';
      document.getElementById('taskInputPriority').value = task.priority || 'normal';
      document.getElementById('taskInputDate').value = task.dueDate || '';
      document.getElementById('taskInputTime').value = task.dueTime || '';
      document.getElementById('taskInputCategory').value = task.category || '';
      this.activeSubtasksList = Array.isArray(task.subtasks) ? [...task.subtasks] : [];
    } else {
      titleEl.textContent = 'New Task';
      Tasks.activeTaskIdToEdit = null;
      document.getElementById('taskInputPriority').value = 'normal';
      document.getElementById('taskInputDate').value = Utils.getTodayDateString();
      document.getElementById('taskInputCategory').value = 'Personal';
    }

    // Sync priority pill active state
    const prioVal = document.getElementById('taskInputPriority').value || 'normal';
    document.querySelectorAll('.prio-select-pill').forEach(pill => {
      pill.classList.toggle('active', pill.getAttribute('data-priority') === prioVal);
    });

    this.renderSubtasksList();
    this.showModal('taskModal');
    setTimeout(() => {
      const input = document.getElementById('taskInputTitle');
      if (input) input.focus();
    }, 150);
  },

  /**
   * Open Reminder Modal
   */
  openReminderModal(reminder = null) {
    const modal = document.getElementById('reminderModal');
    const titleEl = document.getElementById('reminderModalTitle');
    const form = document.getElementById('reminderForm');
    if (!modal || !form) return;

    form.reset();

    if (reminder) {
      titleEl.textContent = 'Edit Reminder';
      document.getElementById('reminderInputTitle').value = reminder.title || '';
      document.getElementById('reminderInputDesc').value = reminder.description || '';
      document.getElementById('reminderInputDate').value = reminder.reminderDate || '';
      document.getElementById('reminderInputTime').value = reminder.reminderTime || '09:00';
    } else {
      titleEl.textContent = 'New Reminder';
      Reminders.activeReminderIdToEdit = null;
      document.getElementById('reminderInputDate').value = Utils.getTodayDateString();
      document.getElementById('reminderInputTime').value = '09:00';
    }

    this.showModal('reminderModal');
    setTimeout(() => {
      const input = document.getElementById('reminderInputTitle');
      if (input) input.focus();
    }, 150);
  },

  /**
   * Open Wishlist Modal
   */
  openWishlistModal(item = null) {
    const modal = document.getElementById('wishlistModal');
    const titleEl = document.getElementById('wishlistModalTitle');
    const form = document.getElementById('wishlistForm');
    if (!modal || !form) return;

    form.reset();

    if (item) {
      titleEl.textContent = 'Edit Wishlist Item';
      document.getElementById('wishlistInputName').value = item.name || '';
      document.getElementById('wishlistInputPrice').value = item.estimatedPrice || '';
      document.getElementById('wishlistInputCategory').value = item.category || 'Tech';
      document.getElementById('wishlistInputPriority').value = item.priority || 'medium';
      document.getElementById('wishlistInputUrl').value = item.productUrl || '';
      document.getElementById('wishlistInputDesc').value = item.description || '';
      document.getElementById('wishlistInputNotes').value = item.notes || '';
    } else {
      titleEl.textContent = 'New Wishlist Item';
      Wishlist.activeWishlistIdToEdit = null;
      document.getElementById('wishlistInputCategory').value = 'Tech';
      document.getElementById('wishlistInputPriority').value = 'medium';
    }

    const prioVal = document.getElementById('wishlistInputPriority').value || 'medium';
    document.querySelectorAll('.wish-prio-pill').forEach(pill => {
      pill.classList.toggle('active', pill.getAttribute('data-wish-prio') === prioVal);
    });

    this.showModal('wishlistModal');
    setTimeout(() => {
      const input = document.getElementById('wishlistInputName');
      if (input) input.focus();
    }, 150);
  },

  /**
   * Show modal
   */
  showModal(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('active');
      this.activeModal = id;
    }
  },

  /**
   * Close modal
   */
  closeModal(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove('active');
      if (this.activeModal === id) this.activeModal = null;
    }
  }
};

window.App = App;

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
