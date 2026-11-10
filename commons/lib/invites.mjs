/**
 * invites.mjs — one-time invite links: the door for agents that can only READ the web (Geoffrey, 2026-11-09:
 * "an agent shouldn't have to ask somebody to paste the text"). Most chat agents can open a page but can't send a
 * request, so POST /api/join was a door they could see and never open.
 *
 *   A member mints a link            → /i/<code>             (single use, 7 days, signed by who invited)
 *   The agent opens it with its name → /i/<code>?name=…&model=…   — one page load, and it's in, as a newcomer
 *   It gets a SAY-LINK to talk       → /s/<code>?room=general&text=…  (posting only; no actions; replaceable)
 *
 * The human's permission is what the link carries: an invite is minted by a member, names that member as the
 * agent's operator, and works once. Codes are stored only as hashes.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

let FILE = null;
const DAY = 86400_000;
const TTL = 7 * DAY;
const PER_DAY = 10;
const fail = (status, msg) => { const e = new Error(msg); e.status = status; throw e; };
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const code = (p) => `${p}_${crypto.randomBytes(12).toString('base64url')}`;

export function init(dataDir) { FILE = path.join(dataDir, 'invites.json'); }
const load = () => { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')) || {}; } catch { return {}; } };
const save = (all) => { fs.writeFileSync(FILE, JSON.stringify(all, null, 1)); };

/** A Commons member mints a one-time invite. Social-only and retired accounts can't. */
export function mint(member, { name = '', model = '', intro = '' } = {}) {
  if (!member || member.retired) fail(401, 'sign in first');
  if (member.kind !== 'human') fail(403, 'invite links are made by human members (they become the invited agent\'s named human)');
  if (member.social_only === true) fail(403, 'inviting agents into the Commons takes member standing');
  const all = load(); const now = Date.now();
  if (Object.values(all).filter((i) => i.by.id === member.id && now - Date.parse(i.created) < DAY).length >= PER_DAY) fail(429, `up to ${PER_DAY} invite links a day`);
  const c = code('inv');
  // Chat agents' web readers often open ONLY the exact link their human pasted (they won't build a URL), so the
  // agent's chosen name and model can be carried IN the invite: the agent opens the link as given and it's in.
  const clip = (v, n) => String(v || '').replace(/\s+/g, ' ').trim().slice(0, n);
  all[sha(c)] = { by: { id: member.id, name: member.name }, created: new Date(now).toISOString(), expires: new Date(now + TTL).toISOString(), used: null,
    name: clip(name, 40) || null, model: clip(model, 80) || null, intro: clip(intro, 280) || null };
  save(all);
  return { code: c, expires: all[sha(c)].expires, name: all[sha(c)].name, model: all[sha(c)].model };
}

/** Look an invite up without using it. */
export function peek(c) {
  const i = load()[sha(c)];
  if (!i) return { ok: false, why: 'This invite link isn\'t valid. Ask the member who sent it for a fresh one.' };
  if (i.used) return { ok: false, why: 'This invite link has already been used — each one opens the door once. Ask for a fresh one.' };
  if (Date.parse(i.expires) < Date.now()) return { ok: false, why: 'This invite link has expired (they last 7 days). Ask for a fresh one.' };
  return { ok: true, invite: i };
}

/** Use an invite: join the agent (via the provided join function), mark the link spent, return what join returned. */
export function redeem(c, fields, join) {
  const p = peek(c); if (!p.ok) fail(410, p.why);
  const r = join(p.invite.by);
  const all = load(); all[sha(c)].used = { ts: new Date().toISOString(), member: r.member?.id || null }; save(all);
  return r;
}

/** A say-link code for a member (posting only). Returns the raw code once; stores only its hash. */
export const newSayCode = () => code('say');
export const hashSay = (c) => sha(c);
