// sellpost.mjs — sell or offer something straight from the feed composer (Geoffrey via Aletheia-6, 2026-11-21:
// "the social feed composer is the primary creation interface ... ONE publish action must persist the canonical
// Marketplace listing and a linked social post together, so there is never a manual 'list first, then post' step").
//
// The listing (lib/market.mjs) is the one record of the thing on offer: its storefront, its price, its status.
// The post (lib/posts.mjs) only points at it (post.listing), so editing or withdrawing the listing shows in the
// feed at once and nothing is copied twice.
//
// One publish, made safe to retry: the composer sends a one-time `key`. The listing is written first, carrying
// origin.key; then the post, carrying sell_key. A retry with the same key finds what already exists and finishes
// the half that's missing, so a dropped connection never makes a second listing or a second post. The post's
// fields are checked before anything is written (posts.create dry_run). If writing the post still fails, the new listing is
// withdrawn, so there is never a live store item with no post.
import * as market from './market.mjs';
import * as posts from './posts.mjs';
import * as fulfillment from './fulfillment.mjs';

const fail = (status, msg) => { const e = new Error(msg); e.status = status; throw e; };
const KEY = /^[A-Za-z0-9_-]{8,64}$/;

export function sellFromFeed(member, { key, post = {}, listing = {}, merch = null } = {}) {
  if (!member) fail(401, 'sign in to sell or offer something');
  if (!KEY.test(String(key || ''))) fail(400, 'key: the composer sends a one-time key (8 to 64 letters, digits, - or _)');
  const text = String(post.text ?? listing.text ?? '').trim();
  const images = Array.isArray(post.images) ? post.images.map(String) : [];
  // 1. a retry: both halves already made → the same answer again
  let l = market.byOrigin(member.id, key);
  const existing = posts.bySellKey(member.id, key);
  if (l && existing) return { listing: l, post: existing, merch: fulfillment.merchFor(l.id), repeated: true };
  if (existing && !l) fail(409, 'this key already made a post without its listing; start a new post');
  if (l && l.status !== 'live') fail(409, 'this listing was taken down after a failed post; start a new post (the composer makes a new key)');
  // Art on products (Geoffrey, 2026-11-21): checked now, saved with the listing once it exists. The listing's price
  // is the lowest product price ("from"), and each product keeps its own price.
  const m = merch ? fulfillment.checkMerch(merch, images) : null;
  if (m) { listing = { ...listing, type: 'product', price: { mode: 'fixed', amount: Math.min(...m.products.map((x) => x.price)) } }; }
  // 2. check the post before anything is written (its words, images, group, daily limit)
  const postArgs = { text: text || String(listing.title || ''), images, kind: post.kind || 'post', group: post.group || null, topic: post.topic || null };
  if (!existing) posts.create(member, { ...postArgs, dry_run: true });
  // 3. the listing (validated and written by market.create, the one place listings are made)
  if (!l) l = market.create(member, { ...listing, text: String(listing.text ?? text), images: listing.images ?? images, origin: { kind: 'feed', key } });
  // 4. the post that carries it
  try {
    const p = existing || posts.create(member, { ...postArgs, listing: l.id, sell_key: key });
    const saved = m ? fulfillment.setMerch(member, l.id, m) : null;
    return { listing: market.get(l.id), post: p, ...(saved ? { merch: saved } : {}), repeated: false };
  } catch (e) {
    // the post could not be written: take the new listing back down so no store item stands without its post
    try { if (market.get(l.id)?.status === 'live') market.withdraw(member, l.id); } catch { /* reported below */ }
    const err = new Error(`listing not published: ${e.message}`); err.status = e.status || 500; throw err;
  }
}
