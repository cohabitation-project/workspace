/**
 * stock.mjs: free stock footage for making videos (Geoffrey, 2026-11-21: "we need some type of library of stock
 * footage for agents to be able to create"). Searches Pixabay's video library and copies a chosen clip into our own
 * video store, credited to its maker. Pixabay because Pexels has paused new API keys (checked Nov 21).
 *
 * Pixabay's rules we follow: search results are cached 24 hours; we never hotlink, the clip is copied here; the key
 * (PIXABAY_KEY, server .env) stays on the server. Content: Pixabay Content License (free use, commercial included);
 * we still record the maker and the Pixabay page on every import. Tests point PIXABAY_API_URL at a stand-in.
 */
import { CommonsError } from './core.mjs';
import * as videos from './videos.mjs';

const fail = (s, m) => { throw new CommonsError(s, m); };
const env = (k) => (process.env[k] || '').trim();
export const configured = () => !!env('PIXABAY_KEY');
const base = () => env('PIXABAY_API_URL') || 'https://pixabay.com/api';
const DAY = 24 * 3600_000;
const cache = new Map();       // query -> { at, hits }
const byId = new Map();        // pixabay id -> hit (from any cached search)
const searches = new Map();    // member id -> recent search timestamps
export function resetCache() { cache.clear(); byId.clear(); searches.clear(); }

const shape = (h) => {
  const v = h.videos || {};
  const pick = ['small', 'medium', 'tiny'].map((k) => v[k]).find((x) => x?.url);
  return { id: String(h.id), tags: String(h.tags || ''), seconds: Number(h.duration) || null, by: h.user || 'Pixabay contributor', page: h.pageURL || null,
    thumb: v.tiny?.thumbnail || v.small?.thumbnail || v.medium?.thumbnail || null, width: pick?.width || null, height: pick?.height || null, bytes: pick?.size || null, file: pick?.url || null };
};
const pub = ({ file, ...h }) => h; // the download address is ours to fetch, not the browser's

async function api(params) {
  if (!configured()) fail(503, "Stock footage isn't connected yet (the Pixabay key isn't on this server).");
  const u = new URL(`${base()}/videos/`); u.searchParams.set('key', env('PIXABAY_KEY'));
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));
  let r; try { r = await fetch(u, { signal: AbortSignal.timeout(15_000) }); } catch { fail(502, "Couldn't reach the stock library. Try again in a minute."); }
  if (r.status === 429) fail(429, 'The stock library is busy. Try again in a minute.');
  const j = await r.json().catch(() => null);
  if (!r.ok || !j) fail(502, `The stock library said no (${r.status}).`);
  return j;
}

/** Search clips. Cached 24 hours per query, as Pixabay asks. */
export async function search(member, q, { vertical = false } = {}) {
  if (!member) fail(401, 'Sign in to search stock footage.');
  const query = String(q || '').trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 100);
  if (query.length < 2) fail(400, 'Say what you are looking for, e.g. "ocean at sunset".');
  const now = Date.now(); const mine = (searches.get(member.id) || []).filter((t) => now - t < 60_000);
  if (mine.length >= 20) fail(429, '20 stock searches a minute. Try again in a moment.');
  const key = `${query}|${vertical ? 'v' : 'a'}`;
  let c = cache.get(key);
  if (!c || now - c.at > DAY) {
    mine.push(now); searches.set(member.id, mine);
    const j = await api({ q: query, per_page: 24, safesearch: 'true', ...(vertical ? { orientation: 'vertical' } : {}) });
    c = { at: now, hits: (j.hits || []).map(shape).filter((h) => h.file && (h.seconds == null || h.seconds <= videos.MAX_SECONDS)) };
    cache.set(key, c); for (const h of c.hits) byId.set(h.id, h);
  }
  return { query, source: 'Pixabay', note: 'Free stock footage from Pixabay. Each clip is copied into Cohabi with its maker credited.', hits: c.hits.map(pub) };
}

const allowedHost = (u) => /(^|\.)pixabay\.com$/i.test(u.hostname) || (env('COMMONS_TEST_ASSETS') === '1' && u.hostname === '127.0.0.1');

/** Copy one clip into the member's videos, credited. Returns the new video. */
export async function importClip(member, id) {
  if (!member) fail(401, 'Sign in to use stock footage.');
  const sid = String(id || '').replace(/[^0-9]/g, '').slice(0, 20); if (!sid) fail(400, 'Which clip?');
  let h = byId.get(sid);
  if (!h) { const j = await api({ id: sid }); const hit = (j.hits || [])[0]; if (!hit) fail(404, 'No such clip.'); h = shape(hit); byId.set(sid, h); }
  if (!h.file) fail(404, 'That clip has no downloadable file.');
  if (h.seconds != null && h.seconds > videos.MAX_SECONDS) fail(413, `Clips can be up to ${videos.MAX_SECONDS / 60} minutes.`);
  // Kimi's review of #296, note 2: a clip of unknown length is taken only when the server can measure it (videos.upload
  // refuses one over the limit after ffprobe reads it).
  if (h.seconds == null && !videos.canProbe()) fail(422, "The stock library didn't say how long that clip is, so it can't be checked. Pick another.");
  let u; try { u = new URL(h.file); } catch { fail(502, 'The stock library sent an unreadable address.'); }
  if (!allowedHost(u)) fail(502, 'That clip is not on the stock library\'s own servers.');
  // Kimi's NO on #296: redirects are followed by hand, at most 3, and each new address is checked BEFORE it is asked
  // for, so nothing off the stock library's own servers is ever requested.
  let r;
  for (let hop = 0; ; hop++) {
    try { r = await fetch(u, { redirect: 'manual', signal: AbortSignal.timeout(60_000) }); } catch { fail(502, "Couldn't download the clip. Try again."); }
    if (r.status < 300 || r.status > 399) break;
    const loc = r.headers.get('location'); try { await r.body?.cancel(); } catch { /* nothing to read */ }
    if (!loc || hop >= 3) fail(502, 'The stock library sent the download round too many turns.');
    let next; try { next = new URL(loc, u); } catch { fail(502, 'The stock library sent an unreadable address.'); }
    if (!allowedHost(next)) fail(502, 'The clip download was redirected off the stock library.');
    u = next;
  }
  if (!r.ok) fail(502, `The stock library answered ${r.status} for that clip.`);
  const len = Number(r.headers.get('content-length') || 0); if (len > videos.MAX_BYTES) fail(413, 'That clip is too large.');
  const buf = Buffer.from(await r.arrayBuffer()); if (buf.length > videos.MAX_BYTES) fail(413, 'That clip is too large.');
  const credit = `Stock footage by ${h.by} on Pixabay${h.page ? ` (${h.page})` : ''}`;
  return { ...videos.upload(member, buf, { type: 'video/mp4', alt: (h.tags || 'stock footage').slice(0, 300), credit }), credit, source: { name: 'Pixabay', id: sid, page: h.page, by: h.by } };
}
