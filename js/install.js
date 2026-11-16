/* DAYMARK — install & device setup (Android / iPhone / desktop).
   Loaded in <head> so the browser's install prompt event is captured before the UI exists. */
const Install = (() => {
  let deferred = null;

  const ua = navigator.userAgent || '';
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const platform = isAndroid ? 'android' : isIOS ? 'ios' : 'desktop';
  const isStandalone = () =>
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  const GUIDE = {
    android:
      '<strong>Android (Chrome / Edge / Samsung Internet):</strong> tap the ⋮ menu → <em>Install app</em> (or <em>Add to Home screen</em>), ' +
      'or use the Install button above. Open DAYMARK from your home screen, then press <em>Request Permission</em> below. ' +
      'For reliable reminders: Android Settings → Apps → DAYMARK → Notifications <em>On</em>, and Battery → <em>Unrestricted</em> ' +
      '(some phones, e.g. Tecno, Infinix, Xiaomi, Samsung, also need “Auto-start” / “Never sleeping apps” enabled). Don’t swipe-kill with “Force stop”.',
    ios:
      '<strong>iPhone / iPad:</strong> in Safari tap Share → <em>Add to Home Screen</em>. On iOS 16.4+ notification permission can only be ' +
      'granted from the installed Home Screen app, not from a Safari tab.',
    desktop:
      '<strong>Desktop (Chrome / Edge):</strong> click the install icon at the right of the address bar, or ⋮ menu → <em>Install DAYMARK</em>.',
  };
  const PUSH_NOTE = {
    android: '<strong style="color: var(--text-secondary);">Android note:</strong> notifications work in Chrome and in the installed app. Make sure the app’s notifications are allowed and battery use is not restricted so reminders arrive on time.',
    ios: '<strong style="color: var(--text-secondary);">iPhone PWA Note:</strong> On iOS 16.4+, Web Push requires adding DAYMARK to your Home Screen via Safari (Share → Add to Home Screen) before notification permissions can be granted.',
    desktop: '<strong style="color: var(--text-secondary);">Desktop note:</strong> allow notifications for this site when prompted; reminders arrive while the browser is running.',
  };

  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; render(); });
  window.addEventListener('appinstalled', () => { deferred = null; render(); if (window.Utils) Utils.showToast('DAYMARK installed', 'success'); });

  function render() {
    const $ = (id) => document.getElementById(id);
    const installed = isStandalone();
    const pill = $('installStatus'), btn = $('installBtn'), guide = $('installGuide'), note = $('pushPlatformNote');
    if (pill) pill.textContent = installed ? 'Installed' : 'In browser';
    if (btn) btn.style.display = !installed && deferred ? '' : 'none';
    if (guide) {
      guide.innerHTML = '<p style="margin:0">' + (installed
        ? 'DAYMARK is running as an installed app.' + (isAndroid ? ' For reliable reminders: Android Settings → Apps → DAYMARK → Notifications <em>On</em> and Battery → <em>Unrestricted</em>.' : '')
        : GUIDE[platform]) + '</p>';
    }
    if (note) note.innerHTML = '<p style="margin:0">' + PUSH_NOTE[platform] + '</p>';
  }

  async function prompt() {
    if (!deferred) return render();
    deferred.prompt();
    try { await deferred.userChoice; } catch (e) { /* dismissed */ }
    deferred = null;
    render();
  }

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('installBtn');
    if (btn) btn.addEventListener('click', prompt);
    window.matchMedia('(display-mode: standalone)').addEventListener?.('change', render);
    render();
  });

  return { platform, render, prompt };
})();
