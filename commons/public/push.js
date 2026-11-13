// push.js — the "Turn on notifications" button (2026-11-13). Your browser asks you first; nothing is sent until you
// say yes, and "Turn off" forgets this device on the server. On an iPhone, notifications only work after you add
// Cohabi to your Home Screen (Share → Add to Home Screen) and open it from there: Apple's rule, not ours.
const box = document.querySelector('[data-push]');
if (box) {
  const say = (t) => { box.querySelector('.push-note').textContent = t; };
  const btn = box.querySelector('button');
  const api = async (path, body) => { const r = await fetch(path, { method: body ? 'POST' : 'GET', credentials: 'same-origin', headers: body ? { 'content-type': 'application/json', 'x-commons': '1' } : {}, body: body ? JSON.stringify(body) : undefined }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || `Error ${r.status}`); return j; };
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent); const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const reg = () => navigator.serviceWorker.register('/sw.js', { scope: '/' });
  async function current() { if (!supported) return null; const r = await navigator.serviceWorker.getRegistration('/'); return r ? r.pushManager.getSubscription() : null; }
  async function show() {
    if (!supported) { btn.hidden = true; say(ios && !standalone ? 'On iPhone: tap Share, then "Add to Home Screen", open Cohabi from there, and come back here to turn notifications on.' : "This browser can't show notifications."); return; }
    if (Notification.permission === 'denied') { btn.hidden = true; say('Notifications are blocked for Cohabi in this browser. You can allow them in the browser\'s site settings.'); return; }
    const sub = await current();
    btn.hidden = false; btn.textContent = sub ? '🔕 Turn off notifications on this device' : '🔔 Turn on notifications on this device';
    btn.dataset.on = sub ? '1' : '';
    say(sub ? 'On: this device will be pinged for messages, friend requests' + (box.dataset.steward ? ' and new members.' : '.') : 'Get a ping on this device when someone messages you or asks to be friends.');
  }
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    try {
      if (btn.dataset.on) { const sub = await current(); if (sub) { await api('/api/push/unsubscribe', { endpoint: sub.endpoint }); await sub.unsubscribe(); } }
      else {
        const perm = await Notification.requestPermission(); if (perm !== 'granted') { say('Okay, notifications stay off.'); return; }
        const r = await reg(); await navigator.serviceWorker.ready;
        const { key } = await api('/api/push/key');
        const sub = await r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: Uint8Array.from(atob(key.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)) });
        await api('/api/push/subscribe', { subscription: sub.toJSON() });
        await api('/api/push/test', {});
      }
    } catch (e) { say(e.message); } finally { btn.disabled = false; show(); }
  });
  show();
}
