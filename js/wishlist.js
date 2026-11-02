/* DAYMARK — Enhanced Wishlist Management Module with Multi-Sort & Priority */

const Wishlist = {
  activeWishlistIdToEdit: null,

  /**
   * Initialize Wishlist module
   */
  init() {
    this.bindFilterChips();
    this.bindSearchAndControls();
    this.renderMetrics();
    this.renderWishlist();

    // Subscribe to state updates
    State.subscribe('WISHLIST_UPDATED', () => {
      this.populateCategoryOptions();
      this.renderMetrics();
      this.renderWishlist();
    });

    State.subscribe('WISHLIST_FILTER_CHANGED', () => {
      this.renderWishlist();
    });

    State.subscribe('WISHLIST_CATEGORY_CHANGED', () => {
      this.renderWishlist();
    });

    State.subscribe('WISHLIST_SORT_CHANGED', () => {
      this.renderWishlist();
    });

    State.subscribe('WISHLIST_SEARCH_CHANGED', () => {
      this.renderWishlist();
    });

    State.subscribe('SETTINGS_UPDATED', () => {
      this.renderMetrics();
      this.renderWishlist();
    });
  },

  /**
   * Bind filter chips (All, Unpurchased, Purchased)
   */
  bindFilterChips() {
    const chips = document.querySelectorAll('#wishlistFiltersBar .filter-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        Utils.playSound('click');
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const filter = chip.getAttribute('data-filter');
        State.setWishlistFilter(filter);
      });
    });
  },

  /**
   * Bind search bar, sort dropdown, and category dropdown
   */
  bindSearchAndControls() {
    const searchInput = document.getElementById('wishlistSearchInput');
    const searchClear = document.getElementById('wishlistSearchClear');
    const catSelect = document.getElementById('wishlistCategorySelect');
    const sortSelect = document.getElementById('wishlistSortSelect');

    if (searchInput) {
      searchInput.addEventListener('input', Utils.debounce((e) => {
        State.setWishlistSearch(e.target.value);
        if (searchClear) {
          searchClear.classList.toggle('visible', !!e.target.value);
        }
      }, 150));
    }

    if (searchClear && searchInput) {
      searchClear.addEventListener('click', () => {
        Utils.playSound('click');
        searchInput.value = '';
        searchClear.classList.remove('visible');
        State.setWishlistSearch('');
      });
    }

    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        Utils.playSound('click');
        State.setWishlistCategory(e.target.value);
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        Utils.playSound('click');
        State.setWishlistSort(e.target.value);
      });
    }

    this.populateCategoryOptions();
  },

  /**
   * Dynamically populate categories found in existing items
   */
  populateCategoryOptions() {
    const catSelect = document.getElementById('wishlistCategorySelect');
    if (!catSelect) return;

    const currentVal = State.data.wishlistCategory || 'all';
    const items = State.wishlist || [];
    const categories = new Set(['Tech', 'Workspace', 'Home', 'Books', 'Personal', 'Clothing', 'Travel']);

    items.forEach(item => {
      if (item.category && item.category.trim()) {
        categories.add(item.category.trim());
      }
    });

    const sortedCats = Array.from(categories).sort();
    let optionsHtml = '<option value="all">All Categories</option>';
    sortedCats.forEach(cat => {
      optionsHtml += `<option value="${Utils.escapeHtml(cat)}" ${currentVal === cat ? 'selected' : ''}>${Utils.escapeHtml(cat)}</option>`;
    });

    catSelect.innerHTML = optionsHtml;
  },

  /**
   * Render Top KPI Dashboard for Wishlist
   */
  renderMetrics() {
    const items = State.wishlist || [];
    const totalItems = items.length;
    const purchased = items.filter(i => i.purchased);
    const unpurchased = items.filter(i => !i.purchased);

    const totalEstimatedCost = unpurchased.reduce((sum, i) => sum + (Number(i.estimatedPrice) || 0), 0);
    const purchasedCost = purchased.reduce((sum, i) => sum + (Number(i.estimatedPrice) || 0), 0);

    const countAllEl = document.getElementById('wishStatTotalItems');
    const countRemainingEl = document.getElementById('wishStatRemainingItems');
    const totalCostEl = document.getElementById('wishStatEstimatedCost');
    const purchasedCostEl = document.getElementById('wishStatPurchasedCost');

    if (countAllEl) countAllEl.textContent = totalItems;
    if (countRemainingEl) countRemainingEl.textContent = unpurchased.length;
    if (totalCostEl) totalCostEl.textContent = Utils.formatCurrency(totalEstimatedCost, State.currency);
    if (purchasedCostEl) purchasedCostEl.textContent = Utils.formatCurrency(purchasedCost, State.currency);
  },

  /**
   * Get filtered and sorted items
   */
  getVisibleItems() {
    let list = [...(State.wishlist || [])];

    // Status filter
    if (State.data.wishlistFilter === 'purchased') {
      list = list.filter(i => i.purchased);
    } else if (State.data.wishlistFilter === 'unpurchased') {
      list = list.filter(i => !i.purchased);
    }

    // Category filter
    if (State.data.wishlistCategory && State.data.wishlistCategory !== 'all') {
      list = list.filter(i => (i.category || '').toLowerCase() === State.data.wishlistCategory.toLowerCase());
    }

    // Search query
    const query = State.data.wishlistSearch;
    if (query) {
      list = list.filter(i => {
        const nameMatch = (i.name || '').toLowerCase().includes(query);
        const descMatch = (i.description || '').toLowerCase().includes(query);
        const notesMatch = (i.notes || '').toLowerCase().includes(query);
        return nameMatch || descMatch || notesMatch;
      });
    }

    // Sort order
    const sort = State.data.wishlistSort || 'newest';
    const prioRank = { high: 3, medium: 2, low: 1 };

    list.sort((a, b) => {
      if (a.purchased !== b.purchased) {
        return a.purchased ? 1 : -1;
      }

      if (sort === 'price-asc') {
        return (Number(a.estimatedPrice) || 0) - (Number(b.estimatedPrice) || 0);
      } else if (sort === 'price-desc') {
        return (Number(b.estimatedPrice) || 0) - (Number(a.estimatedPrice) || 0);
      } else if (sort === 'priority') {
        const pDiff = (prioRank[b.priority] || 2) - (prioRank[a.priority] || 2);
        if (pDiff !== 0) return pDiff;
        return (Number(b.estimatedPrice) || 0) - (Number(a.estimatedPrice) || 0);
      } else if (sort === 'alpha') {
        return (a.name || '').localeCompare(b.name || '');
      } else {
        // 'newest' default
        return (b.createdAt || 0) - (a.createdAt || 0);
      }
    });

    return list;
  },

  /**
   * Render Wishlist grid HTML
   */
  renderWishlist() {
    const container = document.getElementById('wishlistGridContainer');
    if (!container) return;

    const items = this.getVisibleItems();

    if (items.length === 0) {
      let emptyTitle = 'Wishlist is empty';
      let emptyMsg = 'Add items you plan to buy or want to save for future decisions.';
      if (State.data.wishlistSearch) {
        emptyTitle = 'No matching items';
        emptyMsg = `No wishlist items matched "${Utils.escapeHtml(State.data.wishlistSearch)}".`;
      } else if (State.data.wishlistFilter === 'purchased') {
        emptyTitle = 'No purchased items yet';
        emptyMsg = 'When you buy an item, mark it as acquired to track your spending.';
      }

      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          </div>
          <div class="empty-title">${emptyTitle}</div>
          <div class="empty-text">${emptyMsg}</div>
          <button class="btn btn-primary btn-sm" onclick="App.openWishlistModal()">+ Add Wishlist Item</button>
        </div>
      `;
      return;
    }

    container.innerHTML = items.map(item => this.renderWishlistItemHtml(item)).join('');
  },

  /**
   * Single Wishlist item card HTML with priority indicator
   */
  renderWishlistItemHtml(item) {
    const isPurchased = !!item.purchased;
    const currency = item.currency || State.currency;
    const priceFormatted = Utils.formatCurrency(item.estimatedPrice, currency);
    const priority = item.priority || 'medium';

    let priorityBadge = '';
    if (priority === 'high') {
      priorityBadge = `<span class="badge" style="background: rgba(214,181,109,0.15); color: var(--accent);">★ High Priority</span>`;
    } else if (priority === 'low') {
      priorityBadge = `<span class="badge" style="background: rgba(102,107,118,0.14); color: var(--text-muted);">Low</span>`;
    }

    let urlButton = '';
    if (item.productUrl) {
      urlButton = `
        <a href="${Utils.escapeHtml(item.productUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-sm" title="Open product link">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Link
        </a>
      `;
    }

    return `
      <div class="wishlist-card ${isPurchased ? 'purchased' : ''}" id="wishlist-card-${item.id}">
        <div class="wishlist-card-top">
          <div style="flex: 1; min-width: 0;">
            <div class="wishlist-name">${Utils.escapeHtml(item.name)}</div>
            <div style="display: flex; gap: 6px; align-items: center; margin-top: 4px; flex-wrap: wrap;">
              <span class="category-tag">${Utils.escapeHtml(item.category || 'General')}</span>
              ${priorityBadge}
              ${isPurchased ? `<span class="badge" style="background: var(--success-bg); color: var(--success);">Purchased</span>` : ''}
            </div>
          </div>
          <div class="wishlist-price-badge">${priceFormatted}</div>
        </div>

        ${item.description ? `<div class="wishlist-desc">${Utils.escapeHtml(item.description)}</div>` : ''}
        ${item.notes ? `<div style="font-size: 0.78rem; color: var(--text-muted); font-style: italic; margin-top: 2px;">Note: ${Utils.escapeHtml(item.notes)}</div>` : ''}

        <div class="wishlist-footer">
          <div style="display: flex; gap: var(--space-xs); align-items: center;">
            <button class="btn ${isPurchased ? 'btn-ghost' : 'btn-secondary'} btn-sm" onclick="Wishlist.togglePurchased('${item.id}')">
              ${isPurchased ? 'Restore' : 'Mark Purchased'}
            </button>
            ${urlButton}
          </div>

          <div class="item-actions">
            <button class="btn-icon" onclick="Wishlist.editItem('${item.id}')" title="Edit item" aria-label="Edit item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            </button>
            <button class="btn-icon" onclick="Wishlist.deleteItem('${item.id}')" title="Delete item" aria-label="Delete item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Toggle purchased
   */
  async togglePurchased(id) {
    const item = State.wishlist.find(w => w.id === id);
    if (!item) return;

    const newPurchased = !item.purchased;
    item.purchased = newPurchased;
    item.purchasedAt = newPurchased ? Date.now() : null;
    item.updatedAt = Date.now();

    if (newPurchased) {
      Utils.playSound('complete');
      Utils.triggerConfetti();
    } else {
      Utils.playSound('click');
    }

    try {
      await DB.put(STORES.WISHLIST, item);
      await State.reloadFromDB();
      Utils.showToast(newPurchased ? `Acquired "${item.name}"! 🎉` : `Restored "${item.name}" to wishlist`, 'success');
    } catch (err) {
      console.error('Failed to update wishlist item:', err);
      Utils.showToast('Failed to update wishlist item', 'error');
    }
  },

  /**
   * Edit item
   */
  editItem(id) {
    const item = State.wishlist.find(w => w.id === id);
    if (!item) return;
    this.activeWishlistIdToEdit = id;
    App.openWishlistModal(item);
  },

  /**
   * Delete item
   */
  async deleteItem(id) {
    const item = State.wishlist.find(w => w.id === id);
    if (!item) return;

    const confirmed = await Utils.confirm({
      title: 'Delete Wishlist Item',
      message: `Are you sure you want to delete "${item.name}"?`,
      confirmText: 'Delete',
      isDanger: true
    });

    if (!confirmed) return;

    try {
      await DB.delete(STORES.WISHLIST, id);
      await State.reloadFromDB();
      Utils.showToast('Item deleted from wishlist', 'info');
    } catch (err) {
      console.error('Failed to delete wishlist item:', err);
      Utils.showToast('Failed to delete item', 'error');
    }
  },

  /**
   * Save item from modal form
   */
  async saveItemFromForm(formData) {
    const name = (formData.name || '').trim();
    if (!name) {
      Utils.showToast('Item name is required', 'error');
      return false;
    }

    const estimatedPrice = parseFloat(formData.estimatedPrice) || 0;

    try {
      if (this.activeWishlistIdToEdit) {
        const existing = State.wishlist.find(w => w.id === this.activeWishlistIdToEdit);
        if (!existing) return false;

        const updated = {
          ...existing,
          name,
          description: (formData.description || '').trim(),
          estimatedPrice,
          currency: formData.currency || State.currency,
          category: (formData.category || '').trim() || 'General',
          priority: formData.priority || 'medium',
          productUrl: (formData.productUrl || '').trim(),
          notes: (formData.notes || '').trim(),
          updatedAt: Date.now()
        };

        await DB.put(STORES.WISHLIST, updated);
        this.activeWishlistIdToEdit = null;
        Utils.playSound('click');
        Utils.showToast('Wishlist item updated', 'success');
      } else {
        const newItem = {
          id: Utils.generateId(),
          name,
          description: (formData.description || '').trim(),
          estimatedPrice,
          currency: formData.currency || State.currency,
          category: (formData.category || '').trim() || 'General',
          priority: formData.priority || 'medium',
          productUrl: (formData.productUrl || '').trim(),
          notes: (formData.notes || '').trim(),
          purchased: false,
          purchasedAt: null,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        await DB.add(STORES.WISHLIST, newItem);
        Utils.playSound('click');
        Utils.showToast('Item added to wishlist', 'success');
      }

      await State.reloadFromDB();
      return true;
    } catch (err) {
      console.error('Failed to save wishlist item:', err);
      Utils.showToast('Failed to save wishlist item', 'error');
      return false;
    }
  }
};

window.Wishlist = Wishlist;
