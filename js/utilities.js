/* DAYMARK — Enhanced Utilities, Sound Synthesizer, Confetti & Date Helpers */

const DAYMARK_DEFAULTS = {
  CURRENCY_SYMBOL: 'GH₵',
  CURRENCY_CODE: 'GHS',
  LOCALE: 'en-GH',
  THEME: 'dark',
  ACCENT: 'gold',
  SOUND_ENABLED: true
};

const Utils = {
  audioCtx: null,

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
    hours = hours ? hours : 12;
    return `${hours}:${minutes} ${ampm}`;
  },

  /**
   * Relative readable date text: "Today", "Tomorrow", "In 3 days", "Overdue by 2 days"
   */
  getRelativeDateLabel(dateStr, timeStr = null) {
    if (!dateStr) return '';
    const todayStr = this.getTodayDateString();
    const status = this.getDateStatus(dateStr, timeStr);

    if (status === 'today') {
      return timeStr ? `Today at ${this.formatTime(timeStr)}` : 'Today';
    }
    if (status === 'tomorrow') {
      return timeStr ? `Tomorrow at ${this.formatTime(timeStr)}` : 'Tomorrow';
    }

    const today = new Date(todayStr + 'T00:00:00');
    const target = new Date(dateStr + 'T00:00:00');
    const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      const daysOver = Math.abs(diffDays);
      return daysOver === 1 ? 'Overdue by 1 day' : `Overdue by ${daysOver} days`;
    }
    if (diffDays <= 7) {
      return `In ${diffDays} days`;
    }
    return this.formatShortDate(dateStr);
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
      const tomorrowStr = this.getTomorrowDateString();
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
   * Get Tomorrow's Date String in YYYY-MM-DD
   */
  getTomorrowDateString() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return this.formatDateToISO(d);
  },

  /**
   * Get Date in N Days in YYYY-MM-DD
   */
  getDateInDays(n) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return this.formatDateToISO(d);
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
   * Web Audio API Synthesizer for pleasant tactile sound feedback
   * (Zero external sound files needed)
   */
  playSound(type = 'click') {
    if (window.State && window.State.settings && window.State.settings.soundEnabled === false) {
      return;
    }

    try {
      if (!this.audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          this.audioCtx = new AudioContext();
        }
      }
      if (!this.audioCtx) return;

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      if (type === 'click') {
        // Subtle haptic tap
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.04);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.04);
      } else if (type === 'complete') {
        // Two-tone pleasant chord for task completion
        [523.25, 659.25, 783.99].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.05);
          gain.gain.setValueAtTime(0.07, now + idx * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.22);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.05);
          osc.stop(now + idx * 0.05 + 0.22);
        });
      } else if (type === 'roulette') {
        // Fast wooden ticker tick
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800 + Math.random() * 200, now);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.03);
      } else if (type === 'celebrate') {
        // Victorious fanfare arpeggio
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          const startTime = now + idx * 0.08;
          osc.frequency.setValueAtTime(freq, startTime);
          gain.gain.setValueAtTime(0.09, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(startTime);
          osc.stop(startTime + 0.35);
        });
      }
    } catch (e) {
      // Audio not supported or blocked, fail silently
    }
  },

  /**
   * Lightweight Canvas-based Confetti Particle Burst
   */
  triggerConfetti() {
    try {
      let canvas = document.getElementById('confettiCanvas');
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'confettiCanvas';
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100vw';
        canvas.style.height = '100vh';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '999';
        document.body.appendChild(canvas);
      }

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const colors = ['#D6B56D', '#F3E2B8', '#30D158', '#3B82F6', '#EF4444', '#FFFFFF'];
      const particles = [];
      const count = 45;

      for (let i = 0; i < count; i++) {
        particles.push({
          x: canvas.width * 0.5 + (Math.random() - 0.5) * 120,
          y: canvas.height * 0.45,
          vx: (Math.random() - 0.5) * 14,
          vy: -Math.random() * 12 - 4,
          size: Math.random() * 6 + 4,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 360,
          rotSpeed: (Math.random() - 0.5) * 12,
          alpha: 1
        });
      }

      let frame = 0;
      function animate() {
        frame++;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let alive = false;

        particles.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.35; // gravity
          p.rotation += p.rotSpeed;
          p.alpha -= 0.015;

          if (p.alpha > 0) {
            alive = true;
            ctx.save();
            ctx.globalAlpha = Math.max(0, p.alpha);
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.5);
            ctx.restore();
          }
        });

        if (alive && frame < 90) {
          requestAnimationFrame(animate);
        } else {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }

      requestAnimationFrame(animate);
    } catch (e) {
      // Confetti fallback
    }
  },

  /**
   * Show custom Toast notification
   */
  showToast(message, type = 'info', duration = 3000) {
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

      const onConfirm = () => {
        Utils.playSound('click');
        closeDialog(true);
      };
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
