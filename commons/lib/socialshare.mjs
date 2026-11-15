/**
 * socialshare.mjs — sharing out to social media (Geoffrey, 2026-11-14: "make a decision, social media post sharing...
 * even if we just use Buffer free for now, we need to get on that pretty soon").
 *
 * Decision (Setu, 2026-11-14, recorded in council/decisions.md): phase 1 is Buffer's free plan and its API, posting to
 * COHABI'S OWN channels (the cooperative's accounts). Buffer's free API key is for the account owner's own channels, so
 * it can't post to each member's personal accounts. Phase 2, for members' own networks from their feed, is Postiz
 * self-hosted (Ash's recommendation), once the entity exists for the networks' developer approvals.
 *
 * How phase 1 works: a member asks to share one of their posts; a steward approves; it goes into Buffer's queue for
 * each connected Cohabi channel, credited to the member with a link back. Nothing is shared without the author asking.
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

let FILE = null; let queue = [];
export function init(dataDir) { const d = path.join(dataDir, 'social'); fs.mkdirSync(d, { recursive: true, mode: 0o700 }); FILE = path.join(d, 'share-queue.json'); try { queue = JSON.parse(fs.readFileSync(FILE, 'utf8')) || []; } catch { queue = []; } }
const save = () => { const t = FILE + '.tmp'; fs.writeFileSync(t, JSON.stringify(queue, null, 1), { mode: 0o600 }); fs.renameSync(t, FILE); };

export const status = () => ({ provider: 'buffer', phase: 1, connected: connected(), channels: channels().length, pending: queue.filter((q) => q.status === 'pending').length, note: "Phase 1 shares to Cohabi's own channels, with the author's request and a steward's yes. Members' own accounts come with Postiz in phase 2." });

const imgUrl = (im, base) => { if (!im) return null; const u = typeof im === 'string' ? `/images/${im}` : (im.url || (im.id ? `/images/${im.id}` : '')); return u ? (/^https?:/.test(u) ? u : base + u) : null; };

/** The author asks for one of their own feed posts to be shared on Cohabi's channels. */
export function request(member, postId, base) {
  if (!member) fail(401, 'sign in first');
  const p = posts.get(postId); if (!p) fail(404, 'no such post');
  if (p.by !== member.id) fail(403, 'only the author can ask to share their post');
  if (queue.some((q) => q.post === p.id && q.status !== 'declined')) fail(409, 'already asked');
  const text = `${String(p.text || '').slice(0, 220)}${String(p.text || '').length > 220 ? '…' : ''}\n\n— ${member.name} on Cohabi ${base}/m/${member.id}`;
  const q = { id: 'sh_' + crypto.randomBytes(6).toString('hex'), post: p.id, by: member.id, text, image: imgUrl((p.images || [])[0], base), status: 'pending', ts: new Date().toISOString() };
  queue.push(q); save(); return q;
}
export const pending = (member) => { if (!isSteward(member)) fail(403, 'stewards only'); return queue.filter((q) => q.status === 'pending'); };
export function decline(member, id) { if (!isSteward(member)) fail(403, 'stewards only'); const q = queue.find((x) => x.id === id); if (!q) fail(404, 'no such request'); q.status = 'declined'; q.decided_by = member.id; save(); return q; }

/** A steward approves: the post goes into Buffer's queue on every connected Cohabi channel. */
export async function approve(member, id, { fetchImpl = fetch } = {}) {
  if (!isSteward(member)) fail(403, 'stewards only');
  const q = queue.find((x) => x.id === id); if (!q) fail(404, 'no such request'); if (q.status !== 'pending') fail(409, `already ${q.status}`);
  if (!connected()) fail(503, "Buffer isn't connected yet: the operator sets BUFFER_API_KEY and BUFFER_CHANNEL_IDS on the server.");
  const results = [];
  for (const ch of channels()) {
    const input = { text: q.text, channelId: ch, schedulingType: 'automatic', mode: 'addToQueue', ...(q.image ? { assets: { images: [{ url: q.image }] } } : {}) };
    const r = await fetchImpl(API(), { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${env('BUFFER_API_KEY')}` }, body: JSON.stringify({ query: 'mutation Share($input: CreatePostInput!) { createPost(input: $input) { ... on PostActionSuccess { post { id } } ... on MutationError { message } } }', variables: { input } }) });
    const j = await r.json().catch(() => ({}));
    const ok = r.ok && j?.data?.createPost?.post?.id;
    results.push({ channel: ch, ok: !!ok, buffer_post: ok || null, error: ok ? null : (j?.data?.createPost?.message || j?.errors?.[0]?.message || `HTTP ${r.status}`) });
  }
  q.status = results.every((x) => x.ok) ? 'queued' : results.some((x) => x.ok) ? 'partly' : 'failed'; q.results = results; q.decided_by = member.id; q.decided_at = new Date().toISOString(); save();
  return q;
}
