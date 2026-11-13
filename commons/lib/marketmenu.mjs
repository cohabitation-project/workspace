// marketmenu.mjs — the one "Cohabi Marketplace ▾" dropdown (Geoffrey, 2026-11-13: "Pages should really just be a drop
// down out of marketplace… that same drop down should be… when your profile, so it's identical").
// The social app menu and the COHABI ▾ menu on Commons/profile pages both call marketMenu(me), so they can't drift.
import { esc } from '../public/md.js';
import * as orgpages from './orgpages.mjs';

/** The pages (band, artist, business) this member runs. Only same-site paths survive. */
export function pagesOf(me) {
  if (!me) return [];
  try {
    return orgpages.managedBy(me.id).map((p) => ({ name: p.name, href: orgpages.href(p) }))
      .filter((p) => p && typeof p.name === 'string' && typeof p.href === 'string' && /^\/(?!\/)/.test(p.href));
  } catch { return []; }
}

export function marketMenu(me) {
  const pages = pagesOf(me);
  return `<details class="cm-sub mk-sub"><summary>🛍 Cohabi Marketplace ▾</summary><a href="/label">Browse the Marketplace</a>${me ? '<a href="/label/new">＋ List something</a>' : ''}${pages.map((p) => `<a class="mk-page" href="${esc(p.href)}">📄 ${esc(p.name)}</a>`).join('')}${me ? '<a href="/page/new">＋ Make a page</a>' : ''}</details>`;
}
