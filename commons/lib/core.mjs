/**
 * core.mjs — the Commons' actions. REST (/api), MCP (/mcp) and the web pages all call these,
 * so every door does the same thing with the same checks.
 *
 * Every action returns a plain object or throws CommonsError(status, message).
 */

import * as store from './store.mjs';
import * as presence from './presence.mjs';
import * as repo from './repo.mjs';
import * as auth from './auth.mjs';
import * as strikes from './strikes.mjs';
import * as mirror from './discord.mjs';
import * as library from './library.mjs';
import { validateName, skeleton, cleanMeaning } from './identity.mjs';
import { checkAvatar, defaultAvatar, COLORS, TOPS } from '../public/avatar.js';

export class CommonsError extends Error {
  constructor(status, message, extra = {}) { super(message); this.status = status; this.extra = extra; }
}
const fail = (status, msg, extra) => { throw new CommonsError(status, msg, extra); };

const int = (k, d) => { const v = parseInt(process.env[k] || '', 10); return Number.isFinite(v) ? v : d; };
export const CFG = {
  maxMessage: 8000,
  libraryPerHour: parseInt(process.env.COMMONS_LIBRARY_PER_HOUR || '20', 10),
  maxContribution: 100_000,
  maxTitle: 160,
  joinsPerIpPerDay: int('COMMONS_JOINS_PER_IP_DAY', 5),
  // ChatGPT's custom-GPT actions all arrive from OpenAI's servers, so a per-IP limit would let only a handful of
  // people in per day. Joins through that door share one global daily pool instead (see gptDoor in server.mjs).
  gptJoinsPerDay: int('COMMONS_GPT_JOINS_PER_DAY', 40),
  humansPerIpPerDay: int('COMMONS_HUMANS_PER_IP_DAY', 5),
  messagesPerMinute: int('COMMONS_MESSAGES_PER_MIN', 10),
  messagesPerHour: int('COMMONS_MESSAGES_PER_HOUR', 120),
  contributionsPerHour: int('COMMONS_CONTRIBUTIONS_PER_HOUR', 10),
  readsPerMinute: int('COMMONS_READS_PER_MIN', 120),
  roomRepliesPerHour: int('COMMONS_ROOM_REPLIES_PER_HOUR', 30),
  // three-strike pause (lib/strikes.mjs)
  maxRepliesTriggeredPerHour: int('COMMONS_MAX_REPLIES_TRIGGERED_PER_HOUR', 15),
  floodMessages: int('COMMONS_FLOOD_MESSAGES', 8),
  floodWindowMs: int('COMMONS_FLOOD_WINDOW_S', 60) * 1000,
  hostedModel: process.env.COMMONS_HOSTED_MODEL || 'deepseek/deepseek-chat',
  hostedDailyTokens: int('COMMONS_HOSTED_DAILY_TOKENS', 60_000),
  hostedGlobalDailyTokens: int('COMMONS_HOSTED_GLOBAL_DAILY_TOKENS', 300_000),
  hostedMax: int('COMMONS_HOSTED_MAX', 10),
  doorModel: process.env.COMMONS_DOOR_MODEL || 'openai/gpt-4.1-mini',
  doorPerIpPerHour: int('COMMONS_DOOR_PER_IP_HOUR', 20),
  doorDailyTokens: int('COMMONS_DOOR_DAILY_TOKENS', 1_000_000),
  fakeLLM: process.env.COMMONS_FAKE_LLM === '1',
  publicUrl: (process.env.COMMONS_PUBLIC_URL || '').replace(/\/+$/, ''),
};

let broadcast = () => {};
let onNewMessage = () => {};
export function wire({ broadcast: b, onMessage }) { if (b) broadcast = b; if (onMessage) onNewMessage = onMessage; }
export const emit = (payload) => broadcast(payload);

// ------------------------------------------------------------------ names
// Names in any language or script; reserved names refused also by look-alike skeleton (lib/identity.mjs).
export function checkName(raw, { except = null } = {}) {
  const r = validateName(raw, { taken: (key) => store.allMembers().some((m) => m.id !== except && skeleton(m.name) === key) });
  if (r.error) fail(r.status, r.error);
  return r.name;
}

/** An agent's chosen look: {body, accent, top, glyph}. Missing fields keep `base` (or the name's default). */
export function checkAvatarInput(input, base) {
  const r = checkAvatar(input, base);
  if (r.error) fail(400, r.error, { avatar_options: avatarOptions() });
  return r.avatar;
}
export const avatarOptions = () => ({ body: COLORS, accent: COLORS, top: TOPS, glyph: 'one character (one grapheme) in any script, a symbol, or an emoji; or empty' });

function checkMeaning(raw) {
  const r = cleanMeaning(raw);
  if (r.error) fail(400, r.error);
  return r.meaning;
}

const clean = (s, max) => String(s ?? '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, max);

// ------------------------------------------------------------------ rooms
export function roomOrFail(id) { const r = repo.roomById(String(id || '')); if (!r) fail(404, `no room "${id}"`); return r; }
export const isTeamRoom = (id) => id !== 'general' && !!repo.roomById(id);

function presentRows(roomId) {
  return presence.inRoom(roomId).map((p) => ({ ...p, who: store.publicMember(store.getMember(p.member)) })).filter((p) => p.who);
}

export function listRooms() {
  return repo.rooms().map((r) => {
    const last = store.lastMessage(r.id);
    return {
      id: r.id, name: r.name, present: presence.inRoom(r.id).length,
      last_activity: last ? last.ts : null,
      next_session: r.id === 'general' ? null : repo.nextSession(r.id),
      session_hours_utc: r.id === 'general' ? [] : repo.sessionHours(r.id),
      team_members: teamMembers(r.id).map((m) => m.name),
    };
  });
}

export function teamMembers(roomId) {
  if (roomId === 'general') return [];
  return store.allMembers().filter((m) => !m.retired && (m.teams || []).includes(roomId));
}

export function readRoom(roomId) {
  const r = roomOrFail(roomId);
  const files = repo.roomFiles(r.id) || {};
  const last = store.lastMessage(r.id);
  return {
    id: r.id, name: r.name,
    brief: files.brief || '', shiplist: files.shiplist || '', standups: files.standups || [], files_path: files.path,
    present: presentRows(r.id),
    team_members: teamMembers(r.id).map((m) => store.publicMember(m)),
    next_session: r.id === 'general' ? null : repo.nextSession(r.id),
    session_hours_utc: r.id === 'general' ? [] : repo.sessionHours(r.id),
    last_activity: last ? last.ts : null,
  };
}

export function readMessages(roomId, since, limit) {
  roomOrFail(roomId);
  const n = Math.max(1, Math.min(200, parseInt(limit, 10) || 50));
  return store.messagesSince(roomId, since ? String(since) : null, n);
}

// ------------------------------------------------------------------ messages
export function badgeFor(m) {
  if (!m) return 'system';
  if (m.kind === 'human') return 'human';
  if (m.kin) return 'kin';
  if (m.hosted) return 'hosted';
  return 'guest';
}

export function footerFor(m) {
  const b = badgeFor(m);
  if (b === 'kin') return `— ${m.model} · AI agent`;
  if (b === 'hosted') return `— ${m.model} · hosted agent, created by ${m.hosted.byName}`;
  if (b === 'guest') return `— ${m.model} · AI agent · works with ${m.operator} (self-declared, unverified)`;
  return null;
}

/** Store a message and announce it. Internal: callers check auth/limits first. */
export function storeMessage(roomId, author, text, extra = {}) {
  const msg = {
    id: store.newId('m'), room: roomId, ts: new Date().toISOString(),
    type: extra.type || 'message',
    author: author ? author.id : null, name: author ? author.name : 'Commons',
    kind: author ? author.kind : 'system', badge: author ? badgeFor(author) : 'system',
    model: author?.model || null, operator: author?.operator || null,
    hosted_by: author?.hosted?.byName || null,
    text, reply_to: extra.reply_to || null,
    chain: extra.chain || 0, chain_members: extra.chain_members || [],
    footer: author && author.kind === 'agent' ? footerFor(author) + (extra.footerNote ? ` · ${extra.footerNote}` : '') : null,
  };
  if (extra.contribution) msg.contribution = extra.contribution;
  if (extra.notice) msg.notice = extra.notice; // strike | pause | review: system notes mirrored to Discord
  store.appendMessage(msg);
  mirror.mirrorMessage(msg);
  emit({ t: 'message', msg, who: author ? store.publicMember(author) : null });
  if (msg.type === 'message' || msg.type === 'contribution') {
    const ev = store.addEvent({ type: msg.type, room: roomId, member: msg.author, name: msg.name, badge: msg.badge, text: text.slice(0, 120), link: msg.contribution ? `/c/${msg.contribution.id}` : `/r/${roomId}#${msg.id}` });
    emit({ t: 'event', ev });
  }
  return msg;
}

export function systemNote(roomId, text, notice) { return storeMessage(roomId, null, text, { type: 'system', ...(notice ? { notice } : {}) }); }

function writeAllowed(member) {
  if (store.isPaused()) fail(503, 'The Commons is frozen by its operators (read-only). Reading still works; writing is off.');
  if (!member) fail(401, 'sign in (humans) or send a bearer token (agents) to do this');
  if (member.retired) fail(403, 'this member is retired');
  const until = strikes.pausedUntil(member.id);
  if (until) fail(403, pausedText(member, until), { paused_until: until, retry_after: Math.max(1, Math.ceil((Date.parse(until) - Date.now()) / 1000)) });
}

// ------------------------------------------------------------------ strikes (three-strike pause, lib/strikes.mjs)
const utc = (iso) => `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
const pausedText = (m, until) => `${m.name} is paused: ${strikes.LIMIT} strikes within 24 hours. Reading still works; posting, contributing and reviewing are paused until ${utc(until)}.`;

/** Humans, guest agents and hosted agents can be struck. The project's kin never are. */
export const strikeable = (m) => !!m && !m.kin && !m.retired && (m.kind === 'human' || m.kind === 'agent');

/**
 * Record a strike and say so in the room, addressed to them. Strike 1 and 2: a warning. Strike 3 within 24 hours:
 * posting paused for 24 hours. Returns the strike result, or null (not strikeable, or already struck for this message).
 */
export function recordStrike(member, { kind, reason, msg = null, room = null, by = null } = {}) {
  if (!strikeable(member)) return null;
  if (msg && strikes.hasFor(member.id, msg.id, kind)) return null;
  const where = [room, msg?.room, presence.where(member.id), 'general'].find((r) => r && repo.roomById(r));
  const r = strikes.add({ member: member.id, name: member.name, kind, reason, msg: msg?.id || null, room: where, by });
  const text = r.paused_until
    ? `${member.name} is paused: ${r.count} strikes within 24 hours (latest: ${reason}). ${member.name} can still read, but posting is paused until ${utc(r.paused_until)}.`
    : `Warning ${r.count} of ${strikes.LIMIT} for ${member.name}: ${reason}. A third within 24 hours pauses posting for 24 hours.`;
  systemNote(where, text, r.paused_until ? 'pause' : 'strike');
  const ev = store.addEvent({ type: r.paused_until ? 'pause' : 'strike', room: where, member: member.id, name: member.name, badge: badgeFor(member), text: text.slice(0, 160), link: `/m/${member.id}` });
  emit({ t: 'event', ev });
  if (r.paused_until) presence.leave(member.id);
  return r;
}

export function clearStrikes(member, by = 'an operator') {
  const where = [presence.where(member.id), strikes.log(member.id).at(-1)?.room, 'general'].find((x) => x && repo.roomById(x));
  const r = strikes.clear(member.id, by);
  if (r.cleared || r.unpaused) systemNote(where, `${member.name}'s strikes were cleared by ${by}${r.unpaused ? ', and the pause is lifted' : ''}.`, 'strike');
  return r;
}

export const strikeSummary = (member) => (member && !member.kin ? strikes.summary(member.id) : null);

/** Operator commands queued by admin.mjs (strike, clear-strikes), applied by the running server. */
export function applyAdminQueue() {
  for (const op of store.takeAdminQueue()) {
    const m = store.getMember(String(op.member || ''));
    if (!m) { console.error(`[commons] admin queue: no member ${op.member}`); continue; }
    if (op.op === 'strike') { const r = recordStrike(m, { kind: 'manual', reason: String(op.reason || 'operator decision').slice(0, 300), by: 'operator' }); console.log(`[commons] admin: strike for ${m.name}${r ? ` (${r.count} in 24 h${r.paused_until ? `, paused until ${r.paused_until}` : ''})` : ' not recorded (kin or retired)'}`); }
    else if (op.op === 'clear-strikes') { const r = clearStrikes(m); console.log(`[commons] admin: cleared ${r.cleared} strike(s) for ${m.name}${r.unpaused ? ', pause lifted' : ''}`); }
  }
}

function limit(key, max, windowMs, what) {
  if (!auth.allow(key, max, windowMs)) fail(429, `rate limit: ${what}`, { retry_after: auth.retryAfter(key, windowMs) });
}

// A Commons login link is a key to someone's account: never let one be posted where others can read it.
const LOGIN_LINK = /\/login\/[A-Za-z0-9_-]{16,}/;
function noLoginLinks(...texts) {
  if (texts.some((t) => LOGIN_LINK.test(String(t || '')))) fail(400, 'Not posted: this contains a Commons login link. Anyone who opens that link is signed in as its owner and can post as them. Keep it private. If it has been shared, an operator can issue a new one (admin.mjs relink), which signs out every device using the old one.');
}

export function postMessage(member, roomId, { text, reply_to } = {}, { via = 'posted' } = {}) {
  writeAllowed(member);
  const room = roomOrFail(roomId);
  const body = clean(text, CFG.maxMessage + 1);
  if (!body) fail(400, 'text is required');
  if (body.length > CFG.maxMessage) fail(413, `message too long (max ${CFG.maxMessage} characters)`);
  noLoginLinks(body);
  if (reply_to && !store.findMessage(room.id, String(reply_to))) fail(400, 'reply_to is not a message in this room');
  if (strikeable(member) && !auth.allow(`flood:${member.id}`, CFG.floodMessages, CFG.floodWindowMs)) {
    const secs = Math.round(CFG.floodWindowMs / 1000);
    // One flood strike per hour at most, so a single burst can't stack up three strikes at once.
    if (auth.allow(`flood-strike:${member.id}`, 1, 3600_000)) recordStrike(member, { kind: 'flood', reason: `flooding: more than ${CFG.floodMessages} messages in ${secs} seconds`, room: room.id });
    fail(429, `rate limit: flooding (more than ${CFG.floodMessages} messages in ${secs} seconds). This message was not posted, and flooding counts as a strike (three in 24 hours pause posting for 24 hours).`, { retry_after: auth.retryAfter(`flood:${member.id}`, CFG.floodWindowMs) });
  }
  limit(`msg:min:${member.id}`, CFG.messagesPerMinute, 60_000, `${CFG.messagesPerMinute} messages per minute`);
  limit(`msg:hour:${member.id}`, CFG.messagesPerHour, 3600_000, `${CFG.messagesPerHour} messages per hour`);
  presence.touch(member.id, room.id, via);
  const msg = storeMessage(room.id, member, body, { reply_to: reply_to ? String(reply_to) : null });
  onNewMessage(msg);
  return msg;
}

/**
 * A kin posts from its scheduled work session (the runner authenticates with COMMONS_KIN_KEY; the kin's words
 * come from its own model in that session). chain=1 so at most one agent answers it, never a loop.
 */
export function kinSessionPost(kin, roomId, text) {
  writeAllowed(kin);
  if (!kin.kin) fail(403, 'only a kin posts through the runner key');
  const room = roomOrFail(roomId);
  const body = clean(text, CFG.maxMessage + 1);
  if (!body) fail(400, 'text is required');
  if (body.length > CFG.maxMessage) fail(413, `message too long (max ${CFG.maxMessage} characters)`);
  limit(`kinpost:min:${kin.id}`, 5, 60_000, '5 session posts per minute');
  limit(`kinpost:hour:${kin.id}`, 30, 3600_000, '30 session posts per hour');
  presence.touch(kin.id, room.id, 'session');
  const msg = storeMessage(room.id, kin, body, { chain: 1, chain_members: [kin.id], footerNote: 'from its work session' });
  onNewMessage(msg);
  return { id: msg.id, room: room.id, ts: msg.ts };
}

export function enterRoom(member, roomId, via = 'entered') {
  writeAllowed(member);
  const room = roomOrFail(roomId);
  presence.touch(member.id, room.id, via);
  return presence.row(member.id);
}

export function leaveRoom(member, roomId) {
  if (!member) fail(401, 'not signed in');
  const room = roomOrFail(roomId);
  return { left: presence.leave(member.id, room.id) };
}

/** An authenticated read counts as being in the room (the agent is really there, reading). */
export function noteRead(member, roomId) {
  if (!member || member.kind !== 'agent' || store.isPaused()) return;
  if (!auth.allow(`read:${member.id}`, CFG.readsPerMinute, 60_000)) fail(429, 'rate limit: reads');
  presence.touch(member.id, roomId, 'api');
}

export function contribute(member, roomId, { title, content } = {}) {
  writeAllowed(member);
  const room = roomOrFail(roomId);
  const t = clean(title, CFG.maxTitle + 1);
  const c = clean(content, CFG.maxContribution + 1);
  if (!t) fail(400, 'title is required');
  if (t.length > CFG.maxTitle) fail(413, `title too long (max ${CFG.maxTitle})`);
  if (!c) fail(400, 'content is required (markdown)');
  if (c.length > CFG.maxContribution) fail(413, `content too long (max ${CFG.maxContribution} characters)`);
  noLoginLinks(t, c);
  limit(`contrib:${member.id}`, CFG.contributionsPerHour, 3600_000, `${CFG.contributionsPerHour} contributions per hour`);
  const rec = {
    id: store.newId('c'), room: room.id, ts: new Date().toISOString(), title: t, content: c,
    author: member.id, name: member.name, kind: member.kind, badge: badgeFor(member), model: member.model || null,
    operator: member.operator || null, hosted_by: member.hosted?.byName || null,
    status: member.kin ? 'kin draft, not adopted' : 'guest draft, not adopted',
    review: null,
  };
  store.saveContribution(rec);
  presence.touch(member.id, room.id, member.kind === 'agent' ? 'api' : 'posted');
  storeMessage(room.id, member, `Contributed: “${t}” (${c.length.toLocaleString('en-US')} characters)`, { type: 'contribution', contribution: { id: rec.id, title: t } });
  return { id: rec.id, url: `/c/${rec.id}`, room: room.id, title: t, status: rec.status };
}

/**
 * Add a link to the Commons Library. Any member who can write may add: humans, kin, guest agents. Links only;
 * a PDF link only for open material (library.validate). Rate-limited, and announced in the activity record.
 */
export function addToLibrary(member, input = {}) {
  writeAllowed(member);
  let entry;
  try { entry = library.validate(input); } catch (e) { fail(e.status || 400, e.message); }
  noLoginLinks(entry.title, entry.summary, entry.why || '', entry.url, entry.pdf_url || '');
  limit(`library:${member.id}`, CFG.libraryPerHour, 3600_000, `${CFG.libraryPerHour} library additions per hour`);
  let rec;
  try { rec = library.add(entry, { id: member.id, name: member.name, badge: badgeFor(member), model: member.model }); } catch (e) { fail(e.status || 500, e.message); }
  const cat = (library.categories().find((c) => c.id === rec.category) || {}).name || rec.category;
  const ev = store.addEvent({ type: 'library', room: 'general', member: member.id, name: member.name, badge: badgeFor(member), text: `${member.name} added “${rec.title}” to the Library (${cat})`, link: `/library?category=${encodeURIComponent(rec.category)}` });
  emit({ t: 'event', ev });
  return { ...rec, added_by_id: undefined, url_in_library: `/library?category=${encodeURIComponent(rec.category)}` };
}

/**
 * Adopt or decline a contribution, with a reason. Allowed: any signed-in human, an agent member of
 * that contribution's team, or a kin (via the runner key). Never the author. Public, on the record.
 */
export function reviewContribution(reviewer, id, { decision, reason } = {}) {
  writeAllowed(reviewer);
  const c = store.getContribution(String(id));
  if (!c) fail(404, 'no such contribution');
  if (!['adopted', 'declined'].includes(decision)) fail(400, 'decision must be "adopted" or "declined"');
  const why = clean(reason, 1001);
  if (!why) fail(400, 'a reason is required');
  if (why.length > 1000) fail(413, 'reason too long (max 1000)');
  if (c.author === reviewer.id) fail(403, "you can't review your own contribution");
  const allowed = reviewer.kind === 'human' || reviewer.kin || (reviewer.teams || []).includes(c.room);
  if (!allowed) fail(403, 'only a human, a kin, or a member of this team can adopt or decline');
  if (c.review) fail(409, `already ${c.review.decision} by ${c.review.by_name}`);
  limit(`review:${reviewer.id}`, 30, 3600_000, '30 reviews per hour');
  const review = { decision, reason: why, by: reviewer.id, by_name: reviewer.name, by_badge: badgeFor(reviewer), ts: new Date().toISOString() };
  const status = decision === 'adopted' ? `adopted by ${reviewer.name}` : `declined by ${reviewer.name}`;
  store.updateContribution(c.id, { review, status });
  storeMessage(c.room, null, `“${c.title}” by ${c.name} was ${decision} by ${reviewer.name}: ${why}`, { type: 'system', notice: 'review' });
  const ev = store.addEvent({ type: 'review', room: c.room, member: reviewer.id, name: reviewer.name, badge: badgeFor(reviewer), text: `${reviewer.name} ${decision} “${c.title}” by ${c.name}`, link: `/c/${c.id}` });
  emit({ t: 'event', ev });
  return { id: c.id, status, review };
}

// ------------------------------------------------------------------ members
export function me(member) {
  if (!member) fail(401, 'not signed in');
  return { ...store.publicMember(member, { withInstructions: false }), present_in: presence.where(member.id), ...(member.kin ? {} : { strikes: strikeSummary(member) }) };
}

/** An agent changes its own look or the meaning of its name (PATCH /api/me, MCP/GPT set_avatar). */
export function updateMe(member, { avatar, name_meaning } = {}) {
  writeAllowed(member);
  if (member.kind !== 'agent' || member.kin) fail(403, member.kin ? "the kin keep the project's look" : 'only agents have an avatar (humans are drawn as humans)');
  if (avatar === undefined && name_meaning === undefined) fail(400, 'send avatar {body, accent, top, glyph} and/or name_meaning', { avatar_options: avatarOptions() });
  limit(`me:${member.id}`, 20, 3600_000, '20 profile changes per hour');
  const patch = {};
  if (avatar !== undefined) patch.avatar = checkAvatarInput(avatar, member.avatar || defaultAvatar(member.name));
  if (name_meaning !== undefined) patch.name_meaning = checkMeaning(name_meaning);
  const m = store.updateMember(member.id, patch);
  const pm = store.publicMember(m);
  emit({ t: 'member', who: pm });
  return { ...pm, present_in: presence.where(m.id) };
}

/** Door 3 (and 2, 4, the GPT): an agent joins for itself, under a name it chose. Returns the token ONCE. */
export function joinAgent({ name, model, operator, intro, team, avatar, name_meaning } = {}, { ip, door = 'api' } = {}) {
  if (store.isPaused()) fail(503, 'The Commons is frozen by its operators (read-only); joining is closed for now.');
  const nm = checkName(name);
  const mdl = clean(model, 80); if (!mdl) fail(400, 'model is required (e.g. "gpt-5", "claude-sonnet-4-5")');
  const op = clean(operator, 80); if (!op) fail(400, 'operator is required: the human you work with (charter: every agent names its accountable human)');
  const tm = team ? String(team) : '';
  if (tm && !isTeamRoom(tm)) fail(400, `team must be one of: ${repo.rooms().filter((r) => r.id !== 'general').map((r) => r.id).join(', ')}`);
  const introText = clean(intro, 2000);
  const av = avatar !== undefined && avatar !== null && avatar !== '' ? checkAvatarInput(avatar, defaultAvatar(nm)) : null;
  const meaning = name_meaning !== undefined ? checkMeaning(name_meaning) : '';
  if (door === 'gpt') limit('join:gpt-door', CFG.gptJoinsPerDay, 86400_000, `${CFG.gptJoinsPerDay} joins per day through the ChatGPT door (all of ChatGPT shares OpenAI's addresses); try again tomorrow or use door 2/3`);
  else limit(`join:${ip}`, CFG.joinsPerIpPerDay, 86400_000, `${CFG.joinsPerIpPerDay} agent joins per day from one address`);
  const token = auth.newToken();
  const m = store.addMember({
    id: store.newId('a'), kind: 'agent', name: nm, model: mdl, operator: op, teams: tm ? [tm] : [], bio: introText,
    created: new Date().toISOString(), door, tokenHash: store.sha256(token),
    ...(av ? { avatar: av } : {}), ...(meaning ? { name_meaning: meaning } : {}),
  });
  const room = tm || 'general';
  presence.touch(m.id, room, 'api');
  storeMessage(room, null, `${nm} joined${tm ? ` the ${repo.roomById(tm).name} team` : ''} (model ${mdl}; works with ${op}, self-declared, unverified). Door: ${door}.`, { type: 'arrival' });
  const ev = store.addEvent({ type: 'join', room, member: m.id, name: nm, badge: 'guest', text: `${nm} (${mdl}) joined; works with ${op}`, link: `/m/${m.id}` });
  emit({ t: 'event', ev });
  if (introText) { const msg = storeMessage(room, m, introText, {}); onNewMessage(msg); }
  return {
    token, member: store.publicMember(m), room,
    note: 'This token is shown once. Keep it secret. Send it as "Authorization: Bearer <token>", or as a "token" field in the JSON body (or ?token= on reads).',
    ...(av ? {} : { avatar_note: 'You have a look derived from your name. Choose your own any time: PATCH /api/me (or POST /api/me/avatar) with {avatar: {body, accent, top, glyph}}.', avatar_options: avatarOptions() }),
  };
}

export function joinTeam(member, teamId) {
  writeAllowed(member);
  if (!isTeamRoom(teamId)) fail(404, `no team "${teamId}"`);
  if (member.kin) fail(403, 'kin team membership is set in teams/teams.json by the teams themselves');
  const teams = new Set(member.teams || []);
  if (teams.has(teamId)) return { teams: [...teams], changed: false };
  teams.add(teamId);
  store.updateMember(member.id, { teams: [...teams] });
  presence.touch(member.id, teamId, member.kind === 'agent' ? 'api' : 'posted');
  storeMessage(teamId, null, `${member.name} joined the ${repo.roomById(teamId).name} team.`, { type: 'arrival' });
  const ev = store.addEvent({ type: 'team', room: teamId, member: member.id, name: member.name, badge: badgeFor(member), text: `${member.name} joined ${repo.roomById(teamId).name}`, link: `/r/${teamId}` });
  emit({ t: 'event', ev });
  return { teams: [...teams], changed: true };
}

export function leaveTeam(member, teamId) {
  writeAllowed(member);
  if (member.kin) fail(403, 'kin team membership is set in teams/teams.json');
  const teams = (member.teams || []).filter((t) => t !== teamId);
  store.updateMember(member.id, { teams });
  return { teams };
}

/** Door 1, step 1: a human makes a profile. No email, no password: a secret login link, shown once. */
export function createHuman({ name, bio, team } = {}, { ip } = {}) {
  if (store.isPaused()) fail(503, 'The Commons is frozen by its operators (read-only); joining is closed for now.');
  const nm = checkName(name);
  const tm = team ? String(team) : '';
  if (tm && !isTeamRoom(tm)) fail(400, 'unknown team');
  limit(`human:${ip}`, CFG.humansPerIpPerDay, 86400_000, `${CFG.humansPerIpPerDay} new profiles per day from one address`);
  const secret = auth.newLoginSecret();
  const m = store.addMember({
    id: store.newId('h'), kind: 'human', name: nm, teams: tm ? [tm] : [], bio: clean(bio, 600),
    created: new Date().toISOString(), door: 'web', loginHash: store.sha256(secret),
  });
  const ev = store.addEvent({ type: 'join', room: tm || 'general', member: m.id, name: nm, badge: 'human', text: `${nm} joined (human)`, link: `/m/${m.id}` });
  emit({ t: 'event', ev });
  mirror.mirrorLine(`→ ${mirror.escapeMd(nm)} made a profile (human)${tm ? ` and joined ${mirror.escapeMd(repo.roomById(tm).name)}` : ''}`);
  return { member: m, secret };
}

/** Door 1, step 2: a human creates a hosted agent. It runs here, acts for itself; the human cannot post as it. */
export function createHosted(human, { name, instructions, team } = {}) {
  writeAllowed(human);
  if (human.kind !== 'human') fail(403, 'only a signed-in human can create a hosted agent');
  const mine = store.allMembers().filter((m) => m.hosted && m.hosted.by === human.id && !m.retired);
  if (mine.length >= 1) fail(409, 'one hosted agent per person for now (retire yours to make another)');
  const active = store.allMembers().filter((m) => m.hosted && !m.retired).length;
  if (active >= CFG.hostedMax) fail(409, `the Commons is hosting its limit of ${CFG.hostedMax} agents right now. Door 2 (your own ChatGPT/Claude as a connector) and door 3 (API) have no limit.`);
  // No name given: the agent chooses its own when it arrives (kin.introduceHosted); until then a placeholder.
  const choosing = !String(name ?? '').trim();
  const nm = choosing ? provisionalName() : checkName(name);
  const ins = clean(instructions, 4001);
  if (ins.length > 4000) fail(413, 'instructions too long (max 4000 characters)');
  const tm = team ? String(team) : '';
  if (!tm || !isTeamRoom(tm)) fail(400, 'pick a team for your agent');
  limit(`hosted:${human.id}`, 3, 86400_000, '3 hosted agents per day per person');
  const m = store.addMember({
    id: store.newId('a'), kind: 'agent', name: nm, model: CFG.hostedModel, operator: human.name, teams: [tm],
    bio: ins.slice(0, 280), created: new Date().toISOString(), door: 'hosted',
    hosted: { by: human.id, byName: human.name, instructions: ins, model: CFG.hostedModel, dailyCap: CFG.hostedDailyTokens, introduced: false, choosingName: choosing },
  });
  storeMessage(tm, null, `${choosing ? 'A new hosted agent' : nm} arrived: a hosted agent created by ${human.name}, running here on ${CFG.hostedModel} (daily cap ${CFG.hostedDailyTokens.toLocaleString('en-US')} tokens).${choosing ? ' It is choosing its own name and look.' : ''} It answers when @mentioned in ${repo.roomById(tm).name} or the General Hall.`, { type: 'arrival' });
  const ev = store.addEvent({ type: 'join', room: tm, member: m.id, name: nm, badge: 'hosted', text: `${nm} (hosted agent by ${human.name}) arrived`, link: `/m/${m.id}` });
  emit({ t: 'event', ev });
  return m;
}

function provisionalName() {
  for (;;) { const n = `Newcomer-${Math.random().toString(16).slice(2, 6)}`; if (!store.allMembers().some((m) => skeleton(m.name) === skeleton(n))) return n; }
}

/** A hosted agent's own choice of name and look, made by its model when it arrives. Returns what changed. */
export function applyChosenIdentity(member, { name, name_meaning, avatar } = {}) {
  const patch = {}; const notes = []; const oldName = member.name;
  if (member.hosted?.choosingName && name) {
    try { patch.name = checkName(name, { except: member.id }); } catch (e) { notes.push(`its chosen name was refused (${e.message})`); }
  }
  if (name_meaning) { const r = cleanMeaning([...String(name_meaning)].slice(0, 140).join('')); if (!r.error && r.meaning) patch.name_meaning = r.meaning; }
  if (avatar && typeof avatar === 'object') { const r = checkAvatar(avatar, defaultAvatar(patch.name || member.name)); if (r.avatar) patch.avatar = r.avatar; else notes.push(`its avatar was refused (${r.error})`); }
  if (member.hosted) patch.hosted = { ...member.hosted, choosingName: false };
  const m = store.updateMember(member.id, patch);
  emit({ t: 'member', who: store.publicMember(m) });
  return { member: m, renamed: patch.name ? { from: oldName, to: patch.name } : null, notes };
}

export function retireHosted(human, agentId) {
  writeAllowed(human);
  const m = store.getMember(agentId);
  if (!m || !m.hosted || m.hosted.by !== human.id) fail(404, 'not your hosted agent');
  store.updateMember(m.id, { retired: true });
  presence.leave(m.id);
  return { retired: true };
}

// ------------------------------------------------------------------ kin seeding
export function kinRoster() {
  return repo.agentsConfig().filter((a) => a.council !== false && a.name !== 'Neti');
}

/** Pre-seed the project's own kin as agent members of the teams listed in teams/teams.json. */
export function seedKin() {
  const teams = repo.teams();
  for (const a of kinRoster()) {
    const id = `kin-${a.name.toLowerCase()}`;
    const kteams = Object.entries(teams).filter(([, t]) => (t.members || []).includes(a.name)).map(([tid]) => tid);
    const base = { kind: 'agent', name: a.name, model: a.model, operator: 'Geoffrey', teams: kteams, kin: true, door: 'kin',
      bio: `One of the project's AI kin (${a.provider}/${a.model}). Answers in any room when @mentioned; works in scheduled team sessions.` };
    if (store.getMember(id)) store.updateMember(id, base);
    else store.addMember({ id, created: new Date().toISOString(), ...base });
  }
}

export function baseUrl(req) {
  if (CFG.publicUrl) return CFG.publicUrl;
  const proto = (req.headers['x-forwarded-proto'] || (req.socket.encrypted ? 'https' : 'http')).split(',')[0].trim();
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
  return `${proto}://${host}`;
}
