/* DAYMARK — Utilities & Helpers */

const DAYMARK_DEFAULTS = {
  CURRENCY_SYMBOL: 'GH₵',
  CURRENCY_CODE: 'GHS',
  LOCALE: 'en-GH',
  THEME: 'dark'
};

const Utils = {
  /**
   * Escape HTML to prevent XSS injection
   */
  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  /**
   * Generate UUID v4
   */
  generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'dm-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9);
  },

  /**
   * Format currency values with Ghana Cedi default
   */
  formatCurrency(amount, currency = 'GH₵') {
    const num = Number(amount) || 0;
    const formattedNum = num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return `${currency} ${formattedNum}`;
  },

  /**
   * Format Date to readable string (e.g., "Monday, November 2, 2026")
   */
  formatFullDate(date = new Date()) {
    const d = (date instanceof Date) ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-GB', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  },

  /**
   * Format Short Date (e.g., "Nov 2" or "Nov 2, 2026")
   */
  formatShortDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;
    const today = new Date();
    const isCurrentYear = d.getFullYear() === today.getFullYear();
    return d.toLocaleDateString('en-GB', {
      month: 'short',
      day: 'numeric',
      year: isCurrentYear ? undefined : 'numeric'
    });
  },

  /**
   * Format Time (HH:MM to 12-hour "2:30 PM")
   */
  formatTime(timeStr) {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 becomes 12
    return `${hours}:${minutes} ${ampm}`;
  },

  /**
   * Returns 'today', 'tomorrow', 'yesterday', 'overdue', or relative date string
   */
  getDateStatus(dateStr, timeStr = null) {
    if (!dateStr) return null;
    const todayStr = this.getTodayDateString();

    if (dateStr < todayStr) {
      return 'overdue';
    } else if (dateStr === todayStr) {
      if (timeStr) {
        const now = new Date();
        const nowTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        if (timeStr < nowTimeStr) return 'overdue';
      }
      return 'today';
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = this.formatDateToISO(tomorrow);
      if (dateStr === tomorrowStr) return 'tomorrow';
      return 'upcoming';
    }
  },

  /**
   * Get Today's Date String in YYYY-MM-DD
   */
  getTodayDateString() {
    return this.formatDateToISO(new Date());
  },

  /**
   * Format Date to YYYY-MM-DD
   */
  formatDateToISO(date) {
    const d = (date instanceof Date) ? date : new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * Time of day greeting
   */
  getTimeOfDayGreeting() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    if (hour >= 17 && hour < 22) return 'Good evening';
    return 'Good night';
  },

  /**
   * Debounce helper
   */
  debounce(func, wait = 250) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  },

  /**
   * Show custom Toast notification
   */
  showToast(message, type = 'info', duration = 3200) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
    } else {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    }

    toast.innerHTML = `
      ${iconSvg}
      <span>${this.escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px) scale(0.95)';
      toast.style.transition = 'all 0.2s ease-out';
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 200);
    }, duration);
  },

  /**
   * Confirmation Dialog Modal
   */
  confirm({ title = 'Confirm Action', message, confirmText = 'Confirm', cancelText = 'Cancel', isDanger = false }) {
    return new Promise((resolve) => {
      const modal = document.getElementById('confirmModal');
      const titleEl = document.getElementById('confirmModalTitle');
      const descEl = document.getElementById('confirmModalDesc');
      const confirmBtn = document.getElementById('confirmModalActionBtn');
      const cancelBtn = document.getElementById('confirmModalCancelBtn');

      if (!modal) {
        resolve(window.confirm(message));
        return;
      }

      titleEl.textContent = title;
      descEl.textContent = message;
      confirmBtn.textContent = confirmText;
      cancelBtn.textContent = cancelText;

      if (isDanger) {
        confirmBtn.className = 'btn btn-danger';
      } else {
        confirmBtn.className = 'btn btn-primary';
      }

      const closeDialog = (result) => {
        modal.classList.remove('active');
        confirmBtn.removeEventListener('click', onConfirm);
        cancelBtn.removeEventListener('click', onCancel);
        modal.removeEventListener('click', onBackdrop);
        resolve(result);
      };

      const onConfirm = () => closeDialog(true);
      const onCancel = () => closeDialog(false);
      const onBackdrop = (e) => {
        if (e.target === modal) closeDialog(false);
      };

      confirmBtn.addEventListener('click', onConfirm);
      cancelBtn.addEventListener('click', onCancel);
      modal.addEventListener('click', onBackdrop);

      modal.classList.add('active');
    });
  }
};

window.Utils = Utils;
