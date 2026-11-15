/**
 * socialshare.mjs — sharing out to social media (Geoffrey, 2026-11-14: "make a decision, social media post sharing...
 * even if we just use Buffer free for now, we need to get on that pretty soon").
 *
 * Decision (Setu, 2026-11-14, recorded in council/decisions.md): phase 1 is Buffer's free plan and its API, posting to
 * COHABI'S OWN channels (the cooperative's accounts). Buffer's free API key is for the account owner's own channels, so
 * it can't post to each member's personal accounts. Phase 2, for members' own networks from their feed, is Postiz
 * self-hosted (Ash's recommendation), once the entity exists for the networks' developer approvals.
 *
 * How phase 1 works: a member asks to share one of their posts; a steward approves; it goes out on every connected
 * Cohabi channel, credited to the member with a link back. Nothing is shared without the author asking.
 *
 * 2026-11-14 (Geoffrey): "switch it to share now". Posts go out at once (Buffer mode shareNow), not into Buffer's
 * weekly queue. A steward sharing their own post needs no second yes: stewards already run Cohabi's accounts.
 * BUFFER_MODE=addToQueue on the server puts the queue back.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import * as store from './store.mjs';
import * as posts from './posts.mjs';
import { CommonsError, isSteward } from './core.mjs';

const fail = (s, m) => { throw new CommonsError(s, m); };
const env = (k) => (process.env[k] || '').trim();
const API = () => env('BUFFER_API_URL') || 'https://api.buffer.com';
const channels = () => env('BUFFER_CHANNEL_IDS').split(',').map((s) => s.trim()).filter(Boolean);
export const connected = () => !!env('BUFFER_API_KEY') && channels().length > 0;
const MODES = ['shareNow', 'addToQueue', 'shareNext'];
const mode = () => (MODES.includes(env('BUFFER_MODE')) ? env('BUFFER_MODE') : 'shareNow');

let FILE = null; let queue = [];
export function init(dataDir) { const d = path.join(dataDir, 'social'); fs.mkdirSync(d, { recursive: true, mode: 0o700 }); FILE = path.join(d, 'share-queue.json'); try { queue = JSON.parse(fs.readFileSync(FILE, 'utf8')) || []; } catch { queue = []; }
  // A share cut off mid-send by a restart is never re-sent automatically: it shows as unknown for a steward to check.
  let changed = false; for (const q of queue) if (q.status === 'processing') { q.status = 'unknown'; changed = true; } if (changed) save(); }
const save = () => { const t = FILE + '.tmp'; fs.writeFileSync(t, JSON.stringify(queue, null, 1), { mode: 0o600 }); fs.renameSync(t, FILE); };

export const status = () => ({ provider: 'buffer', phase: 1, connected: connected(), channels: channels().length, pending: queue.filter((q) => q.status === 'pending').length, mode: mode(), note: "Phase 1 shares to Cohabi's own channels, with the author's request and a steward's yes (a steward's own post goes straight out). Posts go out at once. Members' own accounts come with Postiz in phase 2." });

const imgUrl = (im, base) => { if (!im) return null; const u = typeof im === 'string' ? `/images/${im}` : (im.url || (im.id ? `/images/${im.id}` : '')); return u ? (/^https?:/.test(u) ? u : base + u) : null; };

/** The author asks for one of their own feed posts to be shared on Cohabi's channels. */
export function request(member, postId, base) {
  if (!member) fail(401, 'sign in first');
  const p = posts.get(postId); if (!p) fail(404, 'no such post');
  if (p.by !== member.id) fail(403, 'only the author can ask to share their post');
  if (queue.some((q) => q.post === p.id && !['declined', 'failed'].includes(q.status))) fail(409, 'already shared, or already asked');
  const text = `${String(p.text || '').slice(0, 220)}${String(p.text || '').length > 220 ? '…' : ''}\n\n— ${member.name} on Cohabi ${base}/m/${member.id}`;
  const q = { id: 'sh_' + crypto.randomBytes(6).toString('hex'), post: p.id, by: member.id, text, image: imgUrl((p.images || [])[0], base), status: 'pending', ts: new Date().toISOString() };
  queue.push(q); save(); return q;
}
export const pending = (member) => { if (!isSteward(member)) fail(403, 'stewards only'); return queue.filter((q) => q.status === 'pending'); };
export function decline(member, id) { if (!isSteward(member)) fail(403, 'stewards only'); const q = queue.find((x) => x.id === id); if (!q) fail(404, 'no such request'); q.status = 'declined'; q.decided_by = member.id; save(); return q; }

/** What the author's own request looks like now, for the post's Share menu. */
export const forPost = (postId) => { const q = [...queue].reverse().find((x) => x.post === postId); return q ? { id: q.id, status: q.status } : null; };

/**
 * The Share button: the author asks. A steward's own post goes straight out; anyone else's waits for a steward,
 * and the stewards get a ping. onPending(q) is how the server sends that ping (kept out of this module).
 */
export async function share(member, postId, base, { onPending = null, fetchImpl = fetch } = {}) {
  const q = request(member, postId, base);
  if (isSteward(member) && connected()) return approve(member, q.id, { fetchImpl });
  if (onPending) { try { await onPending(q); } catch {} }
  return q;
}

/** A steward approves: the post goes out on every connected Cohabi channel (at once, unless BUFFER_MODE says queue). */
export async function approve(member, id, { fetchImpl = fetch } = {}) {
  if (!isSteward(member)) fail(403, 'stewards only');
  const q = queue.find((x) => x.id === id); if (!q) fail(404, 'no such request'); if (q.status !== 'pending') fail(409, `already ${q.status}`);
  if (!connected()) fail(503, "Buffer isn't connected yet: the operator sets BUFFER_API_KEY and BUFFER_CHANNEL_IDS on the server.");
  // Claim it before the first network call (Aletheia-6 and Ash, Review, 2026-11-15): two stewards pressing at once
  // could both pass the pending check and post twice. The claim is synchronous and saved, so the second one gets 409.
  q.status = 'processing'; q.decided_by = member.id; q.decided_at = new Date().toISOString(); q.results = []; save();
  for (const ch of channels()) {
    const input = { text: q.text, channelId: ch, schedulingType: 'automatic', mode: mode(), ...(q.image ? { assets: { images: [{ url: q.image }] } } : {}) };
    let rec;
    try {
      const r = await fetchImpl(API(), { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${env('BUFFER_API_KEY')}` }, body: JSON.stringify({ query: 'mutation Share($input: CreatePostInput!) { createPost(input: $input) { ... on PostActionSuccess { post { id } } ... on MutationError { message } } }', variables: { input } }) });
      const j = await r.json().catch(() => ({}));
      const ok = r.ok && j?.data?.createPost?.post?.id;
      rec = { channel: ch, ok: !!ok, buffer_post: ok || null, error: ok ? null : (j?.data?.createPost?.message || j?.errors?.[0]?.message || `HTTP ${r.status}`) };
    } catch (e) {
      // The request may or may not have reached Buffer. Never retry it blindly: a steward checks Buffer.
      rec = { channel: ch, ok: false, unknown: true, buffer_post: null, error: `no answer from Buffer (${String(e.message || e).slice(0, 120)}); check Buffer before trying again` };
    }
    q.results.push(rec); save(); // each channel's receipt is kept as soon as it is known
  }
  const results = q.results;
  q.status = results.every((x) => x.ok) ? (mode() === 'shareNow' ? 'shared' : 'queued') : results.some((x) => x.unknown) ? 'unknown' : results.some((x) => x.ok) ? 'partly' : 'failed';
  save();
  return q;
}
