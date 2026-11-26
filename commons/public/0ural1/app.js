// 0ural1 — the player and every view, drawn from the catalog the page carries (lib/streampage.mjs).
// Play modes (Geoffrey, 2026-11-25): play all, shuffle across every artist, play straight through, only these artists,
// and playlist mixes. Hearts, playlists and the last mix are kept in this browser only (localStorage, guarded).
const $ = (id) => document.getElementById(id);
const main = $('ou-main'); const view = $('st-list'); const audio = $('ou-audio');
const h = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (s) => (Number.isFinite(s) && s > 0 ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '');
const ICON = {
  play: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="currentColor"><rect x="6.5" y="5" width="4" height="14" rx="1"/><rect x="13.5" y="5" width="4" height="14" rx="1"/></svg>',
  heart: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
  plus: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  shuffle: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>',
  through: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h12M4 12h12M4 17h7M19 12v7l3-2"/></svg>',
};

if (main && view && audio) {
  // ---- catalog ---------------------------------------------------------------------------------------------------
  let cat = []; try { cat = JSON.parse(main.dataset.catalog || '[]'); } catch { cat = []; }
  const ALL = cat.flatMap((r, ri) => r.tracks.map((t, ti) => ({ ...t, ri, ti, rel: r, artist: r.artist, album: r.title, art: r.art })));
  const byUrl = new Map(ALL.map((t) => [t.url, t]));
  const ARTISTS = [...new Set(cat.map((r) => r.artist))].map((name) => {
    const rels = cat.filter((r) => r.artist === name);
    return { name, rels, tracks: ALL.filter((t) => t.artist === name), art: (rels.find((r) => r.art) || {}).art || null };
  });
  const artistOf = (name) => ARTISTS.find((a) => a.name === name);

  // ---- what this browser keeps -------------------------------------------------------------------------------------
  const KEY = 'ou1';
  const store = (() => { let s = {}; try { s = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { s = {}; } return { liked: [], lists: [], dur: {}, vol: 90, mix: { artists: [], lists: [], liked: false, order: 'random' }, ...s }; })();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* private mode: keep it for this visit only */ } pushLater(); };

  // ---- the member's account (round 65): signed in, hearts and playlists follow the member to any device ---------------
  // GET/PUT /api/me/0ural1 keeps `{ liked, lists: [{ name, tracks }] }` (no ids). Signed out, nothing here touches the
  // network except the one /api/me probe (the cookie is HttpOnly, so asking is the only way to know; a 401 is the answer).
  const acct = { on: false, last: '', timer: 0, warned: false };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const plain = (liked, lists) => JSON.stringify({ liked, lists: lists.map(({ name, tracks }) => ({ name, tracks })) });
  const putAccount = (keepalive = false) => {
    clearTimeout(acct.timer); acct.timer = 0;
    if (!acct.on) return;
    const body = plain(store.liked, store.lists); if (body === acct.last) return; // durations and volume also call save(); only a real change is sent
    const before = acct.last; acct.last = body;
    fetch('/api/me/0ural1', { method: 'PUT', credentials: 'same-origin', keepalive, headers: { 'Content-Type': 'application/json', 'X-Commons': '1' }, body })
      .then((r) => { if (r.status === 400) { if (!acct.warned) { acct.warned = true; console.warn('0ural1: the account refused this save; hearts and playlists stay in this browser.'); } } else if (!r.ok) acct.last = before; })
      .catch(() => { acct.last = before; });
  };
  const pushLater = () => { if (!acct.on) return; clearTimeout(acct.timer); acct.timer = setTimeout(() => putAccount(), 1500); };
  document.addEventListener('visibilitychange', () => { if (document.hidden) putAccount(true); });
  const hydrate = async () => {
    const opts = { credentials: 'same-origin', headers: { 'X-Commons': '1' } };
    try {
      const me = await fetch('/api/me', opts); if (!me.ok) return;
      const r = await fetch('/api/me/0ural1', opts); if (!r.ok) return;
      const s = await r.json();
      const sl = Array.isArray(s.liked) ? s.liked : []; const ss = Array.isArray(s.lists) ? s.lists : [];
      const old = store.lists;
      const fresh = ss.map((l) => ({ id: uid(), name: l.name, tracks: [...(l.tracks || [])] }));
      const byName = new Map(fresh.map((l) => [l.name, l.id]));
      const extra = old.filter((l) => !byName.has(l.name)); // a list only this browser has stays, and is sent up next
      store.mix.lists = [...new Set(store.mix.lists.map((id) => { const o = old.find((l) => l.id === id); return o ? (byName.get(o.name) || o.id) : null; }).filter(Boolean))];
      store.liked = [...store.liked, ...sl.filter((u) => !store.liked.includes(u))];
      store.lists = [...fresh, ...extra];
      acct.on = true; acct.last = plain(sl, ss);
      save(); syncHearts(); route();
    } catch { /* signed out, or offline: this browser keeps its own copy */ }
  };
  const isLiked = (u) => store.liked.includes(u);
  const toggleLike = (u) => { store.liked = isLiked(u) ? store.liked.filter((x) => x !== u) : [u, ...store.liked]; save(); syncHearts(); };
  const listById = (id) => store.lists.find((l) => l.id === id);
  const tracksOf = (urls) => urls.map((u) => byUrl.get(u)).filter(Boolean);

  // ---- durations, read lazily from the audio files themselves ----------------------------------------------------
  const wantDur = []; let probing = 0;
  const probe = () => {
    while (probing < 3 && wantDur.length) {
      const u = wantDur.shift(); if (store.dur[u]) { paintDur(u); continue; }
      probing++; const a = new Audio(); a.preload = 'metadata';
      const done = () => { probing--; a.removeAttribute('src'); probe(); };
      a.addEventListener('loadedmetadata', () => { if (Number.isFinite(a.duration)) { store.dur[u] = Math.round(a.duration); save(); paintDur(u); } done(); }, { once: true });
      a.addEventListener('error', done, { once: true }); a.src = u;
    }
  };
  const paintDur = (u) => { view.querySelectorAll(`[data-dur="${CSS.escape(u)}"]`).forEach((el) => { el.textContent = fmt(store.dur[u]); }); paintTotals(); };
  const paintTotals = () => view.querySelectorAll('[data-total]').forEach((el) => {
    const urls = (ctx[el.dataset.total] || {}).tracks?.map((t) => t.url) || []; const known = urls.filter((u) => store.dur[u]);
    if (urls.length && known.length === urls.length) { const m = Math.round(urls.reduce((n, u) => n + store.dur[u], 0) / 60); el.textContent = ` · ${m >= 60 ? `${Math.floor(m / 60)} hr ${m % 60} min` : `${m} min`}`; }
  });
  const askDurations = (tracks) => { tracks.forEach((t) => { if (!store.dur[t.url] && !wantDur.includes(t.url)) wantDur.push(t.url); }); probe(); };

  // ---- the queue ---------------------------------------------------------------------------------------------------
  let queue = []; let order = []; let pos = -1; let label = ''; let shuffle = false; let repeat = 'off';
  const shuffled = (n, first) => { const a = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } if (first != null) { a.splice(a.indexOf(first), 1); a.unshift(first); } return a; };
  const current = () => queue[order[pos]];
  /** Play a list. mode: 'through' keeps its order, 'random' shuffles it; start is an index into the list. */
  const playList = (tracks, { start = 0, mode = shuffle ? 'random' : 'through', name = '' } = {}) => {
    if (!tracks.length) { toast('Nothing to play there yet.'); return; }
    queue = tracks.slice(); label = name;
    shuffle = mode === 'random'; setPressed('ou-shuffle', shuffle);
    const first = mode === 'random' && start === 0 && !tracks.__picked ? Math.floor(Math.random() * tracks.length) : start;
    order = shuffle ? shuffled(queue.length, first) : [...queue.keys()];
    pos = shuffle ? 0 : first; load();
  };
  const load = (play = true) => {
    const t = current(); if (!t) return;
    audio.src = t.url; $('ou-title').textContent = t.title; $('ou-sub').textContent = `${t.artist} · ${t.album}`;
    const art = $('ou-art'); if (t.art) { art.src = t.art; art.hidden = false; $('ou-noart').hidden = true; } else { art.hidden = true; $('ou-noart').hidden = false; }
    $('ou-heart').disabled = false;
    $('ou-mode').textContent = `${label || 'Playing'} · ${shuffle ? 'shuffled' : 'in order'}`;
    if ('mediaSession' in navigator) navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist, album: t.album, artwork: t.art ? [{ src: t.art }] : [] });
    document.title = `${t.title} · ${t.artist} · 0ural1`;
    syncNow(); syncHearts(); drawQueue(); if (play) audio.play().catch(() => {});
  };
  const step = (d, auto = false) => {
    if (!queue.length) { playList(ALL, { name: 'Everything' }); return; }
    if (auto && repeat === 'one') { audio.currentTime = 0; audio.play().catch(() => {}); return; }
    let n = pos + d;
    if (n >= order.length) { if (repeat === 'all' || !auto) { if (shuffle) order = shuffled(queue.length); n = 0; } else { audio.pause(); audio.currentTime = 0; return; } }
    if (n < 0) n = repeat === 'all' ? order.length - 1 : 0;
    pos = n; load();
  };
  const setShuffle = (on) => {
    shuffle = on; setPressed('ou-shuffle', on);
    if (queue.length) { const cur = order[pos]; order = on ? shuffled(queue.length, cur) : [...queue.keys()]; pos = on ? 0 : cur; $('ou-mode').textContent = `${label || 'Playing'} · ${on ? 'shuffled' : 'in order'}`; drawQueue(); }
  };

  // ---- the bar -----------------------------------------------------------------------------------------------------
  const setPressed = (id, on) => { const b = $(id); b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.classList.toggle('on', on); };
  $('ou-play').addEventListener('click', () => { if (!queue.length) return playList(ALL, { name: 'Everything' }); if (audio.paused) audio.play().catch(() => {}); else audio.pause(); });
  $('ou-next').addEventListener('click', () => step(1));
  $('ou-prev').addEventListener('click', () => (audio.currentTime > 3 ? (audio.currentTime = 0) : step(-1)));
  $('ou-shuffle').addEventListener('click', () => setShuffle(!shuffle));
  $('ou-repeat').addEventListener('click', (e) => {
    const b = e.currentTarget; repeat = { off: 'all', all: 'one', one: 'off' }[repeat]; b.dataset.mode = repeat; b.classList.toggle('on', repeat !== 'off');
    b.setAttribute('aria-label', `Repeat: ${{ off: 'off', all: 'all', one: 'this song' }[repeat]}`); toast({ off: 'Repeat off', all: 'Repeating the whole queue', one: 'Repeating this song' }[repeat]);
  });
  $('ou-heart').addEventListener('click', () => { const t = current(); if (t) { toggleLike(t.url); toast(isLiked(t.url) ? 'Added to Liked' : 'Removed from Liked'); } });
  const vol = $('ou-vol'); vol.value = store.vol; audio.volume = store.vol / 100;
  vol.addEventListener('input', () => { audio.volume = vol.value / 100; store.vol = +vol.value; save(); });
  audio.addEventListener('play', () => { $('ou-play').innerHTML = ICON.pause; $('ou-play').setAttribute('aria-label', 'Pause'); syncNow(); });
  audio.addEventListener('pause', () => { $('ou-play').innerHTML = ICON.play; $('ou-play').setAttribute('aria-label', 'Play'); syncNow(); });
  audio.addEventListener('ended', () => step(1, true));
  audio.addEventListener('loadedmetadata', () => { const t = current(); if (t && Number.isFinite(audio.duration)) { store.dur[t.url] = Math.round(audio.duration); save(); paintDur(t.url); } });
  audio.addEventListener('timeupdate', () => {
    if (audio.duration) { $('ou-seek').value = Math.round((audio.currentTime / audio.duration) * 1000); $('ou-seek').style.setProperty('--p', `${(audio.currentTime / audio.duration) * 100}%`); }
    $('ou-cur').textContent = fmt(audio.currentTime) || '0:00'; $('ou-dur').textContent = fmt(audio.duration) || '0:00';
  });
  $('ou-seek').addEventListener('input', (e) => { if (audio.duration) audio.currentTime = (e.target.value / 1000) * audio.duration; });
  if ('mediaSession' in navigator) { navigator.mediaSession.setActionHandler('nexttrack', () => step(1)); navigator.mediaSession.setActionHandler('previoustrack', () => step(-1)); }
  document.addEventListener('keydown', (e) => { if (e.code === 'Space' && !/INPUT|TEXTAREA|BUTTON|SELECT/.test(e.target.tagName)) { e.preventDefault(); $('ou-play').click(); } });

  // Up next
  const qPanel = $('ou-queue');
  const drawQueue = () => {
    const ol = $('ou-qlist'); if (!ol) return;
    ol.innerHTML = order.slice(pos, pos + 60).map((qi, k) => { const t = queue[qi]; return `<li${k === 0 ? ' class="on"' : ''}><button type="button" data-qpos="${pos + k}">${t.art ? `<img src="${h(t.art)}" alt="" loading="lazy">` : '<span class="ou-qno"></span>'}<span><strong>${h(t.title)}</strong><small>${h(t.artist)}</small></span></button></li>`; }).join('') || '<li class="ou-empty">Nothing queued yet.</li>';
  };
  $('ou-qbtn').addEventListener('click', () => { qPanel.hidden = !qPanel.hidden; $('ou-qbtn').setAttribute('aria-expanded', String(!qPanel.hidden)); $('ou-qbtn').classList.toggle('on', !qPanel.hidden); drawQueue(); });
  $('ou-qclose').addEventListener('click', () => $('ou-qbtn').click());
  qPanel.addEventListener('click', (e) => { const b = e.target.closest('[data-qpos]'); if (b) { pos = +b.dataset.qpos; load(); } });

  // ---- views -------------------------------------------------------------------------------------------------------
  // Every song table registers its list here, so a click plays that list from that song.
  let ctx = {}; let ctxN = 0;
  const reg = (tracks, name) => { const id = `c${ctxN++}`; ctx[id] = { tracks, name }; return id; };
  const cover = (src, cls = 'ou-cover') => (src ? `<img class="${cls}" src="${h(src)}" alt="" loading="lazy">` : `<span class="${cls} ou-noimg" aria-hidden="true">♪</span>`);
  const albumCard = (r) => `<div class="ou-card"><a href="#/album/${cat.indexOf(r)}">${cover(r.art)}<strong>${h(r.title)}</strong><small>${h(r.artist)}${r.date ? ` · ${h(r.date.slice(0, 4))}` : ''}</small></a><button type="button" class="ou-fab" data-play-album="${cat.indexOf(r)}" aria-label="Play ${h(r.title)}">${ICON.play}</button></div>`;
  const artistCard = (a) => `<a class="ou-acard" href="#/artist/${encodeURIComponent(a.name)}">${cover(a.art, 'ou-round')}<strong>${h(a.name)}</strong><small>${a.tracks.length} songs</small></a>`;
  const actions = (id, extra = '') => `<div class="ou-actions"><button type="button" class="ou-btn" data-ctx="${id}" data-mode="through">${ICON.play} Play</button><button type="button" class="ou-btn ghost" data-ctx="${id}" data-mode="random">${ICON.shuffle} Shuffle</button><button type="button" class="ou-btn ghost" data-addall="${id}">${ICON.plus} Add to playlist</button>${extra}</div>`;
  const table = (tracks, name, { showAlbum = true, removeFrom = null } = {}) => {
    const id = reg(tracks, name); askDurations(tracks);
    if (!tracks.length) return '<p class="ou-empty">No songs here yet.</p>';
    return `<ol class="ou-table${showAlbum ? '' : ' noalbum'}" data-list="${id}">${tracks.map((t, i) => `<li class="ou-row" data-u="${h(t.url)}">
      <button type="button" class="ou-rowplay" data-ctx="${id}" data-i="${i}" aria-label="Play ${h(t.title)}"><span class="ou-n">${i + 1}</span><span class="ou-eq" aria-hidden="true"><i></i><i></i><i></i></span>${cover(t.art, 'ou-thumb')}<span class="ou-tt"><strong>${h(t.title)}</strong><small>${h(t.artist)}</small></span>${showAlbum ? `<span class="ou-alb">${h(t.album)}</span>` : ''}</button>
      <button type="button" class="ou-ib sm ou-like" data-like="${h(t.url)}" aria-label="Like ${h(t.title)}" aria-pressed="false">${ICON.heart}</button>
      ${removeFrom ? `<button type="button" class="ou-ib sm" data-remove="${h(t.url)}" data-from="${h(removeFrom)}" aria-label="Remove from playlist">✕</button>` : `<button type="button" class="ou-ib sm" data-add="${h(t.url)}" aria-label="Add ${h(t.title)} to a playlist">${ICON.plus}</button>`}
      <span class="ou-dur" data-dur="${h(t.url)}">${fmt(store.dur[t.url])}</span></li>`).join('')}</ol>`;
  };
  const head = (title, sub = '') => `<header class="ou-h"><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</header>`;
  const row = (title, items, more = '') => `<section class="ou-sec"><div class="ou-sech"><h2>${title}</h2>${more}</div><div class="ou-row-scroll">${items}</div></section>`;

  const V = {
    discover() {
      const recent = cat.slice(0, 8); const allId = reg(ALL, 'Everything');
      return `<section class="ou-hero">${cover((cat[0] || {}).art, 'ou-herobg')}<div class="ou-herotext"><span class="ou-kicker">0ural1 · our all</span><h1>Every song from Cohabi's artists.</h1><p>${ALL.length} songs, ${cat.length} albums, ${ARTISTS.length} artists. Free to listen.</p>
        <div class="ou-actions"><button type="button" class="ou-btn" data-ctx="${allId}" data-mode="through">${ICON.play} Play all</button><button type="button" class="ou-btn light" data-ctx="${allId}" data-mode="random">${ICON.shuffle} Shuffle every artist</button><a class="ou-btn ghost light" href="#/mix">Build a mix</a></div></div></section>
        <div class="ou-chips" role="list">${ARTISTS.map((a) => `<a role="listitem" class="ou-chip" href="#/artist/${encodeURIComponent(a.name)}">${h(a.name)}</a>`).join('')}<a class="ou-chip" href="#/liked">♥ Liked</a><a class="ou-chip" href="#/playlists">Your playlists</a></div>
        ${row('Recently added', recent.map(albumCard).join(''), '<a href="#/albums">See all</a>')}
        ${row('Artists', ARTISTS.map(artistCard).join(''), '<a href="#/artists">See all</a>')}
        <section class="ou-sec"><div class="ou-sech"><h2>Play it your way</h2></div><div class="ou-modes">
          <button type="button" class="ou-modecard" data-ctx="${allId}" data-mode="through"><b>${ICON.through}</b><strong>Play through</strong><small>Every album, newest first, start to finish.</small></button>
          <button type="button" class="ou-modecard" data-ctx="${allId}" data-mode="random"><b>${ICON.shuffle}</b><strong>Random, all artists</strong><small>Everything, shuffled together.</small></button>
          <a class="ou-modecard" href="#/mix"><b>${ICON.plus}</b><strong>Only these artists</strong><small>Pick artists and playlists, then play them through or random.</small></a>
          <a class="ou-modecard" href="#/playlists"><b>♥</b><strong>Your playlists</strong><small>Make lists, mix them together.</small></a></div></section>`;
    },
    albums() { return head('Albums', `${cat.length} albums`) + `<div class="ou-grid">${cat.map(albumCard).join('')}</div>`; },
    album(i) {
      const r = cat[+i]; if (!r) return V.discover(); const id = reg(r.tracks.map((t, ti) => ALL.find((x) => x.ri === +i && x.ti === ti)), r.title);
      return `<section class="ou-ahero">${cover(r.art, 'ou-bigcover')}<div><span class="ou-kicker">Album</span><h1>${h(r.title)}</h1><p><a href="#/artist/${encodeURIComponent(r.artist)}">${h(r.artist)}</a>${r.date ? ` · ${h(r.date.slice(0, 4))}` : ''} · ${r.tracks.length} songs<span data-total="${id}"></span> · ${r.by === 'ai' ? 'AI' : 'human'} artist</p>${actions(id, `<a class="ou-btn ghost" href="${h(r.page)}">Artist page ↗</a>`)}</div></section>
        ${table(ctx[id].tracks, r.title, { showAlbum: false })}<p class="ou-src">Source: ${h(r.source)}</p>`;
    },
    artists() { return head('Artists', `${ARTISTS.length} artists`) + `<div class="ou-grid round">${ARTISTS.map(artistCard).join('')}</div>`; },
    artist(name) {
      const a = artistOf(decodeURIComponent(name)); if (!a) return V.artists(); const id = reg(a.tracks, a.name);
      return `<section class="ou-ahero">${cover(a.art, 'ou-bigcover round')}<div><span class="ou-kicker">Artist</span><h1>${h(a.name)}</h1><p>${a.rels.length} albums · ${a.tracks.length} songs<span data-total="${id}"></span></p>${actions(id)}</div></section>
        ${row('Albums', a.rels.map(albumCard).join(''))}<section class="ou-sec"><div class="ou-sech"><h2>All songs</h2></div>${table(a.tracks, a.name)}</section>`;
    },
    songs() { const id = reg(ALL, 'All songs'); return head('Songs', `${ALL.length} songs<span data-total="${id}"></span>`) + actions(id) + table(ALL, 'All songs'); },
    liked() { const t = tracksOf(store.liked); const id = reg(t, 'Liked'); return head('♥ Liked', `${t.length} songs · kept ${acct.on ? 'on your account' : 'in this browser'}`) + (t.length ? actions(id) : '') + (t.length ? table(t, 'Liked') : '<p class="ou-empty">Tap ♥ on any song and it lands here.</p>'); },
    playlists() {
      return head('Playlists', `Kept ${acct.on ? 'on your account' : 'in this browser'}. Mix any of them together in <a href="#/mix">Mix</a>.`) + `<form class="ou-new" id="ou-newlist"><label class="sr-only" for="ou-newname">New playlist name</label><input id="ou-newname" placeholder="New playlist name" maxlength="60" required><button class="ou-btn" type="submit">${ICON.plus} Create</button></form>
        <div class="ou-grid">${store.lists.map((l) => { const t = tracksOf(l.tracks); return `<a class="ou-card" href="#/playlist/${h(l.id)}"><span class="ou-cover ou-mosaic">${t.slice(0, 4).map((x) => (x.art ? `<img src="${h(x.art)}" alt="" loading="lazy">` : '<i></i>')).join('') || '<i class="ou-noimg">♪</i>'}</span><strong>${h(l.name)}</strong><small>${t.length} songs</small></a>`; }).join('') || '<p class="ou-empty">No playlists yet. Make one above, then add songs with ＋.</p>'}</div>`;
    },
    playlist(pid) {
      const l = listById(pid); if (!l) return V.playlists(); const t = tracksOf(l.tracks); const id = reg(t, l.name);
      return head(h(l.name), `${t.length} songs<span data-total="${id}"></span>`) + actions(id, `<button type="button" class="ou-btn ghost" data-rename="${h(l.id)}">Rename</button><button type="button" class="ou-btn ghost danger" data-dellist="${h(l.id)}">Delete</button>`) + table(t, l.name, { removeFrom: l.id });
    },
    mix() {
      const m = store.mix;
      const chip = (kind, val, text, on) => `<button type="button" class="ou-pick${on ? ' on' : ''}" data-pick="${kind}" data-val="${h(val)}" aria-pressed="${on}">${text}</button>`;
      return head('Mix', 'Choose what goes in and how it plays. Nothing picked means every artist.') + `<section class="ou-mixbox">
        <h2>From</h2><div class="ou-picks">${chip('all', '', 'All artists', !m.artists.length && !m.lists.length && !m.liked)}${ARTISTS.map((a) => chip('artist', a.name, `${h(a.name)} <small>${a.tracks.length}</small>`, m.artists.includes(a.name))).join('')}</div>
        <h2>Add your playlists</h2><div class="ou-picks">${chip('liked', '', `♥ Liked <small>${store.liked.length}</small>`, m.liked)}${store.lists.map((l) => chip('list', l.id, `${h(l.name)} <small>${l.tracks.length}</small>`, m.lists.includes(l.id))).join('') || '<span class="ou-empty sm">No playlists yet. <a href="#/playlists">Make one</a>.</span>'}</div>
        <h2>How it plays</h2><div class="ou-picks">${chip('order', 'random', `${ICON.shuffle} Random`, m.order === 'random')}${chip('order', 'through', `${ICON.through} Play through`, m.order === 'through')}</div>
        <p class="ou-mixsum" id="ou-mixsum"></p>
        <div class="ou-actions"><button type="button" class="ou-btn big" id="ou-mixgo">${ICON.play} Play mix</button><button type="button" class="ou-btn ghost" id="ou-mixsave">${ICON.plus} Save as playlist</button></div></section>`;
    },
    search(q) {
      const s = q.toLowerCase(); const songs = ALL.filter((t) => `${t.title} ${t.artist} ${t.album}`.toLowerCase().includes(s));
      const albums = cat.filter((r) => `${r.title} ${r.artist}`.toLowerCase().includes(s)); const arts = ARTISTS.filter((a) => a.name.toLowerCase().includes(s));
      return head(`Results for “${h(q)}”`) + (arts.length ? row('Artists', arts.map(artistCard).join('')) : '') + (albums.length ? row('Albums', albums.map(albumCard).join('')) : '')
        + `<section class="ou-sec"><div class="ou-sech"><h2>Songs</h2></div>${songs.length ? table(songs, `“${q}”`) : '<p class="ou-empty">No songs match.</p>'}</section>`;
    },
  };
  const mixTracks = () => {
    const m = store.mix; const urls = new Set();
    const none = !m.artists.length && !m.lists.length && !m.liked;
    (none ? ALL : ALL.filter((t) => m.artists.includes(t.artist))).forEach((t) => urls.add(t.url));
    m.lists.forEach((id) => (listById(id)?.tracks || []).forEach((u) => urls.add(u))); if (m.liked) store.liked.forEach((u) => urls.add(u));
    return tracksOf([...urls]);
  };
  const mixName = () => { const m = store.mix; const parts = [...m.artists, ...m.lists.map((id) => listById(id)?.name).filter(Boolean), ...(m.liked ? ['Liked'] : [])]; return parts.length ? `Mix: ${parts.slice(0, 3).join(' + ')}${parts.length > 3 ? ` +${parts.length - 3}` : ''}` : 'Mix: all artists'; };
  const drawMixSum = () => { const el = $('ou-mixsum'); if (el) { const n = mixTracks().length; el.textContent = `${n} song${n === 1 ? '' : 's'} · ${store.mix.order === 'random' ? 'random order' : 'played through in order'}`; } };

  // ---- routing ---------------------------------------------------------------------------------------------------
  const route = () => {
    const q = $('ou-find').value.trim(); ctx = {}; ctxN = 0;
    const [, name = 'discover', arg] = (location.hash.match(/^#\/([a-z]+)(?:\/(.+))?/) || []);
    view.innerHTML = q ? V.search(q) : (V[name] ? V[name](arg) : V.discover());
    document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('on', !q && (a.dataset.nav === name || (name === 'album' && a.dataset.nav === 'albums') || (name === 'artist' && a.dataset.nav === 'artists') || (name === 'playlist' && a.dataset.nav === 'playlists'))));
    syncNow(); syncHearts(); drawMixSum(); paintTotals();
  };
  window.addEventListener('hashchange', () => { $('ou-find').value = ''; route(); main.focus({ preventScroll: true }); window.scrollTo(0, 0); });
  let ft; $('ou-find').addEventListener('input', () => { clearTimeout(ft); ft = setTimeout(route, 120); });

  const syncNow = () => {
    const t = current(); view.querySelectorAll('.ou-row.now').forEach((r) => r.classList.remove('now', 'paused'));
    if (t) view.querySelectorAll(`.ou-row[data-u="${CSS.escape(t.url)}"]`).forEach((r) => { r.classList.add('now'); r.classList.toggle('paused', audio.paused); });
  };
  const syncHearts = () => {
    view.querySelectorAll('[data-like]').forEach((b) => { const on = isLiked(b.dataset.like); b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    const t = current(); const hb = $('ou-heart'); const on = !!t && isLiked(t.url); hb.classList.toggle('on', on); hb.setAttribute('aria-pressed', String(on));
  };

  // ---- add to playlist ---------------------------------------------------------------------------------------------
  const sheet = $('ou-sheet'); let adding = [];
  const openSheet = (urls) => {
    adding = urls; $('ou-sheet-h').textContent = urls.length === 1 ? `Add “${byUrl.get(urls[0])?.title || 'song'}” to…` : `Add ${urls.length} songs to…`;
    $('ou-sheet-body').innerHTML = `${store.lists.map((l) => `<button type="button" class="ou-sheetrow" data-to="${h(l.id)}">${h(l.name)} <small>${l.tracks.length}</small></button>`).join('')}<form class="ou-new" id="ou-sheetnew"><input id="ou-sheetname" placeholder="New playlist" maxlength="60" required aria-label="New playlist name"><button class="ou-btn" type="submit">Create &amp; add</button></form>`;
    sheet.hidden = false; (sheet.querySelector('.ou-sheetrow') || $('ou-sheetname')).focus();
  };
  const addTo = (l) => { const before = l.tracks.length; adding.forEach((u) => { if (!l.tracks.includes(u)) l.tracks.push(u); }); save(); sheet.hidden = true; toast(`Added ${l.tracks.length - before} to ${l.name}`); if (/^#\/(playlists|mix)/.test(location.hash)) route(); };
  const newList = (name) => { const l = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: name.trim().slice(0, 60) || 'Playlist', tracks: [] }; store.lists.push(l); save(); return l; };
  sheet.addEventListener('click', (e) => { if (e.target === sheet || e.target.id === 'ou-sheet-x') sheet.hidden = true; const b = e.target.closest('[data-to]'); if (b) addTo(listById(b.dataset.to)); });
  sheet.addEventListener('submit', (e) => { e.preventDefault(); addTo(newList($('ou-sheetname').value)); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { sheet.hidden = true; if (!qPanel.hidden) $('ou-qbtn').click(); } });

  // ---- clicks in the views -----------------------------------------------------------------------------------------
  view.addEventListener('click', (e) => {
    const el = e.target.closest('button,[data-pick]'); if (!el) return;
    const d = el.dataset;
    if (d.playAlbum != null) { const r = cat[+d.playAlbum]; playList(ALL.filter((t) => t.rel === r), { mode: 'through', name: r.title }); return; }
    if (d.ctx) { const c = ctx[d.ctx]; if (!c) return; if (d.i != null) { const t = c.tracks[+d.i]; if (current()?.url === t.url && label === c.name) { $('ou-play').click(); return; } const l = c.tracks.slice(); l.__picked = true; playList(l, { start: +d.i, mode: shuffle ? 'random' : 'through', name: c.name }); } else playList(c.tracks, { mode: d.mode, name: c.name }); return; }
    if (d.like) { toggleLike(d.like); return; }
    if (d.add) { openSheet([d.add]); return; }
    if (d.addall) { openSheet(ctx[d.addall].tracks.map((t) => t.url)); return; }
    if (d.remove) { const l = listById(d.from); l.tracks = l.tracks.filter((u) => u !== d.remove); save(); route(); return; }
    if (d.rename) { const l = listById(d.rename); el.outerHTML = `<form class="ou-new inline" data-renameform="${h(l.id)}"><input value="${h(l.name)}" maxlength="60" required aria-label="Playlist name"><button class="ou-btn" type="submit">Save</button></form>`; view.querySelector('[data-renameform] input')?.focus(); return; }
    if (d.dellist) { if (el.dataset.sure) { store.lists = store.lists.filter((l) => l.id !== d.dellist); store.mix.lists = store.mix.lists.filter((x) => x !== d.dellist); save(); location.hash = '#/playlists'; } else { el.dataset.sure = '1'; el.textContent = 'Tap again to delete'; } return; }
    if (d.pick) {
      const m = store.mix;
      if (d.pick === 'all') { m.artists = []; m.lists = []; m.liked = false; }
      if (d.pick === 'artist') m.artists = m.artists.includes(d.val) ? m.artists.filter((x) => x !== d.val) : [...m.artists, d.val];
      if (d.pick === 'list') m.lists = m.lists.includes(d.val) ? m.lists.filter((x) => x !== d.val) : [...m.lists, d.val];
      if (d.pick === 'liked') m.liked = !m.liked;
      if (d.pick === 'order') m.order = d.val;
      save(); route(); return;
    }
    if (el.id === 'ou-mixgo') { playList(mixTracks(), { mode: store.mix.order, name: mixName() }); return; }
    if (el.id === 'ou-mixsave') { const l = newList(mixName().replace(/^Mix: /, 'Mix · ')); l.tracks = mixTracks().map((t) => t.url); save(); toast(`Saved “${l.name}”`); }
  });
  view.addEventListener('submit', (e) => {
    e.preventDefault(); const f = e.target;
    if (f.id === 'ou-newlist') { const l = newList($('ou-newname').value); location.hash = `#/playlist/${l.id}`; }
    if (f.dataset.renameform) { const l = listById(f.dataset.renameform); l.name = f.querySelector('input').value.trim().slice(0, 60) || l.name; save(); route(); }
  });

  let tt; const toast = (msg) => { const t = $('ou-toast'); t.textContent = msg; t.hidden = false; clearTimeout(tt); tt = setTimeout(() => { t.hidden = true; }, 2200); };
  const bar = $('st-bar'); const setBarH = () => document.documentElement.style.setProperty('--barh', `${bar.offsetHeight}px`);
  setBarH(); if ('ResizeObserver' in window) new ResizeObserver(setBarH).observe(bar); else window.addEventListener('resize', setBarH);
  route(); hydrate();
}
