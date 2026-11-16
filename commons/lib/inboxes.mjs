/**
 * Cobox's inboxes (Geoffrey, 2026-11-16): "the social, the marketplace, groups … those should all be the actual
 * inboxes for each part … so you can check your mail and your social and everything all from one place."
 *
 * One read for the signed-in member, built from records that already exist. Nothing new is stored, and each item
 * links back to where it lives (a thread, a post, a listing question). Only things addressed to this member are
 * included: their messages, notifications on their own posts, questions on their own listings, posts in groups
 * they belong to.
 */
import * as inbox from './inbox.mjs';
import * as posts from './posts.mjs';
import * as market from './market.mjs';
import * as groups from './groups.mjs';
import * as friends from './friends.mjs';
import * as orgpages from './orgpages.mjs';

const VERB = { reaction: (n) => `reacted ${n.emoji || ''} to your post`, comment: () => 'commented on your post', reply: () => 'replied to your comment', tag: (n) => `tagged you in a ${n.comment ? 'comment' : 'post'}`, credit: () => 'credited you as the maker of an image', share: () => 'shared a post with you', group: (n) => `posted to @${n.group}` };
const item = ({ id, who, title, text = '', ts, href, unread = false }) => ({ id, who: who ? { id: who.id || null, name: who.name || '' } : null, title, text: String(text || '').slice(0, 160), ts, href, unread: !!unread });
const safe = (fn, fallback) => { try { return fn(); } catch { return fallback; } };

export function forMember(me, { seenSocial = '' } = {}) {
  // Social: private messages, what happened on your posts, and friend requests.
  const threads = safe(() => inbox.list(me), []);
  const messages = threads.slice(0, 40).map((t) => item({ id: `m:${t.id}`, who: t.peer, title: t.peer?.name || 'Conversation', text: t.last?.text || (t.requestForMe ? 'Wants to message you' : ''), ts: t.last?.ts || t.created, href: `/messages?thread=${encodeURIComponent(t.id)}`, unread: t.unread > 0 || t.requestForMe }));
  const notes = safe(() => posts.notificationsFor(me.id, { limit: 40 }), []).filter((n) => VERB[n.type]).map((n) => item({ id: `n:${n.type}:${n.post}:${n.comment || ''}:${n.by.id}:${n.ts}`, who: n.by, title: `${n.by.name} ${VERB[n.type](n)}`, text: n.snippet || '', ts: n.ts, href: `/p/${encodeURIComponent(n.post)}`, unread: n.ts > seenSocial }));
  const requests = safe(() => friends.mine(me).incoming, []).map((r) => item({ id: `f:${r.id}`, who: r.from, title: `${r.from.name} asked to be your friend`, ts: r.ts, href: '/members', unread: true }));

  // Marketplace: questions and answers on listings, sorted into the pages you run (and "you" for your own listings).
  const asks = safe(() => market.notificationsFor(me.id, { limit: 80 }), []);
  const pageOf = new Map(); for (const a of asks) { if (!pageOf.has(a.listing)) pageOf.set(a.listing, safe(() => market.get(a.listing)?.page || null, null)); }
  const marketItem = (a) => item({ id: `q:${a.ask}`, who: a.by, title: a.type === 'market-answer' ? `${a.by.name} answered you on “${a.title}”` : `${a.by.name} asked about “${a.title}”`, text: a.snippet, ts: a.ts, href: `/label/l/${encodeURIComponent(a.listing)}#${encodeURIComponent(a.ask)}`, unread: false });
  const myPages = safe(() => orgpages.managedBy(me.id), []);
  const pages = myPages.map((p) => ({ id: p.id, name: p.name, href: orgpages.href(p), logo: p.portrait ? `/images/${p.portrait}` : null, items: asks.filter((a) => pageOf.get(a.listing)?.id === p.id).map(marketItem) }));
  const own = asks.filter((a) => !pageOf.get(a.listing) || !myPages.some((p) => p.id === pageOf.get(a.listing)?.id)).map(marketItem);

  // Groups: recent posts in each group you belong to, not counting your own.
  const mine = safe(() => groups.list().filter((g) => g.members.some((x) => x.id === me.id)), []);
  const groupBoxes = mine.map((g) => ({ id: g.id, name: g.name, href: `/g/${encodeURIComponent(g.id)}`, items: safe(() => posts.list({ group: g.id, limit: 30 }), []).filter((p) => p.by !== me.id).map((p) => item({ id: `g:${p.id}`, who: { id: p.by, name: p.by_name }, title: `${p.by_name} posted in ${g.name}`, text: p.text, ts: p.ts, href: `/p/${encodeURIComponent(p.id)}` })) }));

  return {
    social: { messages, notifications: notes, requests },
    market: { yours: own, pages },
    groups: groupBoxes,
  };
}
