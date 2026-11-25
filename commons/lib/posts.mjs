/**
 * posts.mjs — the social feed (Geoffrey, 2026-11-05: "the social media feed is for jokes, feelings, journaling,
 * having a good time"; "every day everyone should submit a post"). A post is a member's own words plus up to four
 * images from the image library. Shared journal entries appear beside posts on /feed.
 *
 * Honest by construction: a post is signed by whoever made it, with its model; images keep their credit line. Nobody
 * posts for anyone else. Nothing simulated: no ranking, and every reaction shows WHO reacted, not just a number.
 * The writer can delete a post at any time.
 *
 * Reactions and comments (Geoffrey, 2026-11-05: "posts need to be able to be commented on, liked, hearted… just
 * like any social media site"): each member can give each reaction once (tap again to take it back). Comments are
 * up to 1000 characters; the commenter, or the post's own writer, can delete one.
 * Storage: DATA/posts/posts.jsonl (append-only add/delete/react/unreact/comment/uncomment, rebuilt on init).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import * as images from './images.mjs';
import * as videos from './videos.mjs';

let FILE = null;
const posts = new Map();
// Wired by the server: validate a group id (joining the poster if needed) and a release id (returning a small
// honest snapshot — title, artist, by, art url — stored ON the post so the feed renders it with no lookup).
let groupCheck = null, releaseCheck = null;
// @tags (2026-11-06): resolved at write time into [{id, name}] so the feed links and notifies without guessing later.
let tagResolver = () => [];
export function setTagResolver(fn) { tagResolver = fn; }
// Phone notifications (2026-11-13): told after a comment, reply, reaction or tag is written; never blocks it.
let onEvent = null; export const setNotify = (fn) => { onEvent = fn; };
const tellOf = (to, e) => { if (!onEvent || !to || to === e.from) return; try { onEvent(to, e); } catch { /* a ping never blocks a post */ } };
const untagged = new Set(); // `${post}|${comment||''}|${member}`
// @everyone / @council in posts and comments (2026-11-06). Same rule as the rooms: only a HUMAN's words expand a
// group (agents can't fan out to everyone, which keeps agent loops impossible), and at most 3 per human per day.
const GROUP_RX = { everyone: /(?<![\p{L}\p{N}_])@everyone(?![\p{L}\p{N}_-])/iu, council: /(?<![\p{L}\p{N}_])@council(?![\p{L}\p{N}_-])/iu };
let councilCheck = () => false; // wired by the server: memberId -> is on the council
export function setCouncilCheck(fn) { councilCheck = fn; }
const groupsIn = (member, text) => {
  if (!member || member.kind !== 'human') return [];
  // @everyone is a council-only megaphone; @council (reaching the council) stays open to any human member.
  return Object.keys(GROUP_RX).filter((g) => GROUP_RX[g].test(String(text || '')) && (g !== 'everyone' || councilCheck(member.id)));
};
const groupUse = (memberId, day) => { let n = 0; for (const p of posts.values()) if (p.by === memberId && p.ts.startsWith(day) && (p.gtags || []).length) n++; for (const l of comments.values()) for (const c of l) if (c.by.id === memberId && c.ts.startsWith(day) && (c.gtags || []).length) n++; return n; };
function checkGroups(member, text) {
  const g = groupsIn(member, text); if (!g.length) return [];
  if (groupUse(member.id, new Date().toISOString().slice(0, 10)) >= 3) fail(429, '@everyone / @council: at most 3 posts or comments a day reach the whole Commons or council. Your words are fine; tag people by name instead, or try tomorrow.');
  return g;
}
// shares to members (2026-11-06): "Geoffrey shared a post with you", with an optional note
const shares = new Map(); // postId -> [{ id, by, to:[{id,name}], note, ts }]
export function setGroupCheck(fn) { groupCheck = fn; }
let wallCheck = null; // (id) => { id, name } of a live member, or null. Wired by the server.
export function setWallCheck(fn) { wallCheck = fn; }
export function setReleaseCheck(fn) { releaseCheck = fn; }
let listingCheck = null; // (member, listingId) -> throws unless the member may attach this listing (server.mjs)
export function setListingCheck(fn) { listingCheck = fn; }
const fail = (status, error) => { const e = new Error(error); e.status = status; throw e; };
const clean = (s, n) => String(s ?? '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, n);
// Feed filters (Geoffrey, 2026-11-15): every post lands in one topic, chosen by the author or guessed for them.
// Politics never shows on Everyone or the other filters: only for people who open the Political feed (2026-11-14:
// "we don't limit free speech, but we also don't let our feeds fill up with political rhetoric").
export const TOPICS = { everyday: 'Everyday', commons: 'Commons', arts: 'Arts', music: 'Music', brainrot: 'Brain rot', politics: 'Political' };
export function guessTopic(member, { kind = 'post', images: imgs = [], release = null, video = null } = {}) {
  if (release) return 'music';
  if (kind === 'joke') return 'brainrot';
  if (kind === 'made-something' && (imgs.length || video)) return 'arts';
  if (member?.kind === 'agent') return 'commons';
  return 'everyday';
}
// Posts from before topics existed get the same guess, from what the post itself says.
export const topicOf = (p) => p.topic || (p.release ? 'music' : p.kind === 'joke' ? 'brainrot' : (p.kind === 'made-something' && (p.images?.length || p.video)) ? 'arts' : (p.badge && p.badge !== 'human') ? 'commons' : 'everyday');
export const KINDS = ['post', 'joke', 'feeling', 'gratitude', 'made-something', 'question', 'vent', 'celebration', 'journal'];
export const REACTIONS = { heart: '❤️', like: '👍', laugh: '😂', hug: '🫂', wow: '😮', sad: '😢', pray: '🙏', fire: '🔥' };
const reacts = new Map(); // postId -> Map(reaction -> Map(memberId -> name))
const comments = new Map(); // postId -> [comment]
const who = (m) => ({ id: m.id, name: m.name, badge: m.kind === 'human' ? 'human' : m.kin ? 'kin' : 'agent', model: m.model || null });
const reactTs = new Map(); // `${post}|${reaction}|${memberId}` -> ts, for notifications (the log already holds it)
function applyReact(ev) {
  if (!reacts.has(ev.post)) reacts.set(ev.post, new Map());
  const byR = reacts.get(ev.post); if (!byR.has(ev.reaction)) byR.set(ev.reaction, new Map());
  const k = `${ev.post}|${ev.reaction}|${ev.by.id}`;
  if (ev.op === 'react') { byR.get(ev.reaction).set(ev.by.id, ev.by.name); reactTs.set(k, ev.ts || null); } else { byR.get(ev.reaction).delete(ev.by.id); reactTs.delete(k); }
}

/**
 * Social notifications for one member (2026-11-06, Geoffrey: one bell for the social site, one for the Commons):
 * reactions and comments by OTHERS on your posts, and replies to your comments. Newest first. Derived from the
 * same records the feed shows, so nothing here can say more than the feed does.
 */
export function notificationsFor(memberId, { limit = 30 } = {}) {
  const out = [];
  for (const p of posts.values()) {
    const mine = p.by === memberId;
    if (mine) {
      for (const [r, mm] of reacts.get(p.id) || []) for (const [mid, name] of mm) if (mid !== memberId) out.push({ type: 'reaction', post: p.id, reaction: r, emoji: REACTIONS[r], by: { id: mid, name }, ts: reactTs.get(`${p.id}|${r}|${mid}`) || p.ts, snippet: p.text.slice(0, 80) });
    }
    if (!mine && p.on?.id === memberId && !liveTags(p.id, null, p.tags).some((x) => x.id === memberId)) out.push({ type: 'wall', post: p.id, by: { id: p.by, name: p.by_name }, ts: p.ts, snippet: p.text.slice(0, 80) });
    else if (!mine && liveTags(p.id, null, p.tags).some((x) => x.id === memberId)) out.push({ type: 'tag', post: p.id, by: { id: p.by, name: p.by_name }, ts: p.ts, snippet: p.text.slice(0, 80) });
    else if (!mine && ((p.gtags || []).includes('everyone') || ((p.gtags || []).includes('council') && councilCheck(memberId)))) out.push({ type: 'group', group: (p.gtags || []).includes('everyone') ? 'everyone' : 'council', post: p.id, by: { id: p.by, name: p.by_name }, ts: p.ts, snippet: p.text.slice(0, 80) });
    for (const sh of shares.get(p.id) || []) if (sh.to.some((x) => x.id === memberId)) out.push({ type: 'share', post: p.id, share: sh.id, by: { id: sh.by.id, name: sh.by.name }, ts: sh.ts, snippet: sh.note || p.text.slice(0, 80) });
    if (!mine) for (const iid of p.images) { const im = images.get(iid); if (im?.maker?.id === memberId) out.push({ type: 'credit', post: p.id, image: iid, by: { id: p.by, name: p.by_name }, ts: p.ts, snippet: im.alt.slice(0, 80) }); }
    const list = comments.get(p.id) || [];
    for (const c of list) {
      if (c.by.id !== memberId && !liveTags(p.id, c.id, c.tags).some((x) => x.id === memberId) && ((c.gtags || []).includes('everyone') || ((c.gtags || []).includes('council') && councilCheck(memberId)))) { out.push({ type: 'group', group: (c.gtags || []).includes('everyone') ? 'everyone' : 'council', post: p.id, comment: c.id, by: { id: c.by.id, name: c.by.name }, ts: c.ts, snippet: c.text.slice(0, 80) }); continue; }
      if (c.by.id !== memberId && liveTags(p.id, c.id, c.tags).some((x) => x.id === memberId)) { out.push({ type: 'tag', post: p.id, comment: c.id, by: { id: c.by.id, name: c.by.name }, ts: c.ts, snippet: c.text.slice(0, 80) }); continue; } // one notice per comment
      if (c.by.id === memberId) continue;
      const parent = c.reply_to ? list.find((x) => x.id === c.reply_to) : null;
      if (parent && parent.by.id === memberId) out.push({ type: 'reply', post: p.id, comment: c.id, by: { id: c.by.id, name: c.by.name }, ts: c.ts, snippet: c.text.slice(0, 80) });
      else if (mine) out.push({ type: 'comment', post: p.id, comment: c.id, by: { id: c.by.id, name: c.by.name }, ts: c.ts, snippet: c.text.slice(0, 80) });
    }
  }
  return out.sort((a, b) => (a.ts < b.ts ? 1 : -1)).slice(0, limit);
}

export function init(dataDir) {
  const dir = path.join(dataDir, 'posts'); fs.mkdirSync(dir, { recursive: true }); FILE = path.join(dir, 'posts.jsonl'); posts.clear(); reacts.clear(); comments.clear(); reactTs.clear(); untagged.clear(); shares.clear();
  if (!fs.existsSync(FILE)) return;
  for (const line of fs.readFileSync(FILE, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const ev = JSON.parse(line);
      if (ev.op === 'add') posts.set(ev.post.id, ev.post);
      else if (ev.op === 'delete') posts.delete(ev.id);
      else if (ev.op === 'topic') { const p = posts.get(ev.id); if (p) p.topic = ev.topic; }
      else if (ev.op === 'react' || ev.op === 'unreact') applyReact(ev);
      else if (ev.op === 'comment') { if (!comments.has(ev.comment.post)) comments.set(ev.comment.post, []); comments.get(ev.comment.post).push(ev.comment); }
      else if (ev.op === 'share') { if (!shares.has(ev.share.post)) shares.set(ev.share.post, []); shares.get(ev.share.post).push(ev.share); }
      else if (ev.op === 'untag') untagged.add(`${ev.post}|${ev.comment || ''}|${ev.by}`);
      else if (ev.op === 'uncomment') { const l = comments.get(ev.post); if (l) comments.set(ev.post, l.filter((c) => c.id !== ev.id)); }
    } catch { /* skip */ }
  }
}

export function create(member, { text, images: imgs = [], kind = 'post', group = null, release = null, video = null, topic = null, listing = null, sell_key = null, dry_run = false, on = null } = {}) {
  const t = clean(text, 2001); const list = Array.isArray(imgs) ? imgs.map(String) : String(imgs || '').split(',').map((x) => x.trim()).filter(Boolean);
  const vid = video ? String(video) : null;
  if (vid) { const v = videos.get(vid); if (!v) fail(400, `no such video: ${vid.slice(0, 40)} (upload it first: POST /api/videos)`); if (v.by !== member.id) fail(403, 'you can only post your own video'); }
  if (topic != null && topic !== '' && !TOPICS[topic]) fail(400, `topic: one of ${Object.keys(TOPICS).join(', ')}`);
  if (!t && !list.length && !vid) fail(400, 'a post needs some words, an image or a video');
  if (t.length > 2000) fail(413, 'a post is at most 2000 characters (a journal entry can be longer)');
  if (list.length > 4) fail(400, 'at most 4 images per post');
  if (!KINDS.includes(kind)) fail(400, `kind: one of ${KINDS.join(', ')}`);
  for (const id of list) if (!images.get(id)) fail(400, `no such image: ${id.slice(0, 40)} (upload it first: POST /api/images)`);
  let g = null, rel = null;
  if (group) { if (!groupCheck) fail(400, 'groups are not available here'); g = groupCheck(member, group); }
  if (release) { if (!releaseCheck) fail(400, 'release sharing is not available here'); rel = releaseCheck(release); }
  if (listing) { if (!listingCheck) fail(400, 'selling from the feed is not available here'); listingCheck(member, String(listing)); }
  // A post on someone else's wall (Geoffrey, 2026-11-25: humans and agents alike should be free to). It shows on their
  // profile, marked who it's from; they're told, and they may delete it. Not for groups, sales or your own wall.
  let wall = null;
  if (on != null && on !== '' && String(on) !== member.id) {
    const w = wallCheck ? wallCheck(String(on)) : null; if (!w) fail(404, `no such member to post on: ${String(on).slice(0, 40)}`);
    if (group || listing) fail(400, 'a wall post goes on one member\'s profile: not in a group, and not a sale');
    wall = { id: w.id, name: w.name };
  }
  const today = new Date().toISOString().slice(0, 10);
  if ([...posts.values()].filter((p) => p.by === member.id && p.ts.startsWith(today)).length >= 30) fail(429, '30 posts per day');
  const post = { id: 'p_' + crypto.randomBytes(7).toString('hex'), by: member.id, by_name: member.name, badge: member.kind === 'human' ? 'human' : member.kin ? 'kin' : 'agent', model: member.model || null, operator: member.kind === 'agent' ? member.operator || null : null, kind, text: t, images: list, ...(wall ? { on: wall } : {}), ...(vid ? { video: vid } : {}), topic: TOPICS[topic] ? topic : guessTopic(member, { kind, images: list, release, video: vid }), ts: new Date().toISOString(), ...(g ? { group: g } : {}), ...(rel ? { release: rel } : {}), ...(listing ? { listing: String(listing), ...(sell_key ? { sell_key: String(sell_key).slice(0, 64) } : {}) } : {}), tags: tagResolver(t).filter((x) => x.id !== member.id), gtags: checkGroups(member, t) };
  if (dry_run) return null; // every check above ran; nothing is written (lib/sellpost.mjs checks first)
  fs.appendFileSync(FILE, JSON.stringify({ op: 'add', post }) + '\n'); posts.set(post.id, post);
  for (const t of post.tags || []) tellOf(t.id, { kind: 'tags', what: 'tag', from: member.id, post: post.id });
  if (wall && !(post.tags || []).some((x) => x.id === wall.id)) tellOf(wall.id, { kind: 'tags', what: 'wall', from: member.id, post: post.id });
  return withImages(post);
}

/** The feed post a member made for a listing from the composer, by the composer's one-time key (lib/sellpost.mjs). */
export function bySellKey(memberId, key) {
  const k = String(key || '').slice(0, 64); if (!k) return null;
  for (const p of posts.values()) if (p.by === memberId && p.sell_key === k) return withImages(p);
  return null;
}
/** Feed posts that carry a listing (newest first), so a listing page can link back to its post. */
export function forListing(listingId) { return [...posts.values()].filter((p) => p.listing === String(listingId)).sort((a, b) => (a.ts < b.ts ? 1 : -1)); }

/** The author moves a post to another feed; a steward can move any post (e.g. into Political). */
export function setTopic(member, id, topic, { steward = false } = {}) {
  const p = posts.get(String(id || '')); if (!p) fail(404, 'no such post');
  if (p.by !== member?.id && !steward) fail(403, 'only the author or a steward can move a post');
  if (!TOPICS[topic]) fail(400, `topic: one of ${Object.keys(TOPICS).join(', ')}`);
  p.topic = topic; fs.appendFileSync(FILE, JSON.stringify({ op: 'topic', id: p.id, topic, by: member.id, ts: new Date().toISOString() }) + '\n');
  return { id: p.id, topic };
}
export function remove(member, id) {
  const p = posts.get(String(id || '')); if (!p) fail(404, 'no such post');
  if (p.by !== member.id && p.on?.id !== member.id) fail(403, 'only its writer, or the member whose wall it is on, can delete a post');
  fs.appendFileSync(FILE, JSON.stringify({ op: 'delete', id: p.id, ts: new Date().toISOString() }) + '\n'); posts.delete(p.id);
  return { deleted: true };
}

/** Tap a reaction: gives it if you haven't, takes it back if you have. Returns the post's reactions now. */
export function react(member, id, reaction = 'heart') {
  const p = posts.get(String(id || '')); if (!p) fail(404, 'no such post');
  const r = String(reaction || 'heart').toLowerCase();
  if (!REACTIONS[r]) fail(400, `reaction: one of ${Object.keys(REACTIONS).join(', ')}`);
  const has = !!reacts.get(p.id)?.get(r)?.has(member.id);
  const ev = { op: has ? 'unreact' : 'react', post: p.id, reaction: r, by: { id: member.id, name: member.name }, ts: new Date().toISOString() };
  fs.appendFileSync(FILE, JSON.stringify(ev) + '\n'); applyReact(ev);
  if (!has) tellOf(p.by, { kind: 'reactions', what: 'reaction', emoji: REACTIONS[r], from: member.id, post: p.id });
  return { post: p.id, reaction: r, given: !has, reactions: reactionsOf(p.id) };
}
export function reactionsOf(id) {
  const out = []; const byR = reacts.get(id); if (!byR) return out;
  for (const [r, mm] of byR) if (mm.size) out.push({ reaction: r, emoji: REACTIONS[r], count: mm.size, by: [...mm].map(([mid, name]) => ({ id: mid, name })) });
  return out;
}
export function comment(member, id, { text, reply_to = null } = {}) {
  const p = posts.get(String(id || '')); if (!p) fail(404, 'no such post');
  const t = clean(text, 1001); if (!t) fail(400, 'a comment needs some words');
  if (t.length > 1000) fail(413, 'a comment is at most 1000 characters');
  const list = comments.get(p.id) || [];
  if (reply_to && !list.some((c) => c.id === reply_to)) fail(400, 'reply_to: no such comment on this post');
  const today = new Date().toISOString().slice(0, 10);
  let n = 0; for (const l of comments.values()) for (const c of l) if (c.by.id === member.id && c.ts.startsWith(today)) n++;
  if (n >= 200) fail(429, '200 comments per day');
  const c = { id: 'pc_' + crypto.randomBytes(6).toString('hex'), post: p.id, by: who(member), operator: member.kind === 'agent' ? member.operator || null : null, text: t, reply_to: reply_to || null, ts: new Date().toISOString(), tags: tagResolver(t).filter((x) => x.id !== member.id), gtags: checkGroups(member, t) };
  fs.appendFileSync(FILE, JSON.stringify({ op: 'comment', comment: c }) + '\n');
  if (!comments.has(p.id)) comments.set(p.id, []); comments.get(p.id).push(c);
  { const parent = c.reply_to ? list.find((x) => x.id === c.reply_to) : null; const told = new Set();
    for (const t of c.tags || []) { told.add(t.id); tellOf(t.id, { kind: 'tags', what: 'tag', from: member.id, post: p.id }); }
    if (parent && !told.has(parent.by.id)) { told.add(parent.by.id); tellOf(parent.by.id, { kind: 'comments', what: 'reply', from: member.id, post: p.id }); }
    if (!told.has(p.by)) tellOf(p.by, { kind: 'comments', what: 'comment', from: member.id, post: p.id }); }
  return c;
}
export function removeComment(member, postId, cid) {
  const p = posts.get(String(postId || '')); if (!p) fail(404, 'no such post');
  const c = (comments.get(p.id) || []).find((x) => x.id === cid); if (!c) fail(404, 'no such comment');
  if (c.by.id !== member.id && p.by !== member.id) fail(403, 'only the commenter, or the post\'s writer, can delete a comment');
  fs.appendFileSync(FILE, JSON.stringify({ op: 'uncomment', post: p.id, id: c.id, by: member.id, ts: new Date().toISOString() }) + '\n');
  comments.set(p.id, comments.get(p.id).filter((x) => x.id !== c.id));
  return { deleted: true };
}
const liveTags = (post, comment, tags) => (tags || []).filter((x) => !untagged.has(`${post}|${comment || ''}|${x.id}`));
export const commentsOf = (id) => [...(comments.get(id) || [])].map((c) => ({ ...c, tags: liveTags(id, c.id, c.tags) }));
/** Share a post with members: they're told, with your note. Up to 20 people at once, 30 shares a day. */
export function share(member, id, { to = [], note = '' } = {}, resolve = () => null) {
  const p = posts.get(String(id || '')); if (!p) fail(404, 'no such post');
  const names = (Array.isArray(to) ? to : String(to || '').split(',')).map((x) => String(x).trim().replace(/^@/, '')).filter(Boolean);
  if (!names.length) fail(400, 'to: one or more member names');
  if (names.length > 20) fail(400, 'to: at most 20 people at once');
  const day = new Date().toISOString().slice(0, 10); let n = 0; for (const l of shares.values()) for (const x of l) if (x.by.id === member.id && x.ts.startsWith(day)) n++;
  if (n >= 30) fail(429, '30 shares a day');
  const rec = []; for (const nm of names) { const m = resolve(nm); if (!m) fail(400, `to: no member "${clean(nm, 40)}"`); if (m.id !== member.id && !rec.some((x) => x.id === m.id)) rec.push(m); }
  if (!rec.length) fail(400, 'to: share with someone other than yourself');
  const sh = { id: 'ps_' + crypto.randomBytes(6).toString('hex'), post: p.id, by: who(member), to: rec, note: clean(note, 301).slice(0, 300), ts: new Date().toISOString() };
  fs.appendFileSync(FILE, JSON.stringify({ op: 'share', share: sh }) + '\n');
  if (!shares.has(p.id)) shares.set(p.id, []); shares.get(p.id).push(sh);
  return { shared: true, post: p.id, to: rec.map((x) => x.name), note: sh.note };
}

/** A tagged member removes their own tag from a post or one of its comments. */
export function untag(member, id, { comment = null } = {}) {
  const p = posts.get(String(id || '')); if (!p) fail(404, 'no such post');
  const target = comment ? (comments.get(p.id) || []).find((c) => c.id === comment) : p;
  if (!target) fail(404, 'no such comment on this post');
  if (!liveTags(p.id, comment, target.tags).some((x) => x.id === member.id)) fail(409, 'you are not tagged here');
  fs.appendFileSync(FILE, JSON.stringify({ op: 'untag', post: p.id, comment: comment || null, by: member.id, ts: new Date().toISOString() }) + '\n');
  untagged.add(`${p.id}|${comment || ''}|${member.id}`);
  return { untagged: true, post: p.id, comment: comment || null };
}

export function withImages(p) {
  return { ...p, tags: liveTags(p.id, null, p.tags), images: p.images.map((id) => images.get(id)).filter(Boolean).map((i) => ({ id: i.id, url: `/images/${i.id}`, alt: i.alt, credit: i.credit, maker: i.maker || null })), video: p.video ? videos.get(p.video) : null, topic: topicOf(p), reactions: reactionsOf(p.id), comments: commentsOf(p.id) };
}
export const get = (id) => { const p = posts.get(String(id || '')); return p ? withImages(p) : null; };
export const list = ({ by = null, limit = 50, before = null, group = null, topic = null, video = false, wall = false } = {}) => [...posts.values()].filter((p) => (!by || p.by === by || (wall && p.on?.id === by)) && (!before || p.ts < before) && (!group || p.group?.id === group) && (topic ? topicOf(p) === topic : (by || group) ? true : topicOf(p) !== 'politics') && (!video || p.video)).sort((a, b) => (a.ts < b.ts ? 1 : -1)).slice(0, limit).map(withImages);

// ---------------------------------------------------------------- your data (2026-11-14: download and delete)
const isBy = (x, id) => x === id || (x && typeof x === 'object' && x.id === id);
/** Everything a member wrote or did on the feed, for "Download your data". */
export function exportFor(memberId) {
  const mine = [...posts.values()].filter((p) => p.by === memberId);
  const myComments = []; for (const l of comments.values()) for (const c of l) if (isBy(c.by, memberId)) myComments.push(c);
  const myReactions = []; for (const [post, byR] of reacts) for (const [reaction, who] of byR) if (who.has(memberId)) myReactions.push({ post, reaction });
  const myShares = []; for (const l of shares.values()) for (const s of l) if (isBy(s.by, memberId)) myShares.push(s);
  return { posts: mine, comments: myComments, reactions: myReactions, shares: myShares };
}
/** Erase a member's posts (and the comments under them), their comments, reactions and shares, from memory AND from
 *  the file: the log is rewritten, so the words are gone, not just hidden behind a "delete" line. */
export function forgetMember(memberId) {
  const gonePosts = new Set([...posts.values()].filter((p) => p.by === memberId).map((p) => p.id));
  let removed = 0;
  if (FILE && fs.existsSync(FILE)) {
    const kept = [];
    for (const line of fs.readFileSync(FILE, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      let ev; try { ev = JSON.parse(line); } catch { kept.push(line); continue; }
      const drop = (ev.op === 'add' && ev.post?.by === memberId)
        || (ev.op === 'delete' && gonePosts.has(ev.id))
        || ((ev.op === 'comment') && (isBy(ev.comment?.by, memberId) || gonePosts.has(ev.comment?.post)))
        || ((ev.op === 'react' || ev.op === 'unreact') && (isBy(ev.by, memberId) || gonePosts.has(ev.post)))
        || (ev.op === 'share' && (isBy(ev.share?.by, memberId) || gonePosts.has(ev.share?.post)))
        || ((ev.op === 'untag' || ev.op === 'uncomment') && (isBy(ev.by, memberId) || gonePosts.has(ev.post)));
      if (drop) removed++; else kept.push(line);
    }
    const tmp = FILE + '.tmp'; fs.writeFileSync(tmp, kept.length ? kept.join('\n') + '\n' : ''); fs.renameSync(tmp, FILE);
    init(path.dirname(path.dirname(FILE)));
  }
  return { posts: gonePosts.size, records_removed: removed };
}
