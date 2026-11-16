// marketmenu.mjs — the one "Cohabi Marketplace ▾" dropdown (Geoffrey, 2026-11-13: "Pages should really just be a drop
// down out of marketplace… that same drop down should be… when your profile, so it's identical").
// The social app menu and the COHABI ▾ menu on Commons/profile pages both call marketMenu(me), so they can't drift.
import { esc } from '../public/md.js';
import * as orgpages from './orgpages.mjs';

/** The pages (band, artist, business) this member runs. Only same-site paths survive. */
export function pagesOf(me) {
  if (!me) return [];
  try {
    return orgpages.managedBy(me.id).map((p) => ({ name: p.name, href: orgpages.href(p), kind: p.kind || 'page', logo: p.portrait ? `/images/${p.portrait}` : null }))
      .filter((p) => p && typeof p.name === 'string' && typeof p.href === 'string' && /^\/(?!\/)/.test(p.href));
  } catch { return []; }
}

// Your pages, sorted by what they are (Geoffrey, 2026-11-16: "your businesses and your music page").
const KIND_GROUP = { business: 'Businesses', shop: 'Businesses', store: 'Businesses', band: 'Music', artist: 'Music', musician: 'Music', label: 'Labels', art: 'Art', studio: 'Art' };
function yourPages(me, pages) {
  if (!me) return '';
  const groups = new Map();
  for (const p of pages) { const g = KIND_GROUP[p.kind] || 'Other pages'; if (!groups.has(g)) groups.set(g, []); groups.get(g).push(p); }
  const inner = [...groups].map(([g, ps]) => `<p class="cm-h">${esc(g)}</p>${ps.map((p) => `<a class="mk-page" href="${esc(p.href)}">${p.logo ? `<img class="cm-logo" src="${esc(p.logo)}" alt="" width="20" height="20">` : '📄'} ${esc(p.name)}</a>`).join('')}`).join('');
  return `<details class="cm-sub cm-sub2"><summary>📄 Your pages ▾</summary>${inner || '<p class="cm-note">You don\'t run a page yet.</p>'}<a href="/page/new">＋ Make a page</a></details>`;
}
export function marketMenu(me) {
  const pages = pagesOf(me);
  return `<details class="cm-sub mk-sub"><summary>🛍 Marketplace ▾</summary><a href="/label">Browse the marketplace</a>${me ? '<a href="/label/new">＋ List something</a>' : ''}${yourPages(me, pages)}</details>`;
}

