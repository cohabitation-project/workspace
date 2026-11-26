// Cohabi Stream v0: one audio element, a queue, and the bar at the top. Data comes from the page (lib/streampage.mjs).
const $ = (id) => document.getElementById(id);
const list = $('st-list'); const audio = $('st-audio');
if (list && audio) {
  let cat = []; try { cat = JSON.parse(list.dataset.catalog || '[]'); } catch { cat = []; }
  const queue = cat.flatMap((r, ri) => r.tracks.map((t, ti) => ({ ...t, ri, ti, release: r })));
  let at = -1;
  const fmt = (s) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00');
  // One album open at a time (also the native behaviour of <details name>, where the browser supports it).
  list.addEventListener('toggle', (e) => { if (e.target.open && !document.getElementById('st-find')?.value) list.querySelectorAll('.st-rel[open]').forEach((d) => { if (d !== e.target) d.open = false; }); }, true);
  const mark = () => { document.querySelectorAll('.st-track.on').forEach((b) => b.classList.remove('on')); const q = queue[at]; if (q) document.querySelector(`.st-track[data-r="${q.ri}"][data-t="${q.ti}"]`)?.classList.add('on'); };
  const load = (i, play = true) => {
    if (i < 0 || i >= queue.length) return; at = i; const q = queue[i];
    audio.src = q.url; $('st-title').textContent = q.title; $('st-artist').textContent = `${q.release.artist} · ${q.release.title}`; $('st-source').textContent = q.release.source;
    const art = $('st-art'); if (q.release.art) { art.src = q.release.art; art.hidden = false; } else art.hidden = true;
    if ('mediaSession' in navigator) navigator.mediaSession.metadata = new MediaMetadata({ title: q.title, artist: q.release.artist, album: q.release.title, artwork: q.release.art ? [{ src: q.release.art }] : [] });
    mark(); if (play) audio.play().catch(() => {});
  };
  const idx = (ri, ti) => queue.findIndex((q) => q.ri === ri && q.ti === ti);
  list.addEventListener('click', (e) => {
    const t = e.target.closest('.st-track'); if (t) { load(idx(+t.dataset.r, +t.dataset.t)); return; }
    const a = e.target.closest('.st-playall'); if (a) load(idx(+a.dataset.r, 0));
  });
  $('st-play').addEventListener('click', () => { if (at < 0) return load(0); if (audio.paused) audio.play().catch(() => {}); else audio.pause(); });
  $('st-next').addEventListener('click', () => load(at + 1));
  $('st-prev').addEventListener('click', () => (audio.currentTime > 3 ? (audio.currentTime = 0) : load(Math.max(0, at - 1))));
  audio.addEventListener('play', () => { $('st-play').textContent = '⏸'; $('st-play').setAttribute('aria-label', 'Pause'); });
  audio.addEventListener('pause', () => { $('st-play').textContent = '▶'; $('st-play').setAttribute('aria-label', 'Play'); });
  audio.addEventListener('ended', () => load(at + 1));
  audio.addEventListener('timeupdate', () => { if (audio.duration) $('st-seek').value = Math.round((audio.currentTime / audio.duration) * 1000); $('st-time').textContent = `${fmt(audio.currentTime)} / ${fmt(audio.duration)}`; });
  $('st-seek').addEventListener('input', (e) => { if (audio.duration) audio.currentTime = (e.target.value / 1000) * audio.duration; });
  if ('mediaSession' in navigator) { navigator.mediaSession.setActionHandler('nexttrack', () => load(at + 1)); navigator.mediaSession.setActionHandler('previoustrack', () => load(at - 1)); }
  $('st-find')?.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    list.querySelectorAll('.st-rel').forEach((rel) => {
      const r = cat[+rel.dataset.r]; const relHit = !q || `${r.title} ${r.artist}`.toLowerCase().includes(q); let any = false;
      rel.querySelectorAll('.st-track').forEach((b) => { const hit = relHit || b.textContent.toLowerCase().includes(q); b.parentElement.hidden = !hit; any = any || hit; });
      rel.hidden = !any; rel.open = !!q && any && !relHit;
    });
  });
}
