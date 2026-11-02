/* DAYMARK — Random Purchase Picker Module ("Pick for me") */

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
  },

  /**
   * Execute the selection workflow
   */
  async pick() {
    if (this.isPicking) return;

    const wishlist = State.wishlist || [];
    // Strictly exclude purchased items
    const eligibleItems = wishlist.filter(item => !item.purchased);

    const reelEl = document.getElementById('pickerReel');
    const resultCardEl = document.getElementById('pickerResultCard');
    const emptyStateEl = document.getElementById('pickerEmptyState');
    const promptContainer = document.getElementById('pickerPrompt');
    const pickBtn = document.getElementById('pickerActionBtn');

    // 1. Check for empty state
    if (eligibleItems.length === 0) {
      if (reelEl) reelEl.classList.remove('active');
      if (resultCardEl) resultCardEl.classList.remove('active');
      if (promptContainer) promptContainer.style.display = 'none';
      if (emptyStateEl) emptyStateEl.style.display = 'flex';
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

    // 2. Shuffle reel animation
    if (reelEl) {
      reelEl.classList.add('active');
      const reelItemEl = reelEl.querySelector('.reel-item');

      let shuffleCount = 0;
      const totalShuffles = Math.min(10, Math.max(5, eligibleItems.length * 2));
      const intervalMs = 110;

      await new Promise(resolve => {
        const shuffleTimer = setInterval(() => {
          shuffleCount++;
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

    // 3. Select final item (avoid immediately repeating last pick if multiple exist)
    let candidates = eligibleItems;
    if (eligibleItems.length > 1 && this.lastPickedId) {
      candidates = eligibleItems.filter(i => i.id !== this.lastPickedId);
    }
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    this.lastPickedId = chosen.id;

    // 4. Render and reveal Result Card
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
          Visit Product
        </a>
      `;
    }

    resultCardEl.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <span class="result-badge-label">Selected Recommendation</span>
          <h3 class="result-item-name">${Utils.escapeHtml(item.name)}</h3>
          <span class="category-tag">${Utils.escapeHtml(item.category || 'General')}</span>
        </div>
        <div class="result-price-highlight">${priceFormatted}</div>
      </div>

      ${item.description ? `<p class="result-desc" style="margin-top: var(--space-sm);">${Utils.escapeHtml(item.description)}</p>` : ''}
      ${item.notes ? `<p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: var(--space-sm);">Note: ${Utils.escapeHtml(item.notes)}</p>` : ''}

      <div class="result-actions-row">
        <button class="btn btn-primary btn-sm" onclick="Picker.markPurchasedFromPicker('${item.id}')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          Mark as Purchased
        </button>
        ${linkHtml}
        <button class="btn btn-ghost btn-sm" onclick="Picker.pick()">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          Spin Again
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
    // Re-run pick or show updated empty state
    this.pick();
  }
};

window.Picker = Picker;
