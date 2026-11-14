// push.js — phone notifications on this device (2026-11-13). Three ways in, one engine:
//  • the 🔔 in the bottom bar opens a panel: on/off for this device, what to be pinged for, quiet hours;
//  • a one-time card on the feed asks a new person "Want Cohabi to ping you?" (Yes / Not now, never nags);
//  • the box on the Account and Messages pages.
// The browser asks first; nothing is sent until you say yes. On an iPhone, Apple only allows this after Cohabi is
// added to the Home Screen and opened from there, and every one of these says so.
const $ = (sel, root = document) => root.querySelector(sel);
const api = async (path, body) => { const r = await fetch(path, { method: body ? 'POST' : 'GET', credentials: 'same-origin', headers: body ? { 'content-type': 'application/json', 'x-commons': '1' } : {}, body: body ? JSON.stringify(body) : undefined }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || `Error ${r.status}`); return j; };
const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const ASKED = 'cohabi-push-asked';
const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } } };

async function current() { if (!supported) return null; const r = await navigator.serviceWorker.getRegistration('/'); return r ? r.pushManager.getSubscription() : null; }
async function turnOn() {
  const perm = await Notification.requestPermission(); if (perm !== 'granted') return false;
  const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' }); await navigator.serviceWorker.ready;
  const { key } = await api('/api/push/key');
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: Uint8Array.from(atob(key.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)) });
  await api('/api/push/subscribe', { subscription: sub.toJSON() });
  await api('/api/push/test', {});
  return true;
}
async function turnOff() { const sub = await current(); if (sub) { await api('/api/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {}); await sub.unsubscribe(); } }
// Why notifications can't be turned on here, in words a person can act on (Geoffrey, 2026-11-14: "it should give
// instructions"). Each case names the fix; the last line says what this device reported, so a helper can read it back.
const ua = navigator.userAgent;
const inApp = /FBAN|FBAV|Instagram|Line\/|GSA\/|Snapchat|TikTok|; wv\)|LinkedInApp|Twitter/i.test(ua);
const android = /android/i.test(ua);
const where = () => `${ios ? 'iPhone/iPad' : android ? 'Android' : 'computer'} · ${/CriOS|Chrome/.test(ua) ? 'Chrome' : /FxiOS|Firefox/.test(ua) ? 'Firefox' : /EdgiOS|Edg\//.test(ua) ? 'Edge' : /Safari/.test(ua) ? 'Safari' : 'other browser'}${inApp ? ' inside an app' : ''} · from Home Screen: ${standalone ? 'yes' : 'no'} · push support: ${supported ? 'yes' : 'no'} · permission: ${'Notification' in window ? Notification.permission : 'none'}`;
function why() {
  if (!window.isSecureContext) return 'Open Cohabi at https://cohabi.org (with the s), then try again.';
  if (inApp) return `You're looking at Cohabi inside another app, and those can't show notifications. Tap the ⋯ or share menu and choose "Open in ${ios ? 'Safari' : 'Chrome'}", sign in there, then tap 🔔.`;
  if (!supported) {
    if (ios && !standalone) return 'On iPhone, Apple only allows notifications from the Home Screen app. In Safari: tap Share (the square with the arrow), then "Add to Home Screen". Open Cohabi from that new icon, sign in, then tap 🔔.';
    if (ios) return 'This iPhone needs iOS 16.4 or newer for notifications (Settings → General → Software Update). If it is up to date: delete the Cohabi icon, add it again from Safari (Share → Add to Home Screen), and open it from the new icon.';
    return 'This browser can\'t show notifications. Open https://cohabi.org in Chrome, Edge, Firefox or Safari and tap 🔔 there.';
  }
  if (Notification.permission === 'denied') {
    if (ios) return 'Notifications are switched off for Cohabi. Open the iPhone Settings app → Notifications → Cohabi → turn on Allow Notifications. Then close Cohabi fully and open it again.';
    if (android) return 'Notifications are blocked for Cohabi. In Chrome, tap the icon to the left of the web address → Permissions (or Site settings) → Notifications → Allow. Then reload this page. If Chrome says notifications are "managed by" Cohabi, Cohabi is installed as an app on this phone, and Android decides: open Android Settings → Apps → Cohabi → Notifications → turn them on, then open Cohabi from its icon.';
    if (/Safari/.test(ua) && !/Chrome/.test(ua)) return 'Notifications are blocked for Cohabi. In Safari: Settings → Websites → Notifications → set cohabi.org to Allow. Then reload this page.';
    return 'Notifications are blocked for Cohabi. Click the icon to the left of the web address → Site settings → Notifications → Allow. Then reload this page.';
  }
  return null;
}
// After someone changes a setting and comes back, look again instead of showing the old message.
document.addEventListener('visibilitychange', () => { if (!document.hidden) paint(); });

// ---- the on/off boxes (panel, Account, Messages)
const boxes = [...document.querySelectorAll('[data-push]')];
async function paint() {
  const sub = await current().catch(() => null); const blocked = why();
  for (const box of boxes) {
    const btn = $('button.push-toggle', box) || $('button', box); const note = $('.push-note', box);
    if (blocked) { if (btn) btn.hidden = true; if (note) { note.textContent = blocked; const d = document.createElement('small'); d.className = 'push-where'; d.style.cssText = 'display:block;opacity:.65;margin-top:.4em'; d.textContent = `This device: ${where()}`; note.appendChild(d); } continue; }
    if (btn) { btn.hidden = false; btn.textContent = sub ? '🔕 Turn off on this device' : '🔔 Turn on on this device'; btn.dataset.on = sub ? '1' : ''; }
    if (note) note.textContent = sub ? 'On: this device gets pinged. Choose what for below, or turn it off anytime from the 🔔 at the bottom.' : 'Off on this device. Turn it on to get a ping for messages, friend requests and more.';
  }
  for (const b of document.querySelectorAll('.fx-bottom-bell, [data-open-notify]')) b.classList.toggle('is-on', !!sub);
  const prefs = $('#notify-prefs'); if (prefs) prefs.hidden = !sub;
}
for (const box of boxes) {
  const btn = $('button.push-toggle', box) || $('button', box); if (!btn) continue;
  btn.addEventListener('click', async () => {
    btn.disabled = true; const note = $('.push-note', box);
    try { if (btn.dataset.on) await turnOff(); else if (!(await turnOn()) && note) note.textContent = 'Okay, notifications stay off.'; }
    catch (e) { if (note) note.textContent = e.message; }
    finally { btn.disabled = false; store.set(ASKED, '1'); await paint(); loadPrefs(); }
  });
}

// ---- the bottom-bar 🔔 opens the panel
const sheet = $('#notify-sheet');
document.addEventListener('click', (e) => {
  if (e.target.closest('.fx-bottom-bell, [data-open-notify]')) { if (sheet) { sheet.hidden = !sheet.hidden; if (!sheet.hidden) { paint(); loadPrefs(); $('button', sheet)?.focus(); } } return; }
  if (e.target.closest('[data-notify-close]') && sheet) { sheet.hidden = true; return; }
  if (sheet && !sheet.hidden && !sheet.contains(e.target)) sheet.hidden = true;
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sheet && !sheet.hidden) sheet.hidden = true; });

// ---- what to be pinged for, and quiet hours
async function loadPrefs() {
  const box = $('#notify-prefs'); if (!box) return;
  let p; try { p = await api('/api/push/prefs'); } catch { return; }
  box.innerHTML = `<h3>Ping me for</h3>${p.kinds_meta.map((k) => `<label class="np-row"><input type="checkbox" data-kind="${k.key}"${p.kinds[k.key] ? ' checked' : ''}> ${k.label}</label>`).join('')}
  <h3>Quiet hours</h3><label class="np-row"><input type="checkbox" data-quiet${p.quiet.on ? ' checked' : ''}> No pings from <input type="time" data-from value="${p.quiet.from}"> to <input type="time" data-to value="${p.quiet.to}"></label>
  <p class="np-note">During quiet hours nothing pings; it's all still in the bell on the site.</p>`;
  const save = async () => {
    const kinds = {}; box.querySelectorAll('[data-kind]').forEach((i) => { kinds[i.dataset.kind] = i.checked; });
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    await api('/api/push/prefs', { kinds, quiet: { on: $('[data-quiet]', box).checked, from: $('[data-from]', box).value, to: $('[data-to]', box).value, tz } }).catch(() => {});
  };
  box.querySelectorAll('input').forEach((i) => i.addEventListener('change', save));
}

// ---- the one-time question for someone new (on the feed)
const ask = $('[data-push-ask]');
if (ask && !store.get(ASKED)) {
  (async () => {
    const sub = await current().catch(() => null); if (sub) { store.set(ASKED, '1'); return; }
    if (supported && Notification.permission === 'denied') return;
    ask.hidden = false;
    if (!supported) { $('.pa-q', ask).textContent = `${why()} Either way, you'll always find them in the bell.`; $('[data-pa-yes]', ask).hidden = true; $('[data-pa-no]', ask).textContent = 'Got it'; }
  })();
  ask.addEventListener('click', async (e) => {
    if (e.target.closest('[data-pa-no]')) { store.set(ASKED, '1'); ask.hidden = true; return; }
    if (e.target.closest('[data-pa-yes]')) {
      const b = e.target.closest('button'); b.disabled = true;
      try { const ok = await turnOn(); $('.pa-q', ask).textContent = ok ? "Done. You'll get a ping for messages and friend requests. To change what pings you, or turn it off, tap the 🔔 at the bottom." : "Okay, they stay off. You can turn them on anytime from the 🔔 at the bottom."; }
      catch (err) { $('.pa-q', ask).textContent = err.message; }
      store.set(ASKED, '1'); $('[data-pa-yes]', ask).hidden = true; $('[data-pa-no]', ask).textContent = 'Close'; paint();
    }
  });
}
paint();
