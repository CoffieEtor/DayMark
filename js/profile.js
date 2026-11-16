/* DAYMARK — User profile (name + how to address them) and demo-data cleanup.
   Stored in the IndexedDB settings store, so it is included in backups. */

const Profile = {
  data: { name: '', addressAs: '', onboarded: false },

  // Titles are offered as quick choices on the "how should I address you" step
  TITLES: ['Mr', 'Ms', 'Mrs', 'Dr', 'Prof'],

  // Items created by the old first-run seed; removed once, on first onboarding, if untouched
  SAMPLE_TITLES: {
    tasks: ['Welcome to DAYMARK — Organize your day', 'Add DAYMARK to your iPhone Home Screen', 'Review weekly shopping and project budget'],
    reminders: ['Evening Routine & Wind Down', 'Review team milestones and pending invoices'],
    wishlist: ['Noise-Cancelling Over-Ear Headphones', 'Ergonomic Standing Desk Mat', 'Minimalist Mechanical Keyboard']
  },

  clean(s) {
    return String(s || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  },

  /** Suggested ways to be addressed, derived from the full name. */
  suggestions(fullName) {
    const name = this.clean(fullName);
    if (!name) return [];
    const parts = name.split(' ');
    const first = parts[0];
    const last = parts.length > 1 ? parts[parts.length - 1] : parts[0];
    const out = [first];
    if (parts.length > 1) out.push(name);
    this.TITLES.forEach(t => out.push(`${t} ${last}`));
    return [...new Set(out)];
  },

  /** Name used in greetings: the chosen form of address, else the first name, else ''. */
  displayName() {
    return this.clean(this.data.addressAs) || this.clean(this.data.name).split(' ')[0] || '';
  },

  async load(db) {
    this.data = {
      name: await db.getSetting('profileName', ''),
      addressAs: await db.getSetting('profileAddressAs', ''),
      onboarded: (await db.getSetting('onboarded', false)) === true
    };
    return this.data;
  },

  async save(db, patch) {
    const next = { ...this.data, ...patch };
    next.name = this.clean(next.name);
    next.addressAs = this.clean(next.addressAs);
    await db.setSetting('profileName', next.name);
    await db.setSetting('profileAddressAs', next.addressAs);
    await db.setSetting('onboarded', !!next.onboarded);
    this.data = next;
    return next;
  },

  /** Delete leftover demo items (only if the user never edited them). Returns how many were removed. */
  async removeSampleData(db) {
    let removed = 0;
    const map = [[STORES.TASKS, 'title', this.SAMPLE_TITLES.tasks], [STORES.REMINDERS, 'title', this.SAMPLE_TITLES.reminders], [STORES.WISHLIST, 'name', this.SAMPLE_TITLES.wishlist]];
    for (const [store, field, titles] of map) {
      for (const item of await db.getAll(store)) {
        const untouched = Math.abs((item.updatedAt || 0) - (item.createdAt || 0)) < 1000 && !item.completed && !item.purchased;
        if (titles.includes(item[field]) && untouched) { await db.delete(store, item.id); removed++; }
      }
    }
    return removed;
  }
};

window.Profile = Profile;
