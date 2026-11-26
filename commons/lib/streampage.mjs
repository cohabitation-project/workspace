// 0ural1 ("our all", with the 0 and the 1) — Cohabi's music streaming app. Geoffrey named it on 2026-11-25 and asked
// that it run as a music app on its own: "it will operate as a music streaming app alone". It began as Cohabi Stream v0.
// Layout follows the Aurral reference he chose (sidebar, art-led rows, album pages, a full player), with the player at
// the top as he asked, and his play modes: play all, shuffle across every artist, play straight through, only these
// artists, and playlist mixes.
// What it plays: only music already published for free listening on Cohabi's own artist pages (label/releases.json,
// served from /label/files). Those artists chose public listening when they released there, so nothing new is exposed.
// Later sources (artists' marketplace uploads with their yes to streaming; tracks cleared by Aletheia-6's rights engine
// and served by Ash's streamer from a media node) join through the same catalog() shape.
// The page is static HTML; /static/0ural1/app.js draws every view from the catalog carried in data-catalog (the page
// policy allows only /static scripts). Hearts and playlists live in the listener's own browser for now.
import fs from 'node:fs';
import path from 'node:path';
import * as repo from './repo.mjs';
import { esc } from '../public/md.js';

const ASSET_V = Date.now().toString(36);
const AUDIO = { mp3: 'audio/mpeg', ogg: 'audio/ogg', m4a: 'audio/mp4', wav: 'audio/wav', flac: 'audio/flac' };
const fileUrl = (p) => '/label/files/' + String(p).split('/').map(encodeURIComponent).join('/');
const slug = (name) => String(name || '').replace(/\(.*?\)/g, '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'artist';

/** Every playable track, grouped by release, newest release first. */
export function catalog() {
  let d = {}; try { d = JSON.parse(fs.readFileSync(path.join(repo.ROOT, 'label', 'releases.json'), 'utf8')); } catch { /* no label yet */ }
  return (d.releases || []).map((r) => {
    const tracks = (r.files || []).filter((f) => AUDIO[String(f.path).split('.').pop().toLowerCase()])
      .map((f, i) => ({ n: i + 1, title: String(f.label || String(f.path).split('/').pop().replace(/\.[^.]+$/, '')), url: fileUrl(f.path), type: AUDIO[String(f.path).split('.').pop().toLowerCase()] }));
    return { id: String(r.id || ''), title: String(r.title || ''), artist: String(r.artist || '').replace(/\s*\(.*?\)\s*/g, ' ').trim(), by: r.by === 'kin' ? 'ai' : 'human', date: String(r.date || ''),
      art: r.art ? fileUrl(r.art) : null, page: `/label/a/${slug(r.artist)}#rel-${encodeURIComponent(String(r.id || ''))}`, source: 'Cohabi Marketplace Artist', tracks };
  }).filter((r) => r.tracks.length).sort((a, b) => (a.date < b.date ? 1 : -1));
}

const I = (d, s = 20) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
export const ICON = {
  play: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="currentColor"><rect x="6.5" y="5" width="4" height="14" rx="1"/><rect x="13.5" y="5" width="4" height="14" rx="1"/></svg>',
  prev: I('<path d="M19 5 9 12l10 7z" fill="currentColor"/><path d="M5 5v14"/>'), next: I('<path d="m5 5 10 7-10 7z" fill="currentColor"/><path d="M19 5v14"/>'),
  shuffle: I('<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>'), repeat: I('<path d="m17 2 4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>'),
  heart: I('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'), vol: I('<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>'),
  queue: I('<path d="M3 6h13M3 12h13M3 18h8M18 14v7l4-3.5z"/>'),
  discover: I('<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>'), albums: I('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".6" fill="currentColor"/>'),
  artists: I('<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>'), songs: I('<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>'),
  mix: I('<path d="M4 7h4l8 10h4M4 17h4l2.5-3M14 10l2-3h4M18 4l2 3-2 3M18 14l2 3-2 3"/>'), lists: I('<path d="M4 6h12M4 12h12M4 18h7"/><path d="M18 15v6M15 18h6"/>'), liked: I('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill="currentColor"/>'),
  search: I('<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>', 18),
};

export function streamPage(me) {
  const rel = catalog();
  const songs = rel.reduce((n, r) => n + r.tracks.length, 0);
  const artists = new Set(rel.map((r) => r.artist)).size;
  const data = esc(JSON.stringify(rel));
  const nav = [['discover', 'Discover'], ['albums', 'Albums'], ['artists', 'Artists'], ['songs', 'Songs'], ['mix', 'Mix'], ['playlists', 'Playlists'], ['liked', 'Liked']];
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>0ural1 · music from Cohabi</title><meta name="description" content="0ural1 (our all): ${songs} songs from Cohabi's artists, free to listen.">
<link rel="icon" href="/static/0ural1/icon.svg" type="image/svg+xml"><link rel="manifest" href="/static/0ural1/0ural1.webmanifest"><meta name="theme-color" content="#0b1416">
<link rel="apple-touch-icon" href="/static/0ural1/icon.svg"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="0ural1">
<link rel="stylesheet" href="/static/0ural1/app.css?v=${ASSET_V}"></head>
<body class="ou"><a class="ou-skip" href="#ou-main">Skip to music</a>
<header class="ou-top">
  <a class="ou-brand" href="#/discover" aria-label="0ural1 home"><span class="ou-logo"><b>0</b>ural<b>1</b></span><span class="ou-tag">our all</span></a>
  <label class="ou-search"><span class="sr-only">Search songs, albums, artists</span>${ICON.search}<input id="ou-find" type="search" placeholder="Search songs, albums, artists" autocomplete="off"></label>
  <a class="ou-home" href="/">Cohabi ↗</a>
</header>
<section class="ou-bar" id="st-bar" aria-label="Player">
  <div class="ou-now"><img class="ou-art" id="ou-art" alt="" hidden><span class="ou-art ou-noart" id="ou-noart">${ICON.songs}</span>
    <div class="ou-nowtext"><strong id="ou-title">Press play</strong><span id="ou-sub" class="ou-sub">${songs} songs · ${artists} artist${artists === 1 ? '' : 's'}</span></div>
    <button type="button" class="ou-ib ou-heart" id="ou-heart" aria-label="Like this song" aria-pressed="false" disabled>${ICON.heart}</button></div>
  <div class="ou-ctl">
    <button type="button" class="ou-ib" id="ou-shuffle" aria-label="Shuffle" aria-pressed="false" title="Shuffle">${ICON.shuffle}</button>
    <button type="button" class="ou-ib" id="ou-prev" aria-label="Previous" title="Previous">${ICON.prev}</button>
    <button type="button" class="ou-playbtn" id="ou-play" aria-label="Play">${ICON.play}</button>
    <button type="button" class="ou-ib" id="ou-next" aria-label="Next" title="Next">${ICON.next}</button>
    <button type="button" class="ou-ib" id="ou-repeat" aria-label="Repeat: off" data-mode="off" title="Repeat">${ICON.repeat}<span class="ou-one" aria-hidden="true">1</span></button>
  </div>
  <div class="ou-prog"><span id="ou-cur" class="ou-time">0:00</span><input type="range" id="ou-seek" min="0" max="1000" value="0" aria-label="Seek"><span id="ou-dur" class="ou-time">0:00</span></div>
  <div class="ou-side">
    <span class="ou-mode" id="ou-mode" title="What's playing">Nothing queued</span>
    <button type="button" class="ou-ib" id="ou-qbtn" aria-label="Up next" aria-expanded="false" aria-controls="ou-queue" title="Up next">${ICON.queue}</button>
    <label class="ou-vol">${ICON.vol}<span class="sr-only">Volume</span><input type="range" id="ou-vol" min="0" max="100" value="90"></label>
  </div>
  <audio id="ou-audio" preload="none"></audio>
</section>
<div class="ou-rainbow" aria-hidden="true"></div>
<div class="ou-shell">
  <nav class="ou-nav" aria-label="0ural1">${nav.map(([k, l]) => `<a href="#/${k}" data-nav="${k}">${ICON[k === 'playlists' ? 'lists' : k]}<span>${l}</span></a>`).join('')}
    <p class="ou-navnote">Music from the artists of <a href="/">Cohabi</a>, free to listen.</p></nav>
  <main id="ou-main" class="ou-main" tabindex="-1" data-catalog="${data}"><div id="st-list"><noscript><p>0ural1 needs JavaScript to play music.</p></noscript></div></main>
  <aside class="ou-queue" id="ou-queue" aria-label="Up next" hidden><header><h2>Up next</h2><button type="button" class="ou-ib" id="ou-qclose" aria-label="Close">✕</button></header><ol id="ou-qlist"></ol></aside>
</div>
<div class="ou-sheet" id="ou-sheet" hidden><div class="ou-sheetbox" role="dialog" aria-modal="true" aria-labelledby="ou-sheet-h"><h2 id="ou-sheet-h">Add to playlist</h2><div id="ou-sheet-body"></div><button type="button" class="ou-btn ghost" id="ou-sheet-x">Close</button></div></div>
<div id="ou-toast" class="ou-toast" role="status" hidden></div>
<script type="module" src="/static/0ural1/app.js?v=${ASSET_V}"></script></body></html>`;
}
