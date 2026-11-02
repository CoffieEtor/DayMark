/* DAYMARK — Task Management Module */

const Tasks = {
  activeTaskIdToEdit: null,

  /**
   * Initialize Task module
   */
  init() {
    this.bindFilterChips();
    this.bindSearchAndSort();
    this.renderTaskList();

    // Subscribe to state updates
    State.subscribe('TASKS_UPDATED', () => {
      this.updateFilterCounts();
      this.renderTaskList();
    });

    State.subscribe('TASK_FILTER_CHANGED', () => {
      this.renderTaskList();
    });

    State.subscribe('TASK_SORT_CHANGED', () => {
      this.renderTaskList();
    });

    State.subscribe('TASK_SEARCH_CHANGED', () => {
      this.renderTaskList();
    });
  },

  /**
   * Bind task filter chips (All, Today, Upcoming, Overdue, Completed)
   */
  bindFilterChips() {
    const chips = document.querySelectorAll('#taskFiltersBar .filter-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const filter = chip.getAttribute('data-filter');
        State.setTaskFilter(filter);
      });
    });
  },

  /**
   * Bind search input and sort dropdown
   */
  bindSearchAndSort() {
    const searchInput = document.getElementById('taskSearchInput');
    const searchClear = document.getElementById('taskSearchClear');
    const sortSelect = document.getElementById('taskSortSelect');

    if (searchInput) {
      searchInput.addEventListener('input', Utils.debounce((e) => {
        State.setTaskSearch(e.target.value);
        if (searchClear) {
          searchClear.classList.toggle('visible', !!e.target.value);
        }
      }, 150));
    }

    if (searchClear && searchInput) {
      searchClear.addEventListener('click', () => {
        searchInput.value = '';
        searchClear.classList.remove('visible');
        State.setTaskSearch('');
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        State.setTaskSort(e.target.value);
      });
    }
  },

  /**
   * Update count numbers in filter badges
   */
  updateFilterCounts() {
    const tasks = State.tasks || [];
    const todayStr = Utils.getTodayDateString();

    const counts = {
      all: tasks.filter(t => !t.completed).length,
      today: tasks.filter(t => !t.completed && t.dueDate === todayStr).length,
      upcoming: tasks.filter(t => !t.completed && t.dueDate && t.dueDate > todayStr).length,
      overdue: tasks.filter(t => !t.completed && t.dueDate && t.dueDate < todayStr).length,
      completed: tasks.filter(t => t.completed).length
    };

    const chips = document.querySelectorAll('#taskFiltersBar .filter-chip');
    chips.forEach(chip => {
      const filter = chip.getAttribute('data-filter');
      const badge = chip.querySelector('.filter-count');
      if (badge && counts[filter] !== undefined) {
        badge.textContent = counts[filter];
      }
    });
  },

  /**
   * Get filtered and sorted tasks based on current State
   */
  getVisibleTasks() {
    let list = [...(State.tasks || [])];
    const todayStr = Utils.getTodayDateString();

    // 1. Filter by category/status tab
    switch (State.data.taskFilter) {
      case 'today':
        list = list.filter(t => !t.completed && t.dueDate === todayStr);
        break;
      case 'upcoming':
        list = list.filter(t => !t.completed && t.dueDate && t.dueDate > todayStr);
        break;
      case 'overdue':
        list = list.filter(t => !t.completed && t.dueDate && t.dueDate < todayStr);
        break;
      case 'completed':
        list = list.filter(t => t.completed);
        break;
      case 'all':
      default:
        // Default 'all' shows open tasks
        list = list.filter(t => !t.completed);
        break;
    }

    // 2. Filter by search query
    const query = State.data.taskSearch;
    if (query) {
      list = list.filter(t => {
        const titleMatch = (t.title || '').toLowerCase().includes(query);
        const descMatch = (t.description || '').toLowerCase().includes(query);
        const catMatch = (t.category || '').toLowerCase().includes(query);
        return titleMatch || descMatch || catMatch;
      });
    }

    // 3. Sort
    const sort = State.data.taskSort || 'dueDate';
    const prioRank = { urgent: 4, high: 3, normal: 2, low: 1 };

    list.sort((a, b) => {
      if (sort === 'priority') {
        const pDiff = (prioRank[b.priority] || 2) - (prioRank[a.priority] || 2);
        if (pDiff !== 0) return pDiff;
        return (a.dueDate || '9999').localeCompare(b.dueDate || '9999');
      } else if (sort === 'created') {
        return (b.createdAt || 0) - (a.createdAt || 0);
      } else if (sort === 'alpha') {
        return (a.title || '').localeCompare(b.title || '');
      } else {
        // Default: due date earliest first (nulls at end), then by priority
        const aDate = a.dueDate ? (a.dueDate + (a.dueTime || '23:59')) : '9999';
        const bDate = b.dueDate ? (b.dueDate + (b.dueTime || '23:59')) : '9999';
        const dateComp = aDate.localeCompare(bDate);
        if (dateComp !== 0) return dateComp;
        return (prioRank[b.priority] || 2) - (prioRank[a.priority] || 2);
      }
    });

    return list;
  },

  /**
   * Render HTML for the Task view
   */
  renderTaskList() {
    const container = document.getElementById('taskListContainer');
    if (!container) return;

    const tasks = this.getVisibleTasks();

    if (tasks.length === 0) {
      let emptyMsg = 'No tasks found in this view.';
      let emptyTitle = 'All clear';
      if (State.data.taskSearch) {
        emptyTitle = 'No matching tasks';
        emptyMsg = `No tasks matched your search "${Utils.escapeHtml(State.data.taskSearch)}".`;
      } else if (State.data.taskFilter === 'completed') {
        emptyTitle = 'No completed tasks';
        emptyMsg = 'When you finish a task, it will be kept here for reference.';
      } else if (State.data.taskFilter === 'overdue') {
        emptyTitle = 'No overdue tasks';
        emptyMsg = 'Great job staying on top of your schedule!';
      }

      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          </div>
          <div class="empty-title">${emptyTitle}</div>
          <div class="empty-text">${emptyMsg}</div>
          <button class="btn btn-primary btn-sm" onclick="App.openTaskModal()">+ Add New Task</button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="items-list">
        ${tasks.map(t => this.renderTaskItemHtml(t)).join('')}
      </div>
    `;
  },

  /**
   * Render single task item HTML
   */
  renderTaskItemHtml(task) {
    const isCompleted = !!task.completed;
    const dateStatus = Utils.getDateStatus(task.dueDate, task.dueTime);
    let dateChipHtml = '';

    if (task.dueDate) {
      let statusClass = '';
      let dateIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
      let label = Utils.formatShortDate(task.dueDate);

      if (!isCompleted && dateStatus === 'overdue') {
        statusClass = 'overdue';
        label = `Overdue • ${label}`;
      } else if (dateStatus === 'today') {
        statusClass = 'today';
        label = 'Today';
      } else if (dateStatus === 'tomorrow') {
        label = 'Tomorrow';
      }

      if (task.dueTime) {
        label += ` at ${Utils.formatTime(task.dueTime)}`;
      }

      dateChipHtml = `<span class="meta-chip ${statusClass}">${dateIcon}${Utils.escapeHtml(label)}</span>`;
    }

    const priorityBadge = `<span class="badge badge-${task.priority || 'normal'}">${task.priority || 'normal'}</span>`;
    const categoryTag = task.category ? `<span class="category-tag">${Utils.escapeHtml(task.category)}</span>` : '';

    return `
      <div class="task-item ${isCompleted ? 'completed' : ''}" id="task-card-${task.id}">
        <button class="checkbox-btn ${isCompleted ? 'checked' : ''}" 
                onclick="Tasks.toggleComplete('${task.id}')" 
                aria-label="${isCompleted ? 'Mark task pending' : 'Mark task completed'}">
          <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
        </button>

        <div class="task-body" onclick="Tasks.editTask('${task.id}')" style="cursor: pointer;">
          <div class="task-title">${Utils.escapeHtml(task.title)}</div>
          ${task.description ? `<div class="task-desc">${Utils.escapeHtml(task.description)}</div>` : ''}
          <div class="item-meta-row">
            ${priorityBadge}
            ${dateChipHtml}
            ${categoryTag}
          </div>
        </div>

        <div class="item-actions">
          <button class="btn-icon" onclick="Tasks.editTask('${task.id}')" title="Edit task" aria-label="Edit task">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </button>
          <button class="btn-icon" onclick="Tasks.deleteTask('${task.id}')" title="Delete task" aria-label="Delete task">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    `;
  },

  /**
   * Toggle task completion with smooth micro-animation
   */
  async toggleComplete(id) {
    const task = State.tasks.find(t => t.id === id);
    if (!task) return;

    const newCompleted = !task.completed;
    task.completed = newCompleted;
    task.completedAt = newCompleted ? Date.now() : null;
    task.updatedAt = Date.now();

    // Optimistic UI update
    const cardEl = document.getElementById(`task-card-${id}`);
    if (cardEl) {
      cardEl.classList.toggle('completed', newCompleted);
      const chk = cardEl.querySelector('.checkbox-btn');
      if (chk) chk.classList.toggle('checked', newCompleted);
    }

    try {
      await DB.put(STORES.TASKS, task);
      await State.reloadFromDB();
      Utils.showToast(newCompleted ? 'Task completed' : 'Task reopened', 'success');
    } catch (err) {
      console.error('Failed to update task:', err);
      Utils.showToast('Failed to save task update', 'error');
      await State.reloadFromDB();
    }
  },

  /**
   * Open modal to edit existing task
   */
  editTask(id) {
    const task = State.tasks.find(t => t.id === id);
    if (!task) return;
    this.activeTaskIdToEdit = id;
    App.openTaskModal(task);
  },

  /**
   * Delete task with confirmation
   */
  async deleteTask(id) {
    const task = State.tasks.find(t => t.id === id);
    if (!task) return;

    const confirmed = await Utils.confirm({
      title: 'Delete Task',
      message: `Are you sure you want to delete "${task.title}"? This action cannot be undone.`,
      confirmText: 'Delete',
      isDanger: true
    });

    if (!confirmed) return;

    try {
      await DB.delete(STORES.TASKS, id);
      await State.reloadFromDB();
      Utils.showToast('Task deleted', 'info');
    } catch (err) {
      console.error('Failed to delete task:', err);
      Utils.showToast('Failed to delete task', 'error');
    }
  },

  /**
   * Save task from modal form (create or edit)
   */
  async saveTaskFromForm(formData) {
    const title = (formData.title || '').trim();
    if (!title) {
      Utils.showToast('Task title is required', 'error');
      return false;
    }

    try {
      if (this.activeTaskIdToEdit) {
        // Updating existing task
        const existing = State.tasks.find(t => t.id === this.activeTaskIdToEdit);
        if (!existing) return false;

        const updatedTask = {
          ...existing,
          title,
          description: (formData.description || '').trim(),
          priority: formData.priority || 'normal',
          dueDate: formData.dueDate || null,
          dueTime: formData.dueTime || null,
          category: (formData.category || '').trim() || 'General',
          updatedAt: Date.now()
        };

        await DB.put(STORES.TASKS, updatedTask);
        this.activeTaskIdToEdit = null;
        Utils.showToast('Task updated successfully', 'success');
      } else {
        // Creating new task
        const newTask = {
          id: Utils.generateId(),
          title,
          description: (formData.description || '').trim(),
          priority: formData.priority || 'normal',
          dueDate: formData.dueDate || null,
          dueTime: formData.dueTime || null,
          category: (formData.category || '').trim() || 'General',
          completed: false,
          completedAt: null,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        await DB.add(STORES.TASKS, newTask);
        Utils.showToast('New task created', 'success');
      }

      await State.reloadFromDB();
      return true;
    } catch (err) {
      console.error('Error saving task:', err);
      Utils.showToast('Failed to save task', 'error');
      return false;
    }
  }
};

window.Tasks = Tasks;
