/* DAYMARK — Application Main Coordinator */

const App = {
  activeModal: null,

  /**
   * Application Bootstrapping
   */
  async init() {
    console.log('[DAYMARK] Initializing application...');

    try {
      // 1. Initialize IndexedDB
      await DB.init();
      await DB.seedInitialDataIfEmpty();

      // 2. Initialize State and load data
      await State.reloadFromDB();

      // 3. Register Service Worker for PWA & Offline
      this.registerServiceWorker();

      // 4. Setup Online / Offline Status
      this.initNetworkMonitoring();

      // 5. Initialize UI Modules
      Navigation.init();
      Dashboard.init();
      Tasks.init();
      Reminders.init();
      Wishlist.init();
      Picker.init();
      Notifications.init();
      Settings.init();

      // 6. Bind Modal and Form Handlers
      this.bindModals();

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

        // Check for updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[DAYMARK] New content is available; please refresh.');
              }
            });
          }
        });
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
   * Bind Modals, forms, backdrop clicks, Escape key
   */
  bindModals() {
    // Escape key closes active modal
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
          category: document.getElementById('taskInputCategory').value
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
          productUrl: document.getElementById('wishlistInputUrl').value,
          notes: document.getElementById('wishlistInputNotes').value
        };
        const ok = await Wishlist.saveItemFromForm(formData);
        if (ok) {
          this.closeModal('wishlistModal');
        }
      });
    }

    // Close button listeners for all modals
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-close-modal');
        this.closeModal(modalId);
      });
    });

    // Backdrop click listeners
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
   * Open Task Modal (Create or Edit)
   */
  openTaskModal(task = null) {
    const modal = document.getElementById('taskModal');
    const titleEl = document.getElementById('taskModalTitle');
    const form = document.getElementById('taskForm');
    if (!modal || !form) return;

    form.reset();

    if (task) {
      titleEl.textContent = 'Edit Task';
      document.getElementById('taskInputTitle').value = task.title || '';
      document.getElementById('taskInputDesc').value = task.description || '';
      document.getElementById('taskInputPriority').value = task.priority || 'normal';
      document.getElementById('taskInputDate').value = task.dueDate || '';
      document.getElementById('taskInputTime').value = task.dueTime || '';
      document.getElementById('taskInputCategory').value = task.category || '';
    } else {
      titleEl.textContent = 'New Task';
      Tasks.activeTaskIdToEdit = null;
      document.getElementById('taskInputPriority').value = 'normal';
      document.getElementById('taskInputDate').value = Utils.getTodayDateString();
    }

    this.showModal('taskModal');
    setTimeout(() => {
      const input = document.getElementById('taskInputTitle');
      if (input) input.focus();
    }, 150);
  },

  /**
   * Open Reminder Modal (Create or Edit)
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
   * Open Wishlist Modal (Create or Edit)
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
      document.getElementById('wishlistInputUrl').value = item.productUrl || '';
      document.getElementById('wishlistInputDesc').value = item.description || '';
      document.getElementById('wishlistInputNotes').value = item.notes || '';
    } else {
      titleEl.textContent = 'New Wishlist Item';
      Wishlist.activeWishlistIdToEdit = null;
      document.getElementById('wishlistInputCategory').value = 'Tech';
    }

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

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
