// sw.js — Cohabi's service worker: shows a notification when the server pushes one, and opens the right page when
// it's tapped. It does nothing else (no caching, no offline copy), so it can't serve you a stale site.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('push', (e) => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch { d = { title: 'Cohabi', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Cohabi', {
    body: d.body || '', icon: '/static/brand/cohabi-icon-512.png', badge: '/static/brand/cohabi-icon-512.png',
    tag: d.tag || undefined, data: { url: d.url || '/feed' },
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || '/feed', self.location.origin).href;
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) if (w.url.startsWith(self.location.origin) && 'focus' in w) { await w.focus(); if ('navigate' in w) await w.navigate(url); return; }
    await self.clients.openWindow(url);
  })());
});
