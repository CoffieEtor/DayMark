/* DAYMARK — Splash screen control and the first-run welcome (what the app is, name, how to be
   addressed, quick tour). Nothing is pre-filled: the app starts empty. */

const Splash = {
  startedAt: Date.now(),

  setGreeting(text) {
    const el = document.getElementById('splashTag');
    if (el && text) el.textContent = text;
  },

  /** Hide after at least `minMs` since page load so the animation is seen but never feels slow. */
  hide(minMs = 800) {
    const el = document.getElementById('splash');
    if (!el) return;
    const wait = Math.max(0, minMs - (Date.now() - this.startedAt));
    setTimeout(() => {
      el.classList.add('hide');
      setTimeout(() => el.remove(), 400);
    }, wait);
  }
};

const Onboarding = {
  el: null,
  steps: [],
  i: 0,
  tourOnly: false,
  draft: { name: '', addressAs: '' },

  ICONS: {
    task: '<svg viewBox="0 0 24 24"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
    bell: '<svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
    bag: '<svg viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
    dice: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1"/><circle cx="15.5" cy="15.5" r="1"/><circle cx="12" cy="12" r="1"/></svg>',
    user: '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    smile: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>',
    gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    check: '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>'
  },

  esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },

  buildSteps() {
    const tour = [
      { id: 'tour-tasks', kicker: 'Quick tour · 1 of 4', icon: 'task', title: 'Tasks',
        body: 'Write down what you need to do. Give each task a priority, a due date and time, and a category. Tap the circle when it’s done. Overdue tasks are flagged so nothing slips.' },
      { id: 'tour-reminders', kicker: 'Quick tour · 2 of 4', icon: 'bell', title: 'Reminders',
        body: 'Pick a date and time and DAYMARK will alert you. Turn on notifications in Settings to be alerted even when the app is closed. Snooze when you need a little more time.' },
      { id: 'tour-wishlist', kicker: 'Quick tour · 3 of 4', icon: 'dice', title: 'Wishlist & “Pick for me”',
        body: 'Save things you plan to buy with a price and link. Can’t decide what to get first? Tap “Pick for me” and DAYMARK chooses one that fits your budget.' },
      { id: 'tour-settings', kicker: 'Quick tour · 4 of 4', icon: 'gear', title: 'Make it yours',
        body: 'In Settings you can change your name, currency and colours, install DAYMARK on your home screen, and back up your data. It always reopens where you left off.' }
    ];
    const welcome = { id: 'welcome' };
    const overview = { id: 'overview' };
    if (this.tourOnly) return [welcome, overview, ...tour, { id: 'done' }];
    return [welcome, overview, { id: 'name' }, { id: 'address' }, ...tour, { id: 'done' }];
  },

  async start(opts = {}) {
    this.tourOnly = !!opts.tourOnly;
    this.draft = { name: Profile.data.name || '', addressAs: Profile.data.addressAs || '' };
    this.steps = this.buildSteps();
    this.i = 0;
    this.finished = new Promise(res => { this.resolve = res; });

    const el = document.createElement('div');
    el.id = 'onboarding';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Welcome to DAYMARK');
    el.innerHTML = `
      <div class="ob-top"><div class="ob-progress" aria-label="Onboarding progress">${this.steps.map((_, idx) => `<i data-step="${idx}"></i>`).join('')}</div><button class="ob-skip" type="button" hidden>Skip tour</button></div>
      <div class="ob-stage"><div class="ob-card" id="obCard"></div></div>
      <div class="ob-nav"><button class="ob-btn" type="button" id="obBack">Previous</button><button class="ob-btn primary" type="button" id="obNext">Next</button></div>`;
    document.body.appendChild(el);
    this.el = el;

    el.querySelector('#obBack').addEventListener('click', () => this.go(-1));
    el.querySelector('#obNext').addEventListener('click', () => this.next());
    el.querySelector('.ob-skip').addEventListener('click', () => this.skipTour());
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); this.next(); }
    });
    this.render();
    return this.finished;
  },

  // ---------- rendering ----------
  render() {
    const step = this.steps[this.i];
    const card = this.el.querySelector('#obCard');
    const back = this.el.querySelector('#obBack');
    const next = this.el.querySelector('#obNext');
    const skip = this.el.querySelector('.ob-skip');
    const dashes = this.el.querySelectorAll('.ob-progress > i');
    const who = this.esc(this.draft.addressAs || this.firstName() || '');
    const isTour = step.id.startsWith('tour-');

    dashes.forEach((d, idx) => {
      d.classList.toggle('active', idx === this.i);
      d.classList.toggle('done', idx < this.i);
    });
    back.hidden = (this.i === 0);
    this.el.querySelector('.ob-nav').classList.toggle('single', this.i === 0);
    skip.hidden = (step.id === 'done');
    skip.textContent = isTour ? 'Skip tour' : 'Skip';
    next.textContent = 'Next';

    let html = '';
    if (step.id === 'welcome') {
      next.textContent = this.tourOnly ? 'Start tour' : 'Get started';
      html = `
        <div class="ob-kicker">Welcome</div>
        <h1>Welcome to DAYMARK</h1>
        <p>DAYMARK is your personal command centre for the day: one calm place for what you need to do, what you must not forget, and what you want to buy.</p>
        <p style="margin-top:14px;font-size:.85rem">Everything stays on this device. No account needed.</p>`;
    } else if (step.id === 'overview') {
      html = `
        <div class="ob-kicker">What’s inside</div>
        <h1>Three focused spaces</h1>
        <p>Each part of your day has its own dedicated section.</p>
        <div class="ob-features">
          <div class="ob-feature"><div><b>Tasks</b><span>Priorities, due dates and an always-clear view of today.</span></div></div>
          <div class="ob-feature"><div><b>Reminders</b><span>Time-based alerts, even when the app is closed.</span></div></div>
          <div class="ob-feature"><div><b>Wishlist</b><span>Save purchases and let “Pick for me” decide within your budget.</span></div></div>
        </div>`;
    } else if (step.id === 'name') {
      html = `
        <div class="ob-kicker">About you</div>
        <h1>What’s your name?</h1>
        <p>So DAYMARK can greet you properly.</p>
        <input id="obName" class="ob-input" type="text" inputmode="text" autocomplete="name" autocapitalize="words" maxlength="40"
          placeholder="e.g. Michael Coffie" value="${this.esc(this.draft.name)}" aria-describedby="obErr">
        <div id="obErr" class="ob-error" role="alert"></div>`;
    } else if (step.id === 'address') {
      const opts = Profile.suggestions(this.draft.name);
      html = `
        <div class="ob-kicker">Your style</div>
        <h1>How should DAYMARK address you?</h1>
        <p>Choose one below or type your own, like a nickname or a title.</p>
        <input id="obAddr" class="ob-input" type="text" autocomplete="off" autocapitalize="words" maxlength="40"
          placeholder="e.g. Boss" value="${this.esc(this.draft.addressAs || opts[0] || '')}" aria-describedby="obErr">
        <div class="ob-chips" role="group" aria-label="Suggestions">${opts.map(o => `<button type="button" class="ob-chip" data-v="${this.esc(o)}">${this.esc(o)}</button>`).join('')}</div>
        <div id="obErr" class="ob-error" role="alert"></div>
        <div class="ob-preview">You’ll see<strong id="obPrev"></strong></div>`;
    } else if (isTour) {
      html = `
        <div class="ob-kicker">${step.kicker}</div>
        <h1>${step.title}</h1>
        <p>${step.body}</p>`;
    } else if (step.id === 'done') {
      next.textContent = this.tourOnly ? 'Done' : 'Open DAYMARK';
      html = `
        <div class="ob-kicker">${this.tourOnly ? 'That’s the tour' : 'All set'}</div>
        <h1>${this.tourOnly ? 'You’re ready' : `You’re all set${who ? ', ' + who : ''}`}</h1>
        <p>${this.tourOnly ? 'Replay this any time from Settings.' : 'Your lists start empty. Add your first task, reminder or wishlist item whenever you’re ready. DAYMARK remembers everything you enter and reopens where you left off.'}</p>`;
    }
    card.innerHTML = html;
    card.style.animation = 'none'; void card.offsetWidth; card.style.animation = '';

    if (step.id === 'name') this.bindName(); else if (step.id === 'address') this.bindAddress();
    const focusEl = card.querySelector('input');
    if (focusEl) setTimeout(() => focusEl.focus({ preventScroll: true }), 120);
    else next.focus({ preventScroll: true });
  },

  firstName() { return Profile.clean(this.draft.name).split(' ')[0]; },

  bindName() {
    const input = this.el.querySelector('#obName');
    input.addEventListener('input', () => { input.classList.remove('bad'); this.el.querySelector('#obErr').textContent = ''; });
  },

  bindAddress() {
    const input = this.el.querySelector('#obAddr');
    const chips = [...this.el.querySelectorAll('.ob-chip')];
    const prev = this.el.querySelector('#obPrev');
    const sync = () => {
      const v = Profile.clean(input.value);
      chips.forEach(c => c.classList.toggle('on', c.dataset.v === v));
      prev.textContent = `${Utils.getTimeOfDayGreeting()}${v ? ', ' + v : ''}`;
      input.classList.remove('bad'); this.el.querySelector('#obErr').textContent = '';
    };
    chips.forEach(c => c.addEventListener('click', () => { input.value = c.dataset.v; sync(); }));
    input.addEventListener('input', sync);
    sync();
  },

  // ---------- navigation ----------
  fail(inputId, msg) {
    const input = this.el.querySelector(inputId);
    input.classList.add('bad');
    this.el.querySelector('#obErr').textContent = msg;
    input.focus();
  },

  go(d) {
    this.i = Math.min(this.steps.length - 1, Math.max(0, this.i + d));
    this.render();
  },

  async next() {
    const step = this.steps[this.i];
    if (step.id === 'name') {
      const v = Profile.clean(this.el.querySelector('#obName').value);
      if (!v) return this.fail('#obName', 'Please enter your name to continue.');
      if (v !== this.draft.name) this.draft.addressAs = '';
      this.draft.name = v;
    } else if (step.id === 'address') {
      const v = Profile.clean(this.el.querySelector('#obAddr').value);
      if (!v) return this.fail('#obAddr', 'Tell DAYMARK what to call you, or pick a suggestion.');
      this.draft.addressAs = v;
    } else if (step.id === 'done') {
      return this.finish();
    }
    this.go(1);
  },

  skipTour() {
    const step = this.steps[this.i];
    if (step && step.id.startsWith('tour-')) {
      this.i = this.steps.length - 1;
      this.render();
    } else {
      this.finish();
    }
  },

  async finish() {
    if (!this.tourOnly) {
      await Profile.save(DB, { name: this.draft.name, addressAs: this.draft.addressAs, onboarded: true });
      await Profile.removeSampleData(DB);
      await State.reloadFromDB();
    }
    Dashboard.renderGreeting();
    this.el.classList.add('leaving');
    setTimeout(() => { this.el.remove(); this.el = null; }, 500);
    this.resolve();
  }
};

window.Splash = Splash;
window.Onboarding = Onboarding;
