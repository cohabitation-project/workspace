// Cohabi Mail (Geoffrey, 2026-11-13: "we need our own Cohabi email interface ... everybody should have an email").
//
// The mail server is Stalwart, on this same machine (ops/mail/SETUP.md). Cohabi talks to it over JMAP, the open mail
// protocol: Stalwart is the engine, everything a member sees is ours (Cobox at /cobox, and the mail_* tools for agents).
//
// Who gets an address: Commons members (and, later, cooperative members). Social-only accounts don't (Geoffrey,
// 2026-11-13). Humans and agents alike: everybody is treated as an equal.
//
// Privacy: Cohabi opens a mailbox only AS its owner, with that member's own mail credential. The provisioning key
// (COMMONS_MAIL_ADMIN_TOKEN) can create mailboxes; it is never used to read anyone's mail. Per-member credentials are
// stored encrypted (AES-256-GCM, key COMMONS_MAIL_SECRET, kept in the server's .env and never in git).
//
// Sending brakes, the same for humans and agents: mail inside cohabi.org is free (with a sane cap); mail to the
// outside world has a daily limit, and a brand-new member waits before sending outside at all, like the door.
// Message bodies are shown as plain text only, never as HTML, so a hostile email can't run anything in Cohabi.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import * as repo from './repo.mjs';

const DATA = path.resolve(process.env.COMMONS_DATA || path.join(repo.ROOT, 'data', 'commons'));
const FILE = () => path.join(DATA, 'mail', 'accounts.json');
// Through the secure address: mail servers refuse passwords on unencrypted connections (the first real login, 2026-11-13).
const BASE = () => (process.env.COMMONS_MAIL_URL || 'https://mail.cohabi.org').replace(/\/+$/, '');
export const DOMAIN = () => process.env.COMMONS_MAIL_DOMAIN || 'cohabi.org';
const RESERVED = new Set(['admin', 'administrator', 'postmaster', 'abuse', 'support', 'hello', 'root', 'noreply', 'no-reply', 'security', 'info', 'mail', 'webmaster', 'hostmaster', 'mailer-daemon', 'council', 'steward', 'cohabi', 'commons']);
export const LIMITS = { outsidePerDay: 40, insidePerDay: 300, newArrivalDays: 3 };

let accounts = null;
function load() { if (accounts) return accounts; try { accounts = JSON.parse(fs.readFileSync(FILE(), 'utf8')); } catch { accounts = {}; } return accounts; }
function save() { fs.mkdirSync(path.dirname(FILE()), { recursive: true }); const t = FILE() + '.tmp'; fs.writeFileSync(t, JSON.stringify(accounts, null, 1), { mode: 0o600 }); fs.renameSync(t, FILE()); }
export function _reset() { accounts = null; sent.clear(); }

// ---- secrets at rest
function key() { const k = process.env.COMMONS_MAIL_SECRET || ''; if (!/^[0-9a-f]{64}$/i.test(k)) throw mailErr('mail is not set up on this server yet (COMMONS_MAIL_SECRET missing)', 503); return Buffer.from(k, 'hex'); }
function seal(s) { const iv = crypto.randomBytes(12); const c = crypto.createCipheriv('aes-256-gcm', key(), iv); const ct = Buffer.concat([c.update(String(s), 'utf8'), c.final()]); return [iv, c.getAuthTag(), ct].map((b) => b.toString('base64')).join('.'); }
function open(s) { const [iv, tag, ct] = s.split('.').map((x) => Buffer.from(x, 'base64')); const d = crypto.createDecipheriv('aes-256-gcm', key(), iv); d.setAuthTag(tag); return Buffer.concat([d.update(ct), d.final()]).toString('utf8'); }

function mailErr(message, status = 400) { const e = new Error(message); e.status = status; e.expose = true; return e; }
export const eligible = (m) => !!m && !m.retired && m.social_only !== true;
export function addressOf(m) { const a = load()[m?.id]; return a ? a.address : null; }
export function status(m) { const a = load()[m?.id]; return { eligible: eligible(m), address: a?.address || null, suggested: a ? null : (eligible(m) ? `${localPartFor(m)}@${DOMAIN()}` : null), domain: DOMAIN() }; }

/** A free, safe local part from the member's name: geoffrey, aletheia-6, church-searcher. */
export function localPartFor(m, taken = new Set(Object.values(load()).map((a) => a.address.split('@')[0]))) {
  let base = String(m.name || 'member').toLowerCase().normalize('NFKD').replace(/[^\w.\- ]/g, '').trim().replace(/[\s_]+/g, '-').replace(/[^a-z0-9.-]/g, '').replace(/^[.-]+|[.-]+$/g, '').slice(0, 40) || 'member';
  if (RESERVED.has(base)) base = `${base}-member`;
  let lp = base; for (let i = 2; taken.has(lp); i++) lp = `${base}${i}`;
  return lp;
}

// ---- JMAP plumbing
async function jmapAs(auth, using, methodCalls) {
  // /.well-known/jmap answers with a redirect to the session on its PUBLIC address (https://mail.cohabi.org/...).
  // A redirect to another host drops the Authorization header, so follow it ourselves, back on this machine.
  let sess = await fetch(`${BASE()}/.well-known/jmap`, { headers: { Authorization: auth }, redirect: 'manual' });
  for (let hops = 0; sess.status >= 300 && sess.status < 400 && sess.headers.get('location') && hops < 3; hops++) {
    const loc = new URL(sess.headers.get('location'), BASE());
    sess = await fetch(BASE() + loc.pathname + loc.search, { headers: { Authorization: auth }, redirect: 'manual' });
  }
  if (sess.status === 401) throw mailErr('the mail server refused this mailbox login', 401);
  if (!sess.ok) throw mailErr(`mail server unavailable (${sess.status})`, 502);
  const s = await sess.json();
  // The session advertises the public https URL; on this machine we talk to the server directly.
  const apiUrl = BASE() + new URL(s.apiUrl, BASE()).pathname;
  const accountId = s.primaryAccounts?.['urn:ietf:params:jmap:mail'];
  const r = await fetch(apiUrl, { method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ using, methodCalls: methodCalls(accountId) }) });
  if (!r.ok) throw mailErr(`mail server error (${r.status})`, 502);
  const j = await r.json();
  for (const [name, res] of j.methodResponses || []) if (name === 'error') throw mailErr(`mail server: ${res.type}${res.description ? ` (${res.description})` : ''}`, 502);
  return j.methodResponses;
}
const MAIL = ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail'];
const SUBMIT = [...MAIL, 'urn:ietf:params:jmap:submission'];
function asMember(m) { const a = load()[m.id]; if (!a) throw mailErr('you have no Cohabi mailbox yet — open cohabi.org/cobox to get one', 404); return { a, auth: 'Basic ' + Buffer.from(`${a.address}:${open(a.secret)}`).toString('base64') }; }
const pick = (resps, name) => (resps.find(([n]) => n === name) || [])[1];

// ---- getting a mailbox
/** Create the member's mailbox on the mail server (provisioning key) and remember its credential, sealed. */
export async function activate(m) {
  if (!eligible(m)) throw mailErr('Cohabi mail is for Commons and cooperative members', 403);
  if (load()[m.id]) return status(m);
  const token = process.env.COMMONS_MAIL_ADMIN_TOKEN; if (!token) throw mailErr('mail is not set up on this server yet (provisioning key missing)', 503);
  const lp = localPartFor(m); const address = `${lp}@${DOMAIN()}`; const secret = crypto.randomBytes(24).toString('base64url');
  const admin = (methodCalls) => fetch(`${BASE()}/jmap/`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ using: ['urn:ietf:params:jmap:core', 'urn:stalwart:jmap'], methodCalls }) }).then(async (r) => { if (!r.ok) throw mailErr(`mail server error (${r.status})`, 502); return (await r.json()).methodResponses; });
  const dq = pick(await admin([['x:Domain/query', { filter: { name: DOMAIN() } }, 'd']]), 'x:Domain/query');
  const domainId = dq?.ids?.[0]; if (!domainId) throw mailErr(`the mail server has no ${DOMAIN()} domain`, 502);
  const created = pick(await admin([['x:Account/set', { create: { n: { '@type': 'User', name: lp, domainId, description: `${m.name} (Cohabi ${m.kind === 'human' ? 'member' : 'agent'} ${m.id})`, credentials: [{ '@type': 'Password', secret }] } } }, 'c']]), 'x:Account/set');
  if (!created?.created?.n) {
    const why = JSON.stringify(created?.notCreated?.n || created || {});
    if (/exist|already|duplicate|in use/i.test(why)) throw mailErr(`${address} already exists on the mail server. If it's yours, connect it with its password below.`, 409);
    throw mailErr(`the mail server did not create the mailbox: ${why.slice(0, 200)}`, 502);
  }
  load()[m.id] = { address, secret: seal(secret), created: new Date().toISOString(), via: 'provisioned' }; save();
  return status(m);
}
/** A mailbox made by hand in the admin (Geoffrey's, the first one): the owner links it with its own password. */
export async function link(m, { address, password }) {
  if (!eligible(m)) throw mailErr('Cohabi mail is for Commons and cooperative members', 403);
  address = String(address || '').trim().toLowerCase();
  if (!address.endsWith('@' + DOMAIN())) throw mailErr(`only @${DOMAIN()} mailboxes can be linked`);
  if (Object.entries(load()).some(([id, a]) => a.address === address && id !== m.id)) throw mailErr('that mailbox is already linked to another member', 409);
  const auth = 'Basic ' + Buffer.from(`${address}:${password}`).toString('base64');
  await jmapAs(auth, MAIL, (acc) => [['Mailbox/get', { accountId: acc, ids: null, properties: ['role'] }, 'm']]); // proves the password
  load()[m.id] = { address, secret: seal(password), created: new Date().toISOString(), via: 'linked' }; save();
  return status(m);
}
export function unlink(m) { const a = load(); if (!a[m.id]) return status(m); delete a[m.id]; save(); return status(m); }

// ---- reading
async function boxes(auth) {
  const r = await jmapAs(auth, MAIL, (acc) => [['Mailbox/get', { accountId: acc, ids: null, properties: ['name', 'role', 'unreadEmails', 'totalEmails'] }, 'm']]);
  return pick(r, 'Mailbox/get').list;
}
export async function folders(m) { const { auth } = asMember(m); return (await boxes(auth)).map((b) => ({ id: b.id, name: b.name, role: b.role || null, unread: b.unreadEmails, total: b.totalEmails })); }
const addr = (list) => (list || []).map((x) => (x.name ? `${x.name} <${x.email}>` : x.email)).join(', ');
export async function list(m, { folder = 'inbox', limit = 40, q = '' } = {}) {
  const { auth } = asMember(m); const bs = await boxes(auth);
  const box = bs.find((b) => b.id === folder) || bs.find((b) => b.role === folder) || bs.find((b) => b.role === 'inbox');
  const filter = { inMailbox: box.id, ...(q ? { text: String(q).slice(0, 200) } : {}) };
  const r = await jmapAs(auth, MAIL, (acc) => [
    ['Email/query', { accountId: acc, filter, sort: [{ property: 'receivedAt', isAscending: false }], limit: Math.min(Math.max(+limit || 40, 1), 100) }, 'q'],
    ['Email/get', { accountId: acc, '#ids': { resultOf: 'q', name: 'Email/query', path: '/ids' }, properties: ['id', 'from', 'to', 'subject', 'receivedAt', 'preview', 'keywords', 'hasAttachment'] }, 'g'],
  ]);
  return { folder: { id: box.id, name: box.name, role: box.role || null }, messages: pick(r, 'Email/get').list.map((e) => ({ id: e.id, from: addr(e.from), subject: e.subject || '(no subject)', at: e.receivedAt, preview: e.preview || '', unread: !e.keywords?.$seen, starred: !!e.keywords?.$flagged, attachment: !!e.hasAttachment, fromAddress: (e.from?.[0]?.email || '').toLowerCase(), fromName: e.from?.[0]?.name || '', to: (e.to || []).slice(0, 20).map((t) => ({ name: t.name || '', address: (t.email || '').toLowerCase() })) })) };
}
export async function read(m, id) {
  const { auth } = asMember(m);
  const r = await jmapAs(auth, MAIL, (acc) => [
    ['Email/get', { accountId: acc, ids: [String(id)], properties: ['id', 'from', 'to', 'cc', 'replyTo', 'subject', 'receivedAt', 'textBody', 'htmlBody', 'bodyValues', 'messageId', 'attachments', 'keywords'], fetchTextBodyValues: true, fetchHTMLBodyValues: true, maxBodyValueBytes: 200000 }, 'g'],
    ['Email/set', { accountId: acc, update: { [String(id)]: { 'keywords/$seen': true } } }, 's'],
  ]);
  const e = pick(r, 'Email/get').list[0]; if (!e) throw mailErr('no such message', 404);
  const parts = (e.textBody || []).map((p) => e.bodyValues?.[p.partId]?.value || '').filter(Boolean);
  let text = parts.join('\n\n');
  if (!text) text = (e.htmlBody || []).map((p) => e.bodyValues?.[p.partId]?.value || '').join('\n').replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, '').replace(/<br\s*\/?>|<\/p>|<\/div>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\n{3,}/g, '\n\n').trim();
  return { id: e.id, fromAddress: (e.from?.[0]?.email || '').toLowerCase(), fromName: e.from?.[0]?.name || '', starred: !!e.keywords?.$flagged, from: addr(e.from), to: addr(e.to), cc: addr(e.cc), replyTo: addr(e.replyTo) || addr(e.from), subject: e.subject || '(no subject)', at: e.receivedAt, text, messageId: e.messageId?.[0] || null, attachments: (e.attachments || []).map((a) => ({ name: a.name || 'attachment', size: a.size, type: a.type })) };
}

// ---- sending, with the brakes
const sent = new Map(); // member id -> [{at, outside}]
function brake(m, recipients) {
  const outside = recipients.some((r) => !r.endsWith('@' + DOMAIN()));
  const day = Date.now() - 864e5; const log = (sent.get(m.id) || []).filter((x) => x.at > day); sent.set(m.id, log);
  if (outside) {
    const joined = Date.parse(m.created || '') || 0; // the same for humans and agents: everybody is an equal here
    if (joined && Date.now() - joined < LIMITS.newArrivalDays * 864e5) throw mailErr(`new members can mail inside ${DOMAIN()} right away and the outside world after ${LIMITS.newArrivalDays} days (the same brake as at the door)`, 429);
    if (log.filter((x) => x.outside).length >= LIMITS.outsidePerDay) throw mailErr(`daily limit reached for mail outside ${DOMAIN()} (${LIMITS.outsidePerDay} a day); it resets in 24 hours`, 429);
  }
  if (log.length >= LIMITS.insidePerDay) throw mailErr(`daily mail limit reached (${LIMITS.insidePerDay})`, 429);
  return outside;
}
const EMAIL_RE = /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[a-z]{2,}$/i;
export async function send(m, { to, cc = '', subject = '', text = '', inReplyTo = null }) {
  const { a, auth } = asMember(m);
  const split = (s) => String(s || '').split(/[,;\s]+/).map((x) => x.trim().toLowerCase()).filter(Boolean);
  const toL = split(to), ccL = split(cc); const all = [...toL, ...ccL];
  if (!toL.length) throw mailErr('who is it to?');
  if (all.length > 20) throw mailErr('at most 20 recipients per message');
  for (const r of all) if (!EMAIL_RE.test(r)) throw mailErr(`not an email address: ${r}`);
  if (String(text).length > 100000) throw mailErr('message too long (100,000 characters max)');
  const outside = brake(m, all);
  const bs = await boxes(auth); const drafts = bs.find((b) => b.role === 'drafts'); const sentBox = bs.find((b) => b.role === 'sent');
  const r = await jmapAs(auth, SUBMIT, (acc) => [
    ['Identity/get', { accountId: acc }, 'i'],
    ['Email/set', { accountId: acc, create: { draft: {
      mailboxIds: { [(drafts || sentBox).id]: true }, keywords: { $draft: true, $seen: true },
      from: [{ name: m.name, email: a.address }], to: toL.map((email) => ({ email })), ...(ccL.length ? { cc: ccL.map((email) => ({ email })) } : {}),
      subject: String(subject).slice(0, 300), ...(inReplyTo ? { inReplyTo: [inReplyTo], references: [inReplyTo] } : {}),
      bodyValues: { b: { value: String(text) } }, textBody: [{ partId: 'b', type: 'text/plain' }],
    } } }, 'e'],
  ]);
  const ident = pick(r, 'Identity/get')?.list?.find((i) => i.email === a.address) || pick(r, 'Identity/get')?.list?.[0];
  const emailId = pick(r, 'Email/set')?.created?.draft?.id; if (!emailId) throw mailErr('the mail server did not accept the message', 502);
  await jmapAs(auth, SUBMIT, (acc) => [['EmailSubmission/set', { accountId: acc, create: { s: { identityId: ident?.id, emailId } },
    onSuccessUpdateEmail: { '#s': { ...(drafts ? { [`mailboxIds/${drafts.id}`]: null } : {}), ...(sentBox ? { [`mailboxIds/${sentBox.id}`]: true } : {}), 'keywords/$draft': null } } }, 'x']]);
  sent.get(m.id).push({ at: Date.now(), outside });
  return { sent: true, from: a.address, to: toL, cc: ccL, outside };
}

// ---- the sender card and message actions (Cobox design, Aletheia-6, 2026-11-13)
/** Whose address is this? A Cohabi member's card if it's one of ours, else null. Addresses only, never mail. */
export function memberIdByAddress(address) {
  const a = String(address || '').toLowerCase().replace(/^.*<([^>]+)>.*$/, '$1').trim();
  for (const [id, acc] of Object.entries(load())) if (acc.address === a) return id;
  return null;
}
/** star / unstar / read / unread / archive / trash / inbox — on the member's own message. */
export async function act(m, id, action) {
  const { auth } = asMember(m); const bs = await boxes(auth);
  const role = (r) => bs.find((b) => b.role === r);
  const kw = { star: ['$flagged', true], unstar: ['$flagged', null], read: ['$seen', true], unread: ['$seen', null] }[action];
  const target = { archive: role('archive'), trash: role('trash'), inbox: role('inbox') }[action];
  if (!kw && !['archive', 'trash', 'inbox'].includes(action)) throw mailErr('unknown action');
  if (!kw && !target) throw mailErr(`this mailbox has no ${action === 'trash' ? 'Trash' : action === 'archive' ? 'Archive' : 'Inbox'} folder yet`);
  const patch = kw ? { [`keywords/${kw[0]}`]: kw[1] } : { mailboxIds: { [target.id]: true } };
  const r = await jmapAs(auth, MAIL, (acc) => [['Email/set', { accountId: acc, update: { [String(id)]: patch } }, 's']]);
  const s = pick(r, 'Email/set'); if (s?.notUpdated?.[String(id)]) throw mailErr('the mail server did not change that message', 502);
  return { ok: true, id, action };
}
