/* DAYMARK — Remembers where the user was: last screen, scroll position, search text,
   filters and sort choices. Kept in localStorage (instant, per device). */

const Session = {
  KEY: 'daymark.session.v1',
  s: { view: 'dashboard', scroll: {}, controls: {} },

  // Controls whose value is remembered (search boxes and sort/filter dropdowns)
  FIELDS: ['taskSearchInput', 'reminderSearchInput', 'wishlistSearchInput', 'taskSortSelect', 'wishlistSortSelect',
    'wishlistCategorySelect', 'pickerBudgetSelect', 'pickerCatSelect'],
  // Chip bars: remember which chip is active
  BARS: ['taskFiltersBar', 'reminderFiltersBar', 'wishlistFiltersBar'],

  read() {
    try {
      const v = JSON.parse(localStorage.getItem(this.KEY) || 'null');
      if (v && typeof v === 'object') this.s = { view: 'dashboard', scroll: {}, controls: {}, ...v };
    } catch (e) { /* storage blocked or corrupt: start fresh */ }
    return this.s;
  },

  write() {
    try { localStorage.setItem(this.KEY, JSON.stringify(this.s)); } catch (e) { /* ignore */ }
  },

  /** Call before Navigation.init: open the last screen unless the URL already names one (e.g. a notification tap). */
  restoreView() {
    this.read();
    const hasHash = window.location.hash && window.location.hash.length > 1;
    if (!hasHash && this.s.view && this.s.view !== 'dashboard' && Navigation.views.includes(this.s.view)) {
      history.replaceState(null, '', '#' + this.s.view);
    }
  },

  /** Call after the views are rendered: put filters/search back and restore scroll. */
  restoreControls() {
    const c = this.s.controls || {};
    this.FIELDS.forEach(id => {
      const el = document.getElementById(id);
      if (!el || c[id] === undefined || el.value === c[id]) return;
      if (el.tagName === 'SELECT' && ![...el.options].some(o => o.value === c[id])) return;
      el.value = c[id];
      el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
    });
    this.BARS.forEach(id => {
      const want = c[id];
      const chip = want && document.querySelector(`#${id} .filter-chip[data-filter="${want}"]`);
      if (chip && !chip.classList.contains('active')) chip.click();
    });
  },

  restoreScroll() {
    const y = (this.s.scroll || {})[Navigation.currentView];
    if (y > 0) window.scrollTo(0, y);
  },

  /** Start recording changes. Call after restoreControls so restoring is not re-recorded wrongly. */
  track() {
    this.FIELDS.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const save = () => { this.s.controls[id] = el.value; this.write(); };
      el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', save);
    });
    this.BARS.forEach(id => {
      const bar = document.getElementById(id);
      if (!bar) return;
      bar.addEventListener('click', e => {
        const chip = e.target.closest('.filter-chip');
        if (chip) { this.s.controls[id] = chip.getAttribute('data-filter'); this.write(); }
      });
    });
    let t;
    window.addEventListener('scroll', () => {
      clearTimeout(t);
      t = setTimeout(() => { this.s.scroll[Navigation.currentView] = Math.round(window.scrollY); this.write(); }, 200);
    }, { passive: true });
    State.subscribe('VIEW_CHANGED', v => { this.s.view = (typeof v === 'string' ? v : Navigation.currentView); this.write(); });
  }
};

window.Session = Session;
