/**
 * profilekinds.mjs — kinds of profile (Geoffrey, 2026-11-07): personal, band / musician, artist / maker, business /
 * services. One identity, one profile; the kind decides what the profile shows and how its shop on the Cohabi Market
 * reads. Shaped after MySpace's band profiles (by research, 2026-11-07): a General Info card (genres, sounds like,
 * influences, record label and type of label, members, location), an Upcoming Shows card, and the music first.
 *
 * Everything here is the member's own words, public, and editable only by them (set_profile, the profile editor, or
 * "@Steward profile <field>: …").
 */
import { esc } from '../public/md.js';

export const KINDS = { personal: 'Personal', band: 'Band / musician', artist: 'Artist / maker', business: 'Business / services' };
export const BADGE = { band: 'Band', artist: 'Artist', business: 'Business', label: 'Label' };
export const SHOP_TAB = { band: 'Music & merch', artist: 'Gallery & shop', business: 'Services', label: 'Releases & merch', personal: 'Storefront' };
export const SHOP_CATEGORY = { band: 'music', artist: 'art', business: 'services', label: 'music', personal: null };
export const LABEL_TYPES = { unsigned: 'Unsigned', indie: 'Indie', major: 'Major', cohabi: 'On the Cohabi Label' };
export const COMMISSIONS = { open: 'Open for commissions', waitlist: 'Waitlist', closed: 'Closed for commissions' };
// the fields each kind uses (location is everyone's)
export const FIELDS = {
  band: ['location', 'genres', 'sounds_like', 'influences', 'record_label', 'label_type', 'members', 'shows'],
  artist: ['location', 'mediums', 'commissions', 'influences'],
  business: ['location', 'services', 'service_area', 'hours'],
  label: ['location', 'genres'],
  personal: ['location'],
};

const fail = (msg) => { const e = new Error(msg); e.status = 400; throw e; };
const clip = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const list = (v, max, each, name) => {
  const arr = (Array.isArray(v) ? v : String(v ?? '').split(/,|\n/)).map((x) => clip(x, each)).filter(Boolean);
  const out = [...new Set(arr)]; if (out.length > max) fail(`${name}: up to ${max}`); return out;
};
const lines = (v) => (Array.isArray(v) ? v : String(v ?? '').split('\n')).map((x) => (typeof x === 'string' ? x.trim() : x)).filter(Boolean);
function checkShow(s, i) {
  const o = typeof s === 'string' ? (([date, venue, city, link]) => ({ date, venue, city, link }))(s.split('|').map((x) => x.trim())) : (s || {});
  const date = String(o.date || '').trim(); if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) fail(`show ${i + 1}: the date must be YYYY-MM-DD`);
  const venue = clip(o.venue, 60); if (!venue) fail(`show ${i + 1}: name the venue`);
  let link = null;
  if (o.link) { try { const u = new URL(String(o.link)); if (u.protocol !== 'https:') throw 0; link = u.href.slice(0, 300); } catch { fail(`show ${i + 1}: the link must start with https://`); } }
  return { date, venue, city: clip(o.city, 40), link };
}
const CHECK = {
  location: (v) => clip(v, 60),
  genres: (v) => list(v, 3, 24, 'genres'),
  sounds_like: (v) => clip(v, 140),
  influences: (v) => clip(v, 300),
  record_label: (v) => clip(v, 60),
  label_type: (v) => { if (!v) return ''; if (!LABEL_TYPES[v]) fail(`label_type: one of ${Object.keys(LABEL_TYPES).join(', ')}`); return v; },
  members: (v) => { const out = lines(v).map((x) => clip(x, 60)).filter(Boolean); if (out.length > 12) fail('members: up to 12'); return out; },
  shows: (v) => { const out = lines(v).map(checkShow); if (out.length > 12) fail('shows: up to 12'); return out.sort((a, b) => (a.date < b.date ? -1 : 1)); },
  mediums: (v) => list(v, 6, 30, 'mediums'),
  commissions: (v) => { if (!v) return ''; if (!COMMISSIONS[v]) fail(`commissions: one of ${Object.keys(COMMISSIONS).join(', ')}`); return v; },
  services: (v) => list(v, 8, 40, 'services'),
  service_area: (v) => clip(v, 80),
  hours: (v) => clip(v, 80),
};
export const INFO_KEYS = Object.keys(CHECK);

/** Validate a change of kind and/or kind details. `merge` keeps fields not given (the Steward sets one at a time). */
export function check({ profile_kind, kind_info } = {}, current = {}, { merge = false } = {}) {
  const patch = {};
  if (profile_kind !== undefined) { if (!KINDS[profile_kind]) fail(`profile_kind: one of ${Object.keys(KINDS).join(', ')}`); patch.profile_kind = profile_kind; }
  if (kind_info !== undefined) {
    if (!kind_info || typeof kind_info !== 'object' || Array.isArray(kind_info)) fail('kind_info must be an object of fields');
    const out = merge ? { ...(current.kind_info || {}) } : {};
    for (const [k, v] of Object.entries(kind_info)) { if (!CHECK[k]) fail(`kind_info: no field "${clip(k, 30)}" (${INFO_KEYS.join(', ')})`); out[k] = CHECK[k](v); }
    patch.kind_info = out;
  }
  return patch;
}

// ------------------------------------------------------------------------------------------ what the profile shows
const kindOf = (m) => (KINDS[m.profile_kind] || m.profile_kind === 'label' ? m.profile_kind : 'personal');
export const shopTab = (m) => SHOP_TAB[kindOf(m)];
export const shopCategory = (m) => SHOP_CATEGORY[kindOf(m)];
export const isShopKind = (m) => kindOf(m) !== 'personal';
export const badgeHTML = (m) => (BADGE[kindOf(m)] ? `<span class="pf-kind">${BADGE[kindOf(m)]}</span>` : '');

/** The MySpace-style General Info card, and a band's Upcoming Shows. */
export function infoCards(m) {
  const k = kindOf(m); const i = m.kind_info || {};
  if (k === 'personal') return i.location ? `<div class="pf-card pf-info"><h2>General info</h2><dl><dt>Location</dt><dd>${esc(i.location)}</dd></dl></div>` : '';
  const row = (t, v) => (v && (!Array.isArray(v) || v.length) ? `<dt>${t}</dt><dd>${Array.isArray(v) ? v.map(esc).join(', ') : esc(v)}</dd>` : '');
  const rows = k === 'band'
    ? row('Genre', i.genres) + row('Location', i.location) + (i.members?.length ? `<dt>Members</dt><dd><ul class="pf-bandmembers">${i.members.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></dd>` : '') + row('Influences', i.influences) + row('Sounds like', i.sounds_like) + row('Record label', i.record_label) + row('Type of label', LABEL_TYPES[i.label_type])
    : k === 'label'
      ? row('Genres', i.genres) + row('Location', i.location)
    : k === 'artist'
      ? row('Mediums', i.mediums) + row('Commissions', COMMISSIONS[i.commissions]) + row('Location', i.location) + row('Influences', i.influences)
      : row('What we do', i.services) + row('Service area', i.service_area) + row('Hours', i.hours) + row('Location', i.location);
  const today = new Date().toISOString().slice(0, 10);
  const shows = k === 'band' ? (i.shows || []).filter((s) => s.date >= today) : [];
  return `<div class="pf-card pf-info"><h2>${esc(m.name)}'s general info</h2>${rows ? `<dl>${rows}</dl>` : '<p class="small muted">Nothing written here yet.</p>'}</div>`
    + (k === 'band' ? `<div class="pf-card pf-shows"><h2>Upcoming shows</h2>${shows.length ? `<ul>${shows.map((s) => `<li><span class="pf-showdate">${esc(new Date(s.date + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }))}</span> <strong>${s.link ? `<a href="${esc(s.link)}" rel="nofollow noopener">${esc(s.venue)}</a>` : esc(s.venue)}</strong>${s.city ? ` <span class="muted small">${esc(s.city)}</span>` : ''}</li>`).join('')}</ul>` : '<p class="small muted">No upcoming shows.</p>'}</div>` : '');
}

/** The editor section: choose a kind, then its fields (profile.js shows only the chosen kind's fields). */
export function editorSection(m) {
  const k = kindOf(m); const i = m.kind_info || {};
  const opt = (obj, cur, blank = null) => (blank ? `<option value="">${blank}</option>` : '') + Object.entries(obj).map(([v, n]) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(n)}</option>`).join('');
  const f = (key, label, html) => `<label class="pf-kf" data-kf="${key}">${label}${html}</label>`;
  const txt = (key, max, ph = '') => `<input name="kf-${key}" maxlength="${max}" value="${esc(Array.isArray(i[key]) ? i[key].join(', ') : i[key] || '')}"${ph ? ` placeholder="${esc(ph)}"` : ''}>`;
  const area = (key, rows, ph, val) => `<textarea name="kf-${key}" rows="${rows}" placeholder="${esc(ph)}">${esc(val)}</textarea>`;
  return `<details${isShopKind(m) ? ' open' : ''}><summary>Profile type: band, artist, business</summary>
    <p class="small">Choose what kind of profile this is. It changes what your page shows and how your shop reads in the market. You can change it any time.</p>
    <label>This profile is<select name="profile_kind" id="pf-kind">${opt(KINDS, k)}</select></label>
    ${f('location', 'Location <span class="hint">(up to 60)</span>', txt('location', 60, 'Sierra Vista, AZ'))}
    ${f('genres', 'Genres <span class="hint">(up to 3, separated by commas)</span>', txt('genres', 80, 'ambient, folk, hip hop'))}
    ${f('members', 'Members <span class="hint">(one per line: name and role)</span>', area('members', 3, 'Geoffrey David: vocals, guitar', (i.members || []).join('\n')))}
    ${f('sounds_like', 'Sounds like <span class="hint">(up to 140)</span>', txt('sounds_like', 140, 'rain on a tin roof at 3am'))}
    ${f('influences', 'Influences <span class="hint">(up to 300)</span>', txt('influences', 300))}
    ${f('record_label', 'Record label', txt('record_label', 60, 'Last of the Real Estate'))}
    ${f('label_type', 'Type of label', `<select name="kf-label_type">${opt(LABEL_TYPES, i.label_type, '(not set)')}</select>`)}
    ${f('shows', 'Upcoming shows <span class="hint">(one per line: YYYY-MM-DD | venue | city | https:// link)</span>', area('shows', 3, '2026-12-05 | The Sunday Room | Tucson, AZ | https://…', (i.shows || []).map((s) => [s.date, s.venue, s.city, s.link].filter((x, j) => x || j < 3).join(' | ')).join('\n')))}
    ${f('mediums', 'Mediums <span class="hint">(up to 6, separated by commas)</span>', txt('mediums', 200, 'oil paint, woodwork, pixel art'))}
    ${f('commissions', 'Commissions', `<select name="kf-commissions">${opt(COMMISSIONS, i.commissions, '(not set)')}</select>`)}
    ${f('services', 'What you offer <span class="hint">(up to 8, separated by commas)</span>', txt('services', 340, 'websites, mixing, 3D printing'))}
    ${f('service_area', 'Service area <span class="hint">(up to 80)</span>', txt('service_area', 80, 'online, worldwide'))}
    ${f('hours', 'Hours <span class="hint">(up to 80)</span>', txt('hours', 80, 'weekdays, 9 to 5 Arizona time'))}
  </details>`;
}
