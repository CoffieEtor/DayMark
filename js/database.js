/* DAYMARK — IndexedDB Database Layer */

const DB_NAME = 'daymark_db';
const DB_VERSION = 1;

const STORES = {
  TASKS: 'tasks',
  REMINDERS: 'reminders',
  WISHLIST: 'wishlist',
  SETTINGS: 'settings'
};

class DaymarkDatabase {
  constructor() {
    this.db = null;
    this.isReady = false;
  }

  /**
   * Initialize IndexedDB with schema creation and migrations
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // 1. Tasks Store
        if (!db.objectStoreNames.contains(STORES.TASKS)) {
          const taskStore = db.createObjectStore(STORES.TASKS, { keyPath: 'id' });
          taskStore.createIndex('by_completed', 'completed', { unique: false });
          taskStore.createIndex('by_dueDate', 'dueDate', { unique: false });
          taskStore.createIndex('by_priority', 'priority', { unique: false });
          taskStore.createIndex('by_createdAt', 'createdAt', { unique: false });
        }

        // 2. Reminders Store
        if (!db.objectStoreNames.contains(STORES.REMINDERS)) {
          const reminderStore = db.createObjectStore(STORES.REMINDERS, { keyPath: 'id' });
          reminderStore.createIndex('by_completed', 'completed', { unique: false });
          reminderStore.createIndex('by_reminderDate', 'reminderDate', { unique: false });
          reminderStore.createIndex('by_createdAt', 'createdAt', { unique: false });
        }

        // 3. Wishlist Store
        if (!db.objectStoreNames.contains(STORES.WISHLIST)) {
          const wishlistStore = db.createObjectStore(STORES.WISHLIST, { keyPath: 'id' });
          wishlistStore.createIndex('by_purchased', 'purchased', { unique: false });
          wishlistStore.createIndex('by_category', 'category', { unique: false });
          wishlistStore.createIndex('by_createdAt', 'createdAt', { unique: false });
        }

        // 4. Settings Store (key-value)
        if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
          db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        this.isReady = true;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('IndexedDB open error:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  /**
   * Helper to perform a store transaction
   */
  _tx(storeName, mode = 'readonly') {
    if (!this.db) throw new Error('Database not initialized');
    const transaction = this.db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  /**
   * Get all items from a store
   */
  async getAll(storeName) {
    return new Promise((resolve, reject) => {
      try {
        const store = this._tx(storeName, 'readonly');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Get single item by ID
   */
  async getById(storeName, id) {
    return new Promise((resolve, reject) => {
      try {
        const store = this._tx(storeName, 'readonly');
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Add a new item
   */
  async add(storeName, item) {
    return new Promise((resolve, reject) => {
      try {
        const store = this._tx(storeName, 'readwrite');
        const request = store.add(item);
        request.onsuccess = () => resolve(item);
        request.onerror = () => reject(request.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Put (insert or update) an item
   */
  async put(storeName, item) {
    return new Promise((resolve, reject) => {
      try {
        const store = this._tx(storeName, 'readwrite');
        const request = store.put(item);
        request.onsuccess = () => resolve(item);
        request.onerror = () => reject(request.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Delete an item by ID
   */
  async delete(storeName, id) {
    return new Promise((resolve, reject) => {
      try {
        const store = this._tx(storeName, 'readwrite');
        const request = store.delete(id);
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Clear all records in a single store
   */
  async clearStore(storeName) {
    return new Promise((resolve, reject) => {
      try {
        const store = this._tx(storeName, 'readwrite');
        const request = store.clear();
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Clear all stores completely
   */
  async clearAll() {
    await this.clearStore(STORES.TASKS);
    await this.clearStore(STORES.REMINDERS);
    await this.clearStore(STORES.WISHLIST);
    await this.clearStore(STORES.SETTINGS);
    return true;
  }

  /**
   * Get a setting by key
   */
  async getSetting(key, defaultValue = null) {
    const item = await this.getById(STORES.SETTINGS, key);
    return (item && item.value !== undefined) ? item.value : defaultValue;
  }

  /**
   * Save a setting
   */
  async setSetting(key, value) {
    return this.put(STORES.SETTINGS, { key, value, updatedAt: Date.now() });
  }

  /**
   * Seed welcoming initial data if database is brand new
   */
  async seedInitialDataIfEmpty() {
    const tasks = await this.getAll(STORES.TASKS);
    const reminders = await this.getAll(STORES.REMINDERS);
    const wishlist = await this.getAll(STORES.WISHLIST);

    if (tasks.length === 0 && reminders.length === 0 && wishlist.length === 0) {
      const todayStr = Utils.getTodayDateString();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = Utils.formatDateToISO(tomorrow);

      // Initial default tasks
      const sampleTasks = [
        {
          id: Utils.generateId(),
          title: 'Welcome to DAYMARK — Organize your day',
          description: 'Explore the dashboard, track your responsibilities, set reminders, and curate your wishlist.',
          priority: 'high',
          dueDate: todayStr,
          dueTime: '17:00',
          category: 'Personal',
          completed: false,
          completedAt: null,
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: Utils.generateId(),
          title: 'Add DAYMARK to your iPhone Home Screen',
          description: 'In Safari, tap Share → "Add to Home Screen" to install DAYMARK as a standalone PWA with offline support.',
          priority: 'urgent',
          dueDate: todayStr,
          dueTime: '19:00',
          category: 'Setup',
          completed: false,
          completedAt: null,
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: Utils.generateId(),
          title: 'Review weekly shopping and project budget',
          description: 'Check essential grocery items and upcoming hardware purchases.',
          priority: 'normal',
          dueDate: tomorrowStr,
          dueTime: '10:00',
          category: 'Finance',
          completed: false,
          completedAt: null,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      for (const t of sampleTasks) {
        await this.add(STORES.TASKS, t);
      }

      // Initial default reminders
      const sampleReminders = [
        {
          id: Utils.generateId(),
          title: 'Evening Routine & Wind Down',
          description: 'Review completed tasks and plan priorities for tomorrow.',
          reminderDate: todayStr,
          reminderTime: '20:30',
          completed: false,
          completedAt: null,
          notificationStatus: 'pending',
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: Utils.generateId(),
          title: 'Review team milestones and pending invoices',
          description: 'Ensure all deliverables are confirmed before month end.',
          reminderDate: tomorrowStr,
          reminderTime: '09:00',
          completed: false,
          completedAt: null,
          notificationStatus: 'pending',
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      for (const r of sampleReminders) {
        await this.add(STORES.REMINDERS, r);
      }

      // Initial default wishlist items (Ghana Cedis)
      const sampleWishlist = [
        {
          id: Utils.generateId(),
          name: 'Noise-Cancelling Over-Ear Headphones',
          description: 'For deep work and focused study sessions with high-fidelity audio.',
          estimatedPrice: 1250,
          currency: 'GH₵',
          category: 'Tech',
          productUrl: 'https://example.com/headphones',
          notes: 'Prefer matte black finish with ANC.',
          purchased: false,
          purchasedAt: null,
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: Utils.generateId(),
          name: 'Ergonomic Standing Desk Mat',
          description: 'Anti-fatigue high-density core mat for comfortable long work hours.',
          estimatedPrice: 380,
          currency: 'GH₵',
          category: 'Workspace',
          productUrl: '',
          notes: 'Standard 24x36 inch size.',
          purchased: false,
          purchasedAt: null,
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: Utils.generateId(),
          name: 'Minimalist Mechanical Keyboard',
          description: 'Wireless Bluetooth with tactile brown switches and clean typography keycaps.',
          estimatedPrice: 850,
          currency: 'GH₵',
          category: 'Tech',
          productUrl: '',
          notes: 'Compact 75% layout.',
          purchased: false,
          purchasedAt: null,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      for (const w of sampleWishlist) {
        await this.add(STORES.WISHLIST, w);
      }

      // Default settings
      await this.setSetting('currency', 'GH₵');
      await this.setSetting('theme', 'dark');
      await this.setSetting('notificationsEnabled', true);
    }
  }
}

window.DB = new DaymarkDatabase();
window.STORES = STORES;
