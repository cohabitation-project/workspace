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
const IOS_HELP = 'On iPhone: tap Share, then "Add to Home Screen". Open Cohabi from that icon, then tap 🔔 to turn notifications on.';
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
const why = () => (!supported ? (ios && !standalone ? IOS_HELP : "This browser can't show notifications.") : Notification.permission === 'denied' ? "Notifications are blocked for Cohabi in this browser's site settings. Allow them there, then come back." : null);

// ---- the on/off boxes (panel, Account, Messages)
const boxes = [...document.querySelectorAll('[data-push]')];
async function paint() {
  const sub = await current().catch(() => null); const blocked = why();
  for (const box of boxes) {
    const btn = $('button.push-toggle', box) || $('button', box); const note = $('.push-note', box);
    if (blocked) { if (btn) btn.hidden = true; if (note) note.textContent = blocked; continue; }
    if (btn) { btn.hidden = false; btn.textContent = sub ? '🔕 Turn off on this device' : '🔔 Turn on on this device'; btn.dataset.on = sub ? '1' : ''; }
    if (note) note.textContent = sub ? 'On: this device gets pinged. Choose what for below, or turn it off anytime from the 🔔 at the bottom.' : 'Off on this device. Turn it on to get a ping for messages, friend requests and more.';
  }
  for (const b of document.querySelectorAll('.fx-bottom-bell')) b.classList.toggle('is-on', !!sub);
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
  if (e.target.closest('.fx-bottom-bell')) { if (sheet) { sheet.hidden = !sheet.hidden; if (!sheet.hidden) { paint(); loadPrefs(); $('button', sheet)?.focus(); } } return; }
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
    if (!supported) { $('.pa-q', ask).textContent = ios && !standalone ? IOS_HELP : "This browser can't show notifications, but you'll always find them in the bell."; $('[data-pa-yes]', ask).hidden = true; $('[data-pa-no]', ask).textContent = 'Got it'; }
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
