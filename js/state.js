/* DAYMARK — Application State Store */

class StateManager {
  constructor() {
    this.data = {
      tasks: [],
      reminders: [],
      wishlist: [],
      settings: {
        currency: 'GH₵',
        theme: 'dark',
        notificationsEnabled: true,
        pushServerUrl: ''
      },
      currentView: 'dashboard',
      taskFilter: 'all',
      taskSort: 'dueDate',
      taskSearch: '',
      reminderFilter: 'all',
      reminderSearch: '',
      wishlistFilter: 'all',
      wishlistCategory: 'all',
      wishlistSearch: '',
      isOnline: navigator.onLine,
      notificationPermission: (typeof Notification !== 'undefined') ? Notification.permission : 'unsupported'
    };

    this.listeners = new Map();
  }

  /**
   * Subscribe to state change events
   */
  subscribe(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    return () => this.unsubscribe(event, callback);
  }

  /**
   * Unsubscribe
   */
  unsubscribe(event, callback) {
    if (!this.listeners.has(event)) return;
    const filtered = this.listeners.get(event).filter(cb => cb !== callback);
    this.listeners.set(event, filtered);
  }

  /**
   * Emit an event
   */
  emit(event, payload = null) {
    if (this.listeners.has(event)) {
      for (const cb of this.listeners.get(event)) {
        try {
          cb(payload, this.data);
        } catch (err) {
          console.error(`Error in state listener for ${event}:`, err);
        }
      }
    }
    // Also notify global wildcard listeners
    if (this.listeners.has('*')) {
      for (const cb of this.listeners.get('*')) {
        try {
          cb(event, payload, this.data);
        } catch (err) {
          console.error(`Error in wildcard state listener:`, err);
        }
      }
    }
  }

  /**
   * Reload all state data from IndexedDB
   */
  async reloadFromDB() {
    try {
      const [tasks, reminders, wishlist, settingsEntries] = await Promise.all([
        DB.getAll(STORES.TASKS),
        DB.getAll(STORES.REMINDERS),
        DB.getAll(STORES.WISHLIST),
        DB.getAll(STORES.SETTINGS)
      ]);

      this.data.tasks = tasks || [];
      this.data.reminders = reminders || [];
      this.data.wishlist = wishlist || [];

      if (settingsEntries && settingsEntries.length > 0) {
        settingsEntries.forEach(entry => {
          this.data.settings[entry.key] = entry.value;
        });
      }

      this.emit('DATA_RELOADED', this.data);
      this.emit('TASKS_UPDATED', this.data.tasks);
      this.emit('REMINDERS_UPDATED', this.data.reminders);
      this.emit('WISHLIST_UPDATED', this.data.wishlist);
      this.emit('SETTINGS_UPDATED', this.data.settings);
    } catch (err) {
      console.error('Failed to reload state from DB:', err);
    }
  }

  // Getters
  get tasks() { return this.data.tasks; }
  get reminders() { return this.data.reminders; }
  get wishlist() { return this.data.wishlist; }
  get settings() { return this.data.settings; }
  get currency() { return this.data.settings.currency || 'GH₵'; }
  get currentView() { return this.data.currentView; }

  // Setters with events
  setCurrentView(view) {
    this.data.currentView = view;
    this.emit('VIEW_CHANGED', view);
  }

  setTaskFilter(filter) {
    this.data.taskFilter = filter;
    this.emit('TASK_FILTER_CHANGED', filter);
  }

  setTaskSort(sort) {
    this.data.taskSort = sort;
    this.emit('TASK_SORT_CHANGED', sort);
  }

  setTaskSearch(query) {
    this.data.taskSearch = query.trim().toLowerCase();
    this.emit('TASK_SEARCH_CHANGED', this.data.taskSearch);
  }

  setReminderFilter(filter) {
    this.data.reminderFilter = filter;
    this.emit('REMINDER_FILTER_CHANGED', filter);
  }

  setReminderSearch(query) {
    this.data.reminderSearch = query.trim().toLowerCase();
    this.emit('REMINDER_SEARCH_CHANGED', this.data.reminderSearch);
  }

  setWishlistFilter(filter) {
    this.data.wishlistFilter = filter;
    this.emit('WISHLIST_FILTER_CHANGED', filter);
  }

  setWishlistCategory(cat) {
    this.data.wishlistCategory = cat;
    this.emit('WISHLIST_CATEGORY_CHANGED', cat);
  }

  setWishlistSearch(query) {
    this.data.wishlistSearch = query.trim().toLowerCase();
    this.emit('WISHLIST_SEARCH_CHANGED', this.data.wishlistSearch);
  }

  setOnlineStatus(online) {
    this.data.isOnline = online;
    this.emit('NETWORK_STATUS_CHANGED', online);
  }

  setNotificationPermission(permission) {
    this.data.notificationPermission = permission;
    this.emit('NOTIFICATION_PERMISSION_CHANGED', permission);
  }
}

window.State = new StateManager();
