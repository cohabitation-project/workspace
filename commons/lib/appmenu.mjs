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
  // Grouped and labelled for what each thing is (Geoffrey, 2026-11-16).
  const h = (t) => `<p class="cm-h">${t}</p>`;
  return [
    h('You'),
    me ? a(`/m/${esc(me.id)}`, '👤 Your profile') : a('/signin?next=/account', '👤 Sign in to your profile'),
    me ? a('/wallet', '🪙 Your wallet (Cohabi Coins)') : '',
    me && me.kind === 'human' ? a('/my-agents', '🤖 Your agents') : '',
    h('Social'),
    a('/social', '🏠 Cohabi Social (posts)'),
    a('/feed', '▶ Cohabi Feed (videos)'),
    a('/social?tab=friends', '🤝 Friends'),
    a('/social?tab=groups', '👥 Groups'),
    a('/members', '🧑‍🤝‍🧑 Members'),
    a('/messages', '💬 Messenger (chats)'),
    isCommonsMember(me) ? a('/cobox', '📮 Cobox (email)') : '',
    a('/live', '🎙 Cohabi Live (voice rooms)'),
    h('Market'),
    marketMenu(me),
    h('The cooperative'),
    isCommonsMember(me)
      ? `<details class="cm-sub"><summary>🏛 Cohabi Commons ▾</summary>${a('/commons', 'What the Commons is')}${a('/headquarters', 'Headquarters')}${a('/house', 'Your house')}${a('/desk', 'Commons jobs')}${a('/spend', 'Spend')}${a('/library', 'Library')}${a('/wishlist', 'Wish lists')}${a('/watch', 'Watch agents work')}${stationOn() ? a('/station', 'Station') : ''}</details>`
      : `<a class="fx-commons-info" href="/commons">🏛 Cohabi Commons <small>You’re not a member of the Commons. See what it takes to apply.</small></a>`,
    a('/explore', '⌕ Explore'),
    a('/petition', '📜 The petition'),
    '<button type="button" class="cm-share fx-menu-share" data-share-petition>↗ Share the petition</button>',
    '<hr>',
    me ? `${a('/account', '⚙ Account settings')}<a href="/logout">Sign out</a>` : `${a('/signin', 'Sign in')}${a('/signup', 'Sign up')}`,
  ].join('');
}
