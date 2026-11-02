/* DAYMARK — Enhanced Random Purchase Picker Module with Budget & Category Filters */

const Picker = {
  isPicking: false,
  lastPickedId: null,

  /**
   * Initialize Random Picker
   */
  init() {
    const pickBtn = document.getElementById('pickerActionBtn');
    if (pickBtn) {
      pickBtn.addEventListener('click', () => this.pick());
    }

    // Budget limit filter buttons/selector
    const budgetSelect = document.getElementById('pickerBudgetSelect');
    if (budgetSelect) {
      budgetSelect.addEventListener('change', (e) => {
        Utils.playSound('click');
        State.setPickerBudgetLimit(e.target.value);
      });
    }

    // Category filter selector
    const catSelect = document.getElementById('pickerCatSelect');
    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        Utils.playSound('click');
        State.setPickerCategory(e.target.value);
      });
    }

    // Update picker category options when wishlist changes
    State.subscribe('WISHLIST_UPDATED', () => {
      this.populatePickerCategories();
    });
    this.populatePickerCategories();
  },

  /**
   * Populate category options for picker
   */
  populatePickerCategories() {
    const catSelect = document.getElementById('pickerCatSelect');
    if (!catSelect) return;

    const currentVal = State.data.pickerCategory || 'all';
    const items = (State.wishlist || []).filter(w => !w.purchased);
    const categories = new Set();

    items.forEach(item => {
      if (item.category && item.category.trim()) {
        categories.add(item.category.trim());
      }
    });

    const sortedCats = Array.from(categories).sort();
    let optionsHtml = '<option value="all">Any Category</option>';
    sortedCats.forEach(cat => {
      optionsHtml += `<option value="${Utils.escapeHtml(cat)}" ${currentVal === cat ? 'selected' : ''}>${Utils.escapeHtml(cat)}</option>`;
    });

    catSelect.innerHTML = optionsHtml;
  },

  /**
   * Execute the selection workflow with budget & category constraints
   */
  async pick() {
    if (this.isPicking) return;

    const wishlist = State.wishlist || [];
    // Strictly exclude purchased items
    let eligibleItems = wishlist.filter(item => !item.purchased);

    // Apply budget filter if set
    const budgetLimit = Number(State.data.pickerBudgetLimit) || 0;
    if (budgetLimit > 0) {
      eligibleItems = eligibleItems.filter(item => (Number(item.estimatedPrice) || 0) <= budgetLimit);
    }

    // Apply category filter if set
    const catFilter = State.data.pickerCategory || 'all';
    if (catFilter !== 'all') {
      eligibleItems = eligibleItems.filter(item => (item.category || '').toLowerCase() === catFilter.toLowerCase());
    }

    const reelEl = document.getElementById('pickerReel');
    const resultCardEl = document.getElementById('pickerResultCard');
    const emptyStateEl = document.getElementById('pickerEmptyState');
    const emptyDescEl = document.getElementById('pickerEmptyDesc');
    const promptContainer = document.getElementById('pickerPrompt');
    const pickBtn = document.getElementById('pickerActionBtn');

    // Check if no eligible items match
    if (eligibleItems.length === 0) {
      if (reelEl) reelEl.classList.remove('active');
      if (resultCardEl) resultCardEl.classList.remove('active');
      if (promptContainer) promptContainer.style.display = 'none';
      if (emptyStateEl) {
        emptyStateEl.style.display = 'flex';
        if (emptyDescEl) {
          if (budgetLimit > 0 || catFilter !== 'all') {
            emptyDescEl.textContent = `No unpurchased items match your selected filter (${budgetLimit > 0 ? `Max ${Utils.formatCurrency(budgetLimit, State.currency)}` : ''} ${catFilter !== 'all' ? `in ${catFilter}` : ''}). Try expanding your criteria or add new items.`;
          } else {
            emptyDescEl.textContent = 'Add items to your wishlist first to let DAYMARK pick for you. All current items are already purchased.';
          }
        }
      }
      return;
    }

    if (emptyStateEl) emptyStateEl.style.display = 'none';
    if (resultCardEl) resultCardEl.classList.remove('active');

    this.isPicking = true;
    if (pickBtn) {
      pickBtn.disabled = true;
      pickBtn.innerHTML = `
        <svg class="spin-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
        Selecting...
      `;
    }

    // Shuffle reel animation with ticking sound
    if (reelEl) {
      reelEl.classList.add('active');
      const reelItemEl = reelEl.querySelector('.reel-item');

      let shuffleCount = 0;
      const totalShuffles = Math.min(10, Math.max(5, eligibleItems.length * 2));
      const intervalMs = 100;

      await new Promise(resolve => {
        const shuffleTimer = setInterval(() => {
          shuffleCount++;
          Utils.playSound('roulette');
          const randomPreview = eligibleItems[Math.floor(Math.random() * eligibleItems.length)];
          if (reelItemEl) {
            reelItemEl.textContent = `${randomPreview.name} • ${Utils.formatCurrency(randomPreview.estimatedPrice, randomPreview.currency || State.currency)}`;
          }

          if (shuffleCount >= totalShuffles) {
            clearInterval(shuffleTimer);
            resolve();
          }
        }, intervalMs);
      });

      reelEl.classList.remove('active');
    }

    // Select final item (avoid immediate repetition if multiple exist)
    let candidates = eligibleItems;
    if (eligibleItems.length > 1 && this.lastPickedId) {
      candidates = eligibleItems.filter(i => i.id !== this.lastPickedId);
    }
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    this.lastPickedId = chosen.id;

    // Victory celebration audio + confetti!
    Utils.playSound('celebrate');
    Utils.triggerConfetti();

    // Render result card
    this.renderResultCard(chosen);

    this.isPicking = false;
    if (pickBtn) {
      pickBtn.disabled = false;
      pickBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
        Pick Again
      `;
    }
  },

  /**
   * Render the chosen result card
   */
  renderResultCard(item) {
    const resultCardEl = document.getElementById('pickerResultCard');
    if (!resultCardEl) return;

    const currency = item.currency || State.currency;
    const priceFormatted = Utils.formatCurrency(item.estimatedPrice, currency);

    let linkHtml = '';
    if (item.productUrl) {
      linkHtml = `
        <a href="${Utils.escapeHtml(item.productUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Visit Store Link
        </a>
      `;
    }

    resultCardEl.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-sm);">
        <div>
          <span class="result-badge-label">✨ Top Pick Recommendation</span>
          <h3 class="result-item-name">${Utils.escapeHtml(item.name)}</h3>
          <div style="display: flex; gap: 6px; align-items: center; margin-top: 4px;">
            <span class="category-tag">${Utils.escapeHtml(item.category || 'General')}</span>
            ${item.priority === 'high' ? `<span class="badge" style="background: rgba(214,181,109,0.15); color: var(--accent);">High Priority</span>` : ''}
          </div>
        </div>
        <div class="result-price-highlight">${priceFormatted}</div>
      </div>

      ${item.description ? `<p class="result-desc" style="margin-top: var(--space-sm);">${Utils.escapeHtml(item.description)}</p>` : ''}
      ${item.notes ? `<p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: var(--space-sm);">Note: ${Utils.escapeHtml(item.notes)}</p>` : ''}

      <div class="result-actions-row">
        <button class="btn btn-primary btn-sm" onclick="Picker.markPurchasedFromPicker('${item.id}')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          Mark as Acquired
        </button>
        ${linkHtml}
        <button class="btn btn-ghost btn-sm" onclick="Picker.pick()">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          Roll Again
        </button>
      </div>
    `;

    resultCardEl.classList.add('active');
  },

  /**
   * Shortcut to mark purchased directly from picker card
   */
  async markPurchasedFromPicker(id) {
    await Wishlist.togglePurchased(id);
    const resultCardEl = document.getElementById('pickerResultCard');
    if (resultCardEl) {
      resultCardEl.classList.remove('active');
    }
    this.pick();
  }
};

window.Picker = Picker;
