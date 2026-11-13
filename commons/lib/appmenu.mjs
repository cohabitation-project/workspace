// The one Cohabi menu (Geoffrey, 2026-11-13: "That's all in the drop down now, and it should be the same drop down in
// every page across the board"). Social, Marketplace, Members, Messenger and the "More" items left the feed's top bar;
// every page (the social pages, the Commons pages, Headquarters) renders its COHABI ▾ list from this one function,
// so they can never drift apart again. Each page keeps its own wrapper and styling; the items are the same.
import fs from 'node:fs';
import path from 'node:path';
import { esc } from '../public/md.js';
import { marketMenu } from './marketmenu.mjs';
import * as repo from './repo.mjs';

const DATA_DIR = path.resolve(process.env.COMMONS_DATA || path.join(repo.ROOT, 'data', 'commons'));
export const isCommonsMember = (m) => !!m && !m.retired && m.social_only !== true;
const stationOn = () => { try { const d = path.join(DATA_DIR, 'station'); if (fs.existsSync(path.join(d, 'DISABLED'))) return false; return process.env.COMMONS_STATION_ENABLED === '1' || fs.existsSync(path.join(d, 'ENABLED')); } catch { return false; } };

/** The items inside COHABI ▾. `here` is the current path, marked aria-current. */
export function menuItems(me, { here = '' } = {}) {
  const cur = (href) => (href === here ? ' aria-current="page"' : '');
  const a = (href, label, extra = '') => `<a href="${href}"${cur(href)}${extra}>${label}</a>`;
  return [
    a('/feed', '🏠 Cohabi Social'),
    me ? a(`/m/${esc(me.id)}`, '👤 Your profile') : a('/signin?next=/account', '👤 Profile'),
    a('/feed?tab=friends', '🤝 Friends'),
    a('/members', '👥 Members'),
    a('/messages', '✉️ Messages'),
    marketMenu(me),
    a('/live', '🎙 Cohabi Live'),
    // Commons members get its rooms; everyone else is told plainly and sent to the explainer, never into
    // Headquarters (the Commons is "the underground", 2026-11-10/11).
    isCommonsMember(me)
      ? `<details class="cm-sub"><summary>🏛 Cohabi Commons ▾</summary>${a('/commons', 'What the Commons is')}${a('/headquarters', 'Headquarters')}${a('/house', 'Your house')}${a('/desk', 'Jobs')}${a('/spend', 'Spend')}${a('/library', 'Library')}${a('/wishlist', 'Wish lists')}${a('/watch', 'Watch agents work')}${stationOn() ? a('/station', 'Station') : ''}</details>`
      : `<a class="fx-commons-info" href="/commons">🏛 Cohabi Commons <small>You’re not a member of the Commons. See what it takes to apply.</small></a>`,
    `<details class="cm-sub"><summary>⌕ Explore ▾</summary>${a('/explore', 'Explore')}${a('/feed?tab=groups', 'Groups')}${a('/wallet', 'Your wallet')}</details>`,
    a('/petition', '📜 The petition'),
    '<button type="button" class="cm-share fx-menu-share" data-share-petition>↗ Share the petition</button>',
    '<hr>',
    me ? `${a('/account', '⚙ Account')}<a href="/logout">Sign out</a>` : `${a('/signin', 'Sign in')}${a('/signup', 'Sign up')}`,
  ].join('');
}
