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
  skipped: false,
  draft: { name: '', addressAs: '' },

  esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },

  buildSteps() {
    return [
      { id: 'welcome' },
      { id: 'overview' },
      { id: 'name' },
      { id: 'address' },
      { id: 'done' }
    ];
  },

  async start(opts = {}) {
    if (opts.tourOnly) return Tour.start();
    this.skipped = false;
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

    dashes.forEach((d, idx) => {
      d.classList.toggle('active', idx === this.i);
      d.classList.toggle('done', idx < this.i);
    });
    back.hidden = (this.i === 0);
    this.el.querySelector('.ob-nav').classList.toggle('single', this.i === 0);
    skip.hidden = (step.id === 'done');
    skip.textContent = 'Skip';
    next.textContent = 'Next';

    let html = '';
    if (step.id === 'welcome') {
      next.textContent = 'Get started';
      html = `
        <div class="ob-kicker">Welcome</div>
        <h1>Welcome to DAYMARK</h1>
        <p class="ob-welcome-box">DAYMARK is your personal command centre for the day: one calm place for what you need to do, what you must not forget, and what you want to buy.</p>
        <p style="margin-top:18px;font-size:.85rem;color:var(--accent);text-align:center;">Everything stays on this device. No account needed.</p>`;
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
    } else if (step.id === 'done') {
      next.textContent = 'Open DAYMARK';
      html = `
        <div class="ob-kicker">All set</div>
        <h1>You’re all set${who ? ', ' + who : ''}</h1>
        <p>Your lists start empty. Add your first task, reminder or wishlist item whenever you’re ready. DAYMARK remembers everything you enter and reopens where you left off.</p>`;
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
    this.skipped = true;
    this.finish();
  },

  async finish() {
    await Profile.save(DB, { name: this.draft.name, addressAs: this.draft.addressAs, onboarded: true });
    await Profile.removeSampleData(DB);
    await State.reloadFromDB();
    Dashboard.renderGreeting();
    this.el.classList.add('leaving');
    setTimeout(() => {
      if (this.el) { this.el.remove(); this.el = null; }
      if (!this.skipped && !localStorage.getItem('daymark.tourSeen')) {
        Tour.start();
      }
    }, 500);
    this.resolve();
  }
};

/* In-app Quick Tour (shown on 1st-time entry and replayable from Settings) */
const Tour = {
  el: null,
  i: 0,
  STEPS: [
    { view: 'tasks', kicker: 'Quick tour · 1 of 4', title: 'Tasks',
      body: 'Write down what you need to do, set a priority, due date, and checklist. Tap the circle when it’s done.' },
    { view: 'reminders', kicker: 'Quick tour · 2 of 4', title: 'Reminders',
      body: 'Pick a date and time and DAYMARK will alert you — even when the app is closed if notifications are enabled.' },
    { view: 'wishlist', kicker: 'Quick tour · 3 of 4', title: 'Wishlist & “Pick for me”',
      body: 'Save things you plan to buy with a price and link. Tap “Pick for me” to let DAYMARK choose within your budget.' },
    { view: 'settings', kicker: 'Quick tour · 4 of 4', title: 'Settings & Device Sync',
      body: 'Customize colours and currency, enable notifications, sync Phone & Desktop with a QR code, or replay this tour anytime.' }
  ],

  start() {
    if (this.el) this.el.remove();
    this.i = 0;

    const el = document.createElement('div');
    el.id = 'quickTour';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'DAYMARK Quick Tour');
    el.innerHTML = `
      <div class="qt-card">
        <div class="qt-top">
          <div class="ob-progress" aria-label="Tour progress">${this.STEPS.map(() => '<i></i>').join('')}</div>
          <button type="button" class="ob-skip" id="qtSkip">Skip tour</button>
        </div>
        <div class="ob-kicker" id="qtKicker"></div>
        <h3 class="qt-title" id="qtTitle"></h3>
        <p class="qt-body" id="qtBody"></p>
        <div class="qt-actions">
          <button type="button" class="ob-btn" id="qtPrev">Previous</button>
          <button type="button" class="ob-btn primary" id="qtNext">Next</button>
        </div>
      </div>`;
    document.body.appendChild(el);
    this.el = el;

    el.querySelector('#qtSkip').addEventListener('click', () => this.close());
    el.querySelector('#qtPrev').addEventListener('click', () => { if (this.i > 0) { this.i--; this.render(); } });
    el.querySelector('#qtNext').addEventListener('click', () => {
      if (this.i < this.STEPS.length - 1) { this.i++; this.render(); }
      else this.close();
    });

    this.render();
  },

  render() {
    const step = this.STEPS[this.i];
    if (window.Navigation) Navigation.navigateTo(step.view);

    this.el.querySelectorAll('.ob-progress > i').forEach((d, idx) => {
      d.classList.toggle('active', idx === this.i);
      d.classList.toggle('done', idx < this.i);
    });
    this.el.querySelector('#qtKicker').textContent = step.kicker;
    this.el.querySelector('#qtTitle').textContent = step.title;
    this.el.querySelector('#qtBody').textContent = step.body;

    const prev = this.el.querySelector('#qtPrev');
    const next = this.el.querySelector('#qtNext');
    prev.hidden = (this.i === 0);
    next.textContent = this.i === this.STEPS.length - 1 ? 'Done' : 'Next';
  },

  close() {
    try { localStorage.setItem('daymark.tourSeen', '1'); } catch (e) { /* ignore */ }
    if (this.el) { this.el.remove(); this.el = null; }
    if (window.Navigation) Navigation.navigateTo('dashboard');
  }
};

window.Splash = Splash;
window.Onboarding = Onboarding;
window.Tour = Tour;
