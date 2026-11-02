/* DAYMARK — Navigation Controller */

const Navigation = {
  views: ['dashboard', 'tasks', 'reminders', 'wishlist', 'settings'],
  currentView: 'dashboard',

  /**
   * Initialize navigation system
   */
  init() {
    // Bind mobile bottom nav items
    const bottomNavItems = document.querySelectorAll('.bottom-nav .nav-item');
    bottomNavItems.forEach(item => {
      item.addEventListener('click', () => {
        const view = item.getAttribute('data-view');
        if (view) this.navigateTo(view);
      });
    });

    // Bind desktop sidebar items
    const sidebarItems = document.querySelectorAll('.desktop-sidebar .sidebar-item');
    sidebarItems.forEach(item => {
      item.addEventListener('click', () => {
        const view = item.getAttribute('data-view');
        if (view) this.navigateTo(view);
      });
    });

    // Handle browser back/forward buttons
    window.addEventListener('hashchange', () => {
      this.handleHashChange();
    });

    // Handle initial hash or default to dashboard
    this.handleHashChange();

    // Listen to state changes to update badges
    State.subscribe('TASKS_UPDATED', () => this.updateBadges());
    State.subscribe('REMINDERS_UPDATED', () => this.updateBadges());
    State.subscribe('WISHLIST_UPDATED', () => this.updateBadges());
  },

  /**
   * Parse current window.location.hash and switch view
   */
  handleHashChange() {
    const rawHash = window.location.hash.replace('#', '').toLowerCase();
    const target = this.views.includes(rawHash) ? rawHash : 'dashboard';
    this.navigateTo(target, false);
  },

  /**
   * Switch active view
   */
  navigateTo(viewName, updateHash = true) {
    if (!this.views.includes(viewName)) return;

    this.currentView = viewName;
    State.setCurrentView(viewName);

    // Hide all views and show active one
    document.querySelectorAll('.app-view').forEach(view => {
      view.classList.remove('active');
    });

    const activeViewEl = document.getElementById(`view-${viewName}`);
    if (activeViewEl) {
      activeViewEl.classList.add('active');
      window.scrollTo(0, 0);
    }

    // Update bottom nav active state
    document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
      if (item.getAttribute('data-view') === viewName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Update desktop sidebar active state
    document.querySelectorAll('.desktop-sidebar .sidebar-item').forEach(item => {
      if (item.getAttribute('data-view') === viewName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    if (updateHash && window.location.hash !== `#${viewName}`) {
      window.location.hash = viewName;
    }
  },

  /**
   * Update badge numbers for outstanding tasks and upcoming reminders
   */
  updateBadges() {
    const tasks = State.tasks || [];
    const reminders = State.reminders || [];
    const wishlist = State.wishlist || [];

    // Outstanding tasks count
    const pendingTasks = tasks.filter(t => !t.completed).length;
    // Overdue/today reminders
    const todayStr = Utils.getTodayDateString();
    const urgentReminders = reminders.filter(r => !r.completed && r.reminderDate <= todayStr).length;
    // Unpurchased wishlist items
    const unpurchasedWishlist = wishlist.filter(w => !w.purchased).length;

    // Task Badges
    const taskBadgeMobile = document.getElementById('badgeTaskMobile');
    const taskBadgeDesktop = document.getElementById('badgeTaskDesktop');
    if (taskBadgeMobile) {
      taskBadgeMobile.textContent = pendingTasks > 0 ? pendingTasks : '';
      taskBadgeMobile.style.display = pendingTasks > 0 ? 'inline-block' : 'none';
    }
    if (taskBadgeDesktop) {
      taskBadgeDesktop.textContent = pendingTasks;
      taskBadgeDesktop.style.display = pendingTasks > 0 ? 'inline-block' : 'none';
    }

    // Reminder Badges
    const remBadgeMobile = document.getElementById('badgeReminderMobile');
    const remBadgeDesktop = document.getElementById('badgeReminderDesktop');
    if (remBadgeMobile) {
      remBadgeMobile.textContent = urgentReminders > 0 ? urgentReminders : '';
      remBadgeMobile.style.display = urgentReminders > 0 ? 'inline-block' : 'none';
    }
    if (remBadgeDesktop) {
      remBadgeDesktop.textContent = urgentReminders;
      remBadgeDesktop.style.display = urgentReminders > 0 ? 'inline-block' : 'none';
    }

    // Wishlist Badges
    const wishBadgeDesktop = document.getElementById('badgeWishlistDesktop');
    if (wishBadgeDesktop) {
      wishBadgeDesktop.textContent = unpurchasedWishlist;
      wishBadgeDesktop.style.display = unpurchasedWishlist > 0 ? 'inline-block' : 'none';
    }
  }
};

window.Navigation = Navigation;
