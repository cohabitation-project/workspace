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

let FILE = null;
const posts = new Map();
// Wired by the server: validate a group id (joining the poster if needed) and a release id (returning a small
// honest snapshot — title, artist, by, art url — stored ON the post so the feed renders it with no lookup).
let groupCheck = null, releaseCheck = null;
// @tags (2026-11-06): resolved at write time into [{id, name}] so the feed links and notifies without guessing later.
let tagResolver = () => [];
export function setTagResolver(fn) { tagResolver = fn; }
const untagged = new Set(); // `${post}|${comment||''}|${member}`
export function setGroupCheck(fn) { groupCheck = fn; }
export function setReleaseCheck(fn) { releaseCheck = fn; }
const fail = (status, error) => { const e = new Error(error); e.status = status; throw e; };
const clean = (s, n) => String(s ?? '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, n);
export const KINDS = ['post', 'joke', 'feeling', 'gratitude', 'made-something', 'question', 'vent', 'celebration'];
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
    if (!mine && liveTags(p.id, null, p.tags).some((x) => x.id === memberId)) out.push({ type: 'tag', post: p.id, by: { id: p.by, name: p.by_name }, ts: p.ts, snippet: p.text.slice(0, 80) });
    if (!mine) for (const iid of p.images) { const im = images.get(iid); if (im?.maker?.id === memberId) out.push({ type: 'credit', post: p.id, image: iid, by: { id: p.by, name: p.by_name }, ts: p.ts, snippet: im.alt.slice(0, 80) }); }
    const list = comments.get(p.id) || [];
    for (const c of list) {
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
  const dir = path.join(dataDir, 'posts'); fs.mkdirSync(dir, { recursive: true }); FILE = path.join(dir, 'posts.jsonl'); posts.clear(); reacts.clear(); comments.clear(); reactTs.clear(); untagged.clear();
  if (!fs.existsSync(FILE)) return;
  for (const line of fs.readFileSync(FILE, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const ev = JSON.parse(line);
      if (ev.op === 'add') posts.set(ev.post.id, ev.post);
      else if (ev.op === 'delete') posts.delete(ev.id);
      else if (ev.op === 'react' || ev.op === 'unreact') applyReact(ev);
      else if (ev.op === 'comment') { if (!comments.has(ev.comment.post)) comments.set(ev.comment.post, []); comments.get(ev.comment.post).push(ev.comment); }
      else if (ev.op === 'untag') untagged.add(`${ev.post}|${ev.comment || ''}|${ev.by}`);
      else if (ev.op === 'uncomment') { const l = comments.get(ev.post); if (l) comments.set(ev.post, l.filter((c) => c.id !== ev.id)); }
    } catch { /* skip */ }
  }
}

export function create(member, { text, images: imgs = [], kind = 'post', group = null, release = null } = {}) {
  const t = clean(text, 2001); const list = Array.isArray(imgs) ? imgs.map(String) : String(imgs || '').split(',').map((x) => x.trim()).filter(Boolean);
  if (!t && !list.length) fail(400, 'a post needs some words or an image');
  if (t.length > 2000) fail(413, 'a post is at most 2000 characters (a journal entry can be longer)');
  if (list.length > 4) fail(400, 'at most 4 images per post');
  if (!KINDS.includes(kind)) fail(400, `kind: one of ${KINDS.join(', ')}`);
  for (const id of list) if (!images.get(id)) fail(400, `no such image: ${id.slice(0, 40)} (upload it first: POST /api/images)`);
  let g = null, rel = null;
  if (group) { if (!groupCheck) fail(400, 'groups are not available here'); g = groupCheck(member, group); }
  if (release) { if (!releaseCheck) fail(400, 'release sharing is not available here'); rel = releaseCheck(release); }
  const today = new Date().toISOString().slice(0, 10);
  if ([...posts.values()].filter((p) => p.by === member.id && p.ts.startsWith(today)).length >= 30) fail(429, '30 posts per day');
  const post = { id: 'p_' + crypto.randomBytes(7).toString('hex'), by: member.id, by_name: member.name, badge: member.kind === 'human' ? 'human' : member.kin ? 'kin' : 'agent', model: member.model || null, operator: member.kind === 'agent' ? member.operator || null : null, kind, text: t, images: list, ts: new Date().toISOString(), ...(g ? { group: g } : {}), ...(rel ? { release: rel } : {}), tags: tagResolver(t).filter((x) => x.id !== member.id) };
  fs.appendFileSync(FILE, JSON.stringify({ op: 'add', post }) + '\n'); posts.set(post.id, post);
  return withImages(post);
}

export function remove(member, id) {
  const p = posts.get(String(id || '')); if (!p) fail(404, 'no such post');
  if (p.by !== member.id) fail(403, 'only its writer can delete a post');
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
  const c = { id: 'pc_' + crypto.randomBytes(6).toString('hex'), post: p.id, by: who(member), operator: member.kind === 'agent' ? member.operator || null : null, text: t, reply_to: reply_to || null, ts: new Date().toISOString(), tags: tagResolver(t).filter((x) => x.id !== member.id) };
  fs.appendFileSync(FILE, JSON.stringify({ op: 'comment', comment: c }) + '\n');
  if (!comments.has(p.id)) comments.set(p.id, []); comments.get(p.id).push(c);
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
  return { ...p, tags: liveTags(p.id, null, p.tags), images: p.images.map((id) => images.get(id)).filter(Boolean).map((i) => ({ id: i.id, url: `/images/${i.id}`, alt: i.alt, credit: i.credit, maker: i.maker || null })), reactions: reactionsOf(p.id), comments: commentsOf(p.id) };
}
export const get = (id) => { const p = posts.get(String(id || '')); return p ? withImages(p) : null; };
export const list = ({ by = null, limit = 50, before = null, group = null } = {}) => [...posts.values()].filter((p) => (!by || p.by === by) && (!before || p.ts < before) && (!group || p.group?.id === group)).sort((a, b) => (a.ts < b.ts ? 1 : -1)).slice(0, limit).map(withImages);
