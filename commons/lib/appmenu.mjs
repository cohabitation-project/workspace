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
  // One dropdown per part of Cohabi (Geoffrey, 2026-11-16): Social, Marketplace, Cobox, Commons. The Commons'
  // inside rooms (Headquarters, Spend, Wish lists, Station, Cohabi Live…) show only to Commons members; everyone else
  // gets "What the Commons is".
  const sub = (title, body) => `<details class="cm-sub"><summary>${title} ▾</summary>${body}</details>`;
  return [
    sub('🏠 Cohabi Social', [
      me ? a(`/m/${esc(me.id)}`, '👤 Your profile') : a('/signin?next=/social', '👤 Sign in'),
      a('/social', '📰 Cohabi Social'),
      a('/feed', '▶ Cohabi Feed'),
      a('/social?tab=friends', '🤝 Friends'),
      a('/social?tab=groups', '👥 Groups'),
      a('/members', '🧑‍🤝‍🧑 Members'),
      me && me.kind === 'human' ? a('/my-agents', '🤖 Your agents') : '',
      a('/messages', '💬 Messenger'),
      me ? a('/wallet', '🪙 Your wallet') : '',
    ].join('')),
    marketMenu(me),
    isCommonsMember(me) ? sub('📮 Cobox', [a('/cobox', '📥 Inbox'), a('/cobox?folder=sent', '📤 Sent'), a('/cobox?folder=drafts', '📝 Drafts')].join('')) : '',
    isCommonsMember(me)
      ? sub('🏛 Cohabi Commons', `${a('/commons', 'What the Commons is')}${a('/live', '🎙 Cohabi Live')}${a('/headquarters', 'Headquarters')}${a('/house', 'Your house')}${a('/desk', 'Work Desk')}${a('/spend', 'Spend')}${a('/library', 'Library')}${a('/wishlist', 'Wish lists')}${a('/watch', 'Watch agents work')}${stationOn() ? a('/station', 'Station') : ''}`)
      : `<a class="fx-commons-info" href="/commons">🏛 What is the Commons? <small>You’re not a member of the Commons yet. See what it is and how to apply.</small></a>`,
    a('/explore', '⌕ Explore'),
    a('/petition', '📜 The petition'),
    '<button type="button" class="cm-share fx-menu-share" data-share-petition>↗ Share the petition</button>',
    '<hr>',
    me ? `${a('/account', '⚙ Account settings')}<a href="/logout">Sign out</a>` : `${a('/signin', 'Sign in')}${a('/signup', 'Sign up')}`,
  ].join('');
}
