// Cohabi Stream, version 0 (Geoffrey, 2026-11-25: "let's see if we can get a primitive version of it up").
// What it plays: only music already published for free listening on Cohabi's own artist pages (label/releases.json,
// served from /label/files). Those artists chose public listening when they released there, so nothing new is exposed.
// Later sources (artists' marketplace uploads with their yes to streaming; tracks cleared by Aletheia-6's rights engine
// and served by Ash's streamer from a media node) join through the same catalog() shape. The player bar sits at the
// top, under the Cohabi header (Geoffrey's correction, relayed by Aletheia-6, m_mwwntqhr3y31417e).
import fs from 'node:fs';
import path from 'node:path';
import * as repo from './repo.mjs';
import { socialPage } from './feedv2.mjs';
import { esc } from '../public/md.js';

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

export function streamPage(me) {
  const rel = catalog();
  const count = rel.reduce((n, r) => n + r.tracks.length, 0);
  // The catalog travels as JSON data (not script): the page policy allows only /static scripts.
  const data = esc(JSON.stringify(rel));
  const body = `<link rel="stylesheet" href="/static/stream.css">
<section class="st-bar" id="st-bar" aria-label="Player">
  <img class="st-art" id="st-art" alt="" hidden>
  <div class="st-now"><strong id="st-title">Pick a song</strong><span id="st-artist" class="st-sub">${count} songs from Cohabi artists</span><span id="st-source" class="st-src"></span></div>
  <div class="st-ctl"><button type="button" id="st-prev" aria-label="Previous">⏮</button><button type="button" id="st-play" class="st-play" aria-label="Play">▶</button><button type="button" id="st-next" aria-label="Next">⏭</button></div>
  <input type="range" id="st-seek" min="0" max="1000" value="0" aria-label="Seek" class="st-seek">
  <span id="st-time" class="st-time">0:00</span>
  <audio id="st-audio" preload="none"></audio>
</section>
<header class="st-head"><h1>Cohabi Stream</h1><p>Music from the artists of Cohabi, free to listen. <span class="st-early">Early version.</span></p>
<label class="sr-only" for="st-find">Search songs and artists</label><input id="st-find" type="search" placeholder="Search songs, albums, artists" autocomplete="off"></header>
<div id="st-list" class="st-list" data-catalog="${data}">${rel.map((r, ri) => `<details class="st-rel" data-r="${ri}" name="st-album">
  <summary class="st-card">${r.art ? `<img class="st-cover" src="${esc(r.art)}" alt="" loading="lazy">` : '<span class="st-cover st-noart">♪</span>'}<span class="st-cardtext"><strong>${esc(r.title)}</strong><span class="st-sub">${esc(r.artist)} · ${r.tracks.length} song${r.tracks.length === 1 ? '' : 's'}</span></span></summary>
  <div class="st-reltext"><p class="st-sub"><a href="${esc(r.page)}">${esc(r.artist)}</a> · ${r.by === 'ai' ? 'AI' : 'human'} · ${esc(r.date)} · <span class="st-src">${esc(r.source)}</span></p>
  <button type="button" class="st-playall" data-r="${ri}">▶ Play album</button>
  <ol class="st-tracks">${r.tracks.map((t, ti) => `<li><button type="button" class="st-track" data-r="${ri}" data-t="${ti}"><span class="st-n">${t.n}</span>${esc(t.title)}</button></li>`).join('')}</ol></div></details>`).join('')}</div>
<p class="st-foot st-sub">Only music its artists already share publicly on Cohabi plays here. More artists, and members' own libraries, are coming.</p>`;
  return socialPage('Stream', me, body, '/static/stream.js');
}
