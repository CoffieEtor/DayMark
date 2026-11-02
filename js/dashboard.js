/* DAYMARK — Enhanced Dashboard Controller with Daily Progress */

const Dashboard = {
  /**
   * Initialize Dashboard
   */
  init() {
    this.renderGreeting();
    this.renderProgressBar();
    this.renderStats();
    this.renderTodayTasks();
    this.renderUpcomingReminders();
    this.renderHighPriorityTasks();
    this.renderWishlistSummary();

    // Subscribe to state updates
    State.subscribe('TASKS_UPDATED', () => {
      this.renderProgressBar();
      this.renderStats();
      this.renderTodayTasks();
      this.renderHighPriorityTasks();
    });

    State.subscribe('REMINDERS_UPDATED', () => {
      this.renderStats();
      this.renderUpcomingReminders();
    });

    State.subscribe('WISHLIST_UPDATED', () => {
      this.renderStats();
      this.renderWishlistSummary();
    });

    State.subscribe('SETTINGS_UPDATED', () => {
      this.renderStats();
      this.renderWishlistSummary();
    });

    setInterval(() => {
      this.renderGreeting();
    }, 60000);
  },

  /**
   * Render Time-of-day greeting and current date
   */
  renderGreeting() {
    const greetingEl = document.getElementById('dashGreeting');
    const dateEl = document.getElementById('dashDate');

    if (greetingEl) {
      greetingEl.textContent = Utils.getTimeOfDayGreeting();
    }
    if (dateEl) {
      dateEl.textContent = Utils.formatFullDate(new Date());
    }
  },

  /**
   * Render daily progress bar
   */
  renderProgressBar() {
    const barFill = document.getElementById('dashProgressFill');
    const textEl = document.getElementById('dashProgressText');
    const badgeEl = document.getElementById('dashProgressBadge');
    if (!barFill || !textEl) return;

    const tasks = State.tasks || [];
    const todayStr = Utils.getTodayDateString();
    const todayTasks = tasks.filter(t => t.dueDate === todayStr);

    if (todayTasks.length === 0) {
      barFill.style.width = '100%';
      textEl.textContent = 'No tasks due today — all clear!';
      if (badgeEl) badgeEl.textContent = '100%';
      return;
    }

    const completed = todayTasks.filter(t => t.completed).length;
    const total = todayTasks.length;
    const pct = Math.round((completed / total) * 100);

    barFill.style.width = `${pct}%`;
    textEl.textContent = `${completed} of ${total} tasks finished (${total - completed} remaining)`;
    if (badgeEl) badgeEl.textContent = `${pct}%`;
  },

  /**
   * Compute real stats from current State
   */
  renderStats() {
    const tasks = State.tasks || [];
    const reminders = State.reminders || [];
    const wishlist = State.wishlist || [];
    const todayStr = Utils.getTodayDateString();

    const todayTasks = tasks.filter(t => t.dueDate === todayStr);
    const todayCompleted = todayTasks.filter(t => t.completed).length;
    const pendingTasks = tasks.filter(t => !t.completed).length;
    const completedTasks = tasks.filter(t => t.completed).length;
    const overdueTasks = tasks.filter(t => !t.completed && t.dueDate && t.dueDate < todayStr).length;

    const upcomingReminders = reminders.filter(r => !r.completed && r.reminderDate >= todayStr).length;
    const overdueReminders = reminders.filter(r => !r.completed && r.reminderDate < todayStr).length;

    const unpurchasedWishlist = wishlist.filter(w => !w.purchased);
    const totalWishlistCost = unpurchasedWishlist.reduce((sum, item) => sum + (Number(item.estimatedPrice) || 0), 0);

    const statTodayTasksEl = document.getElementById('dashStatTodayTasks');
    const statPendingTasksEl = document.getElementById('dashStatPendingTasks');
    const statRemindersEl = document.getElementById('dashStatReminders');
    const statWishlistEl = document.getElementById('dashStatWishlist');

    if (statTodayTasksEl) {
      statTodayTasksEl.innerHTML = `
        <span class="stat-value">${todayTasks.length}</span>
        <span class="stat-sub">${todayCompleted} done • ${todayTasks.length - todayCompleted} left</span>
      `;
    }

    if (statPendingTasksEl) {
      statPendingTasksEl.innerHTML = `
        <span class="stat-value">${pendingTasks}</span>
        <span class="stat-sub">${overdueTasks > 0 ? `<span style="color:var(--danger)">${overdueTasks} overdue</span>` : `${completedTasks} completed`}</span>
      `;
    }

    if (statRemindersEl) {
      statRemindersEl.innerHTML = `
        <span class="stat-value">${upcomingReminders}</span>
        <span class="stat-sub">${overdueReminders > 0 ? `<span style="color:var(--danger)">${overdueReminders} overdue</span>` : 'Scheduled ahead'}</span>
      `;
    }

    if (statWishlistEl) {
      statWishlistEl.innerHTML = `
        <span class="stat-value">${Utils.formatCurrency(totalWishlistCost, State.currency)}</span>
        <span class="stat-sub">${unpurchasedWishlist.length} items to acquire</span>
      `;
    }
  },

  /**
   * Render today's tasks and overdue tasks preview
   */
  renderTodayTasks() {
    const container = document.getElementById('dashTodayTasksList');
    if (!container) return;

    const tasks = State.tasks || [];
    const todayStr = Utils.getTodayDateString();

    const relevantTasks = tasks
      .filter(t => !t.completed && (t.dueDate === todayStr || (t.dueDate && t.dueDate < todayStr)))
      .sort((a, b) => {
        const aOverdue = a.dueDate < todayStr ? 1 : 0;
        const bOverdue = b.dueDate < todayStr ? 1 : 0;
        if (bOverdue !== aOverdue) return bOverdue - aOverdue;
        const prioRank = { urgent: 4, high: 3, normal: 2, low: 1 };
        return (prioRank[b.priority] || 2) - (prioRank[a.priority] || 2);
      })
      .slice(0, 5);

    if (relevantTasks.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: var(--space-xl) var(--space-md); margin: 0;">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div class="empty-title">All caught up for today</div>
          <div class="empty-text">No pending tasks scheduled for today. Enjoy your focus time or create a new task.</div>
          <button class="btn btn-secondary btn-sm" onclick="App.openTaskModal()">+ Add Task</button>
        </div>
      `;
      return;
    }

    container.innerHTML = relevantTasks.map(task => Tasks.renderTaskItemHtml(task)).join('');
  },

  /**
   * Render upcoming reminders preview
   */
  renderUpcomingReminders() {
    const container = document.getElementById('dashRemindersList');
    if (!container) return;

    const reminders = State.reminders || [];
    const todayStr = Utils.getTodayDateString();

    const upcoming = reminders
      .filter(r => !r.completed && r.reminderDate >= todayStr)
      .sort((a, b) => (a.reminderDate + (a.reminderTime || '00:00')).localeCompare(b.reminderDate + (b.reminderTime || '00:00')))
      .slice(0, 4);

    if (upcoming.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: var(--space-xl) var(--space-md); margin: 0;">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div class="empty-title">No reminders scheduled</div>
          <div class="empty-text">Set gentle prompts for important deadlines, daily routines, or meetings.</div>
          <button class="btn btn-secondary btn-sm" onclick="App.openReminderModal()">+ Add Reminder</button>
        </div>
      `;
      return;
    }

    container.innerHTML = upcoming.map(reminder => Reminders.renderReminderItemHtml(reminder)).join('');
  },

  /**
   * Render high-priority tasks preview
   */
  renderHighPriorityTasks() {
    const container = document.getElementById('dashHighPriorityList');
    if (!container) return;

    const tasks = State.tasks || [];
    const highPrio = tasks
      .filter(t => !t.completed && (t.priority === 'urgent' || t.priority === 'high'))
      .sort((a, b) => {
        const prioRank = { urgent: 4, high: 3 };
        return (prioRank[b.priority] || 3) - (prioRank[a.priority] || 3);
      })
      .slice(0, 4);

    if (highPrio.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: var(--space-xl) var(--space-md); margin: 0;">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </div>
          <div class="empty-title">No high priority blockers</div>
          <div class="empty-text">You have no urgent or high priority items requiring immediate attention.</div>
        </div>
      `;
      return;
    }

    container.innerHTML = highPrio.map(task => Tasks.renderTaskItemHtml(task)).join('');
  },

  /**
   * Render wishlist preview card on dashboard
   */
  renderWishlistSummary() {
    const container = document.getElementById('dashWishlistSummary');
    if (!container) return;

    const wishlist = State.wishlist || [];
    const unpurchased = wishlist.filter(w => !w.purchased);

    if (unpurchased.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: var(--space-xl) var(--space-md); margin: 0;">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          </div>
          <div class="empty-title">Wishlist is empty</div>
          <div class="empty-text">Add items you are planning to purchase or explore the random purchase selector.</div>
          <button class="btn btn-secondary btn-sm" onclick="App.openWishlistModal()">+ Add Wishlist Item</button>
        </div>
      `;
      return;
    }

    const sampleItems = unpurchased.slice(0, 2);
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: var(--space-sm);">
        ${sampleItems.map(item => `
          <div class="card" style="display: flex; justify-content: space-between; align-items: center; padding: 12px var(--space-md);">
            <div>
              <div style="font-weight: 600; color: var(--text-primary); font-size: 0.95rem;">${Utils.escapeHtml(item.name)}</div>
              <div style="font-size: 0.78rem; color: var(--text-muted);">${Utils.escapeHtml(item.category || 'General')}</div>
            </div>
            <div style="font-weight: 700; color: var(--accent); font-size: 0.95rem;">
              ${Utils.formatCurrency(item.estimatedPrice, item.currency || State.currency)}
            </div>
          </div>
        `).join('')}
        <div style="display: flex; gap: var(--space-xs); margin-top: 4px;">
          <button class="btn btn-primary btn-sm" style="flex: 1;" onclick="Navigation.navigateTo('wishlist'); Picker.pick();">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
            Pick for me (${unpurchased.length})
          </button>
          <button class="btn btn-secondary btn-sm" onclick="Navigation.navigateTo('wishlist')">
            View All
          </button>
        </div>
      </div>
    `;
  }
};

window.Dashboard = Dashboard;
