/**
 * push.mjs — phone and desktop notifications (Web Push), with no outside library (Geoffrey, 2026-11-13: "it can ping
 * my phone. You click a button to accept being notified"). A member presses "Turn on notifications"; the browser asks
 * them; the subscription it returns is kept here, for that member only. When a message, a friend request or (for
 * stewards) a new person arrives, the server sends an encrypted push to each of that member's devices.
 *
 * Standards: RFC 8291 (message encryption, aes128gcm), RFC 8292 (VAPID: the server proves who it is), RFC 8188.
 * The server's VAPID key pair is made on first start and kept in the data folder (mode 0600), never in git.
 * What a notification says: who and what kind of thing ("New message from Ash"), never the message itself, because
 * a phone's lock screen is public. Turning it off is one button, and a dead device is forgotten automatically.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

let DIR = null; let keys = null; let subs = {}; // memberId -> [{ endpoint, keys: { p256dh, auth }, added, ua }]
let prefs = {}; // memberId -> { kinds: { [kind]: bool }, quiet: { on, from, to, tz } }
let sentLog = {}; // 'memberId|key' -> date, so a once-a-day ping (a journal reminder) goes once
/** What a member can choose to be pinged for (Geoffrey, 2026-11-13: "you should customize what you get messaged for").
 *  Defaults: on, except reactions, which come in bursts. */
export const KINDS = {
  messages: { label: 'Messages and message requests', on: true },
  friends: { label: 'Friend requests and accepts', on: true },
  comments: { label: 'Comments and replies on your posts', on: true },
  tags: { label: 'When someone tags you', on: true },
  reactions: { label: 'Reactions to your posts', on: false },
  journal: { label: 'Journal reminders, at the time you set', on: true },
  newmembers: { label: 'New people joining (stewards)', on: true, steward: true },
};
const prefsFile = () => path.join(DIR, 'prefs.json'); const sentFile = () => path.join(DIR, 'sent.json');
const saveJson = (f, v) => { const t = f + '.tmp'; fs.writeFileSync(t, JSON.stringify(v), { mode: 0o600 }); fs.renameSync(t, f); };
const b64u = (buf) => Buffer.from(buf).toString('base64url');
const fromB64u = (s) => Buffer.from(String(s || ''), 'base64url');
const subsFile = () => path.join(DIR, 'subscriptions.json');
const saveSubs = () => { const t = subsFile() + '.tmp'; fs.writeFileSync(t, JSON.stringify(subs), { mode: 0o600 }); fs.renameSync(t, subsFile()); };
const SUBJECT = () => process.env.COMMONS_PUSH_SUBJECT || 'https://cohabi.org';
const MAX_DEVICES = 10;

export function init(dataDir) {
  DIR = path.join(dataDir, 'push'); fs.mkdirSync(DIR, { recursive: true, mode: 0o700 });
  const kf = path.join(DIR, 'vapid.json');
  try { keys = JSON.parse(fs.readFileSync(kf, 'utf8')); } catch { keys = null; }
  if (!keys?.privateJwk) {
    const { privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    keys = { privateJwk: privateKey.export({ format: 'jwk' }), created: new Date().toISOString() };
    fs.writeFileSync(kf, JSON.stringify(keys), { mode: 0o600 });
  }
  try { subs = JSON.parse(fs.readFileSync(subsFile(), 'utf8')) || {}; } catch { subs = {}; }
  try { prefs = JSON.parse(fs.readFileSync(prefsFile(), 'utf8')) || {}; } catch { prefs = {}; }
  try { sentLog = JSON.parse(fs.readFileSync(sentFile(), 'utf8')) || {}; } catch { sentLog = {}; }
}

/** A member's choices, with defaults filled in. */
export function prefsOf(memberId) {
  const mine = prefs[memberId] || {}; const kinds = {};
  for (const [k, d] of Object.entries(KINDS)) kinds[k] = typeof mine.kinds?.[k] === 'boolean' ? mine.kinds[k] : d.on;
  const q = mine.quiet || {};
  return { kinds, quiet: { on: !!q.on, from: /^\d\d:\d\d$/.test(q.from) ? q.from : '22:00', to: /^\d\d:\d\d$/.test(q.to) ? q.to : '07:00', tz: typeof q.tz === 'string' && q.tz.length < 60 ? q.tz : 'America/Phoenix' } };
}
export function setPrefs(member, b = {}) {
  const cur = prefsOf(member.id); const next = { kinds: { ...cur.kinds }, quiet: { ...cur.quiet } };
  for (const k of Object.keys(KINDS)) if (typeof b.kinds?.[k] === 'boolean') next.kinds[k] = b.kinds[k];
  if (b.quiet && typeof b.quiet === 'object') {
    if (typeof b.quiet.on === 'boolean') next.quiet.on = b.quiet.on;
    for (const f of ['from', 'to']) if (/^([01]\d|2[0-3]):[0-5]\d$/.test(String(b.quiet[f] || ''))) next.quiet[f] = b.quiet[f];
    if (typeof b.quiet.tz === 'string') { try { new Intl.DateTimeFormat('en-US', { timeZone: b.quiet.tz }); next.quiet.tz = b.quiet.tz; } catch { /* unknown zone: keep the old one */ } }
  }
  prefs[member.id] = next; saveJson(prefsFile(), prefs);
  return { ...next, devices: devices(member.id) };
}
/** Is it quiet hours for this member right now? (A window may cross midnight: 22:00 to 07:00.) */
export function isQuiet(memberId, now = Date.now()) {
  const q = prefsOf(memberId).quiet; if (!q.on) return false;
  const hm = new Intl.DateTimeFormat('en-GB', { timeZone: q.tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
  return q.from <= q.to ? hm >= q.from && hm < q.to : hm >= q.from || hm < q.to;
}
/** Once-a-day guard for scheduled pings (journal reminders). */
export function onceToday(memberId, key, date) {
  const k = `${memberId}|${key}`; if (sentLog[k] === date) return false;
  sentLog[k] = date;
  for (const [x, d] of Object.entries(sentLog)) if (d < new Date(Date.now() - 3 * 86400_000).toISOString().slice(0, 10)) delete sentLog[x]; // keep it small
  saveJson(sentFile(), sentLog); return true;
}

/** The server's public key, as browsers want it (65-byte uncompressed point, base64url). */
export function publicKey() { const j = keys.privateJwk; return b64u(Buffer.concat([Buffer.from([4]), fromB64u(j.x), fromB64u(j.y)])); }

export function subscribe(member, sub = {}, ua = '') {
  const endpoint = String(sub.endpoint || ''); const p256dh = String(sub.keys?.p256dh || ''); const auth = String(sub.keys?.auth || '');
  let u; try { u = new URL(endpoint); } catch { u = null; }
  if (!u || (u.protocol !== 'https:' && !(process.env.COMMONS_PUSH_TEST_HTTP === '1' && u.hostname === '127.0.0.1'))) { const e = new Error('That subscription has no secure address.'); e.status = 400; throw e; }
  if (fromB64u(p256dh).length !== 65 || fromB64u(auth).length !== 16) { const e = new Error('That subscription is missing its keys.'); e.status = 400; throw e; }
  const list = (subs[member.id] || []).filter((s) => s.endpoint !== endpoint);
  list.push({ endpoint, keys: { p256dh, auth }, added: new Date().toISOString(), ua: String(ua || '').slice(0, 120) });
  subs[member.id] = list.slice(-MAX_DEVICES); saveSubs();
  return { ok: true, devices: subs[member.id].length };
}
export function unsubscribe(member, endpoint) {
  const before = (subs[member.id] || []).length;
  subs[member.id] = (subs[member.id] || []).filter((s) => !endpoint || s.endpoint !== endpoint);
  if (!subs[member.id].length) delete subs[member.id];
  saveSubs(); return { ok: true, removed: before - (subs[member.id] || []).length };
}
export const devices = (memberId) => (subs[memberId] || []).length;
export const subscribedMembers = () => Object.keys(subs).filter((id) => (subs[id] || []).length);

/** VAPID: a short-lived signed token naming the push service's origin (RFC 8292). */
export function vapidHeader(endpoint) {
  const aud = new URL(endpoint).origin;
  const head = b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const body = b64u(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: SUBJECT() }));
  const key = crypto.createPrivateKey({ key: keys.privateJwk, format: 'jwk' });
  const sig = crypto.sign('sha256', Buffer.from(`${head}.${body}`), { key, dsaEncoding: 'ieee-p1363' });
  return `vapid t=${head}.${body}.${b64u(sig)}, k=${publicKey()}`;
}

/** Encrypt one payload for one subscription (RFC 8291, aes128gcm). Exported for the round-trip test. */
export function encrypt(payload, sub, { salt = crypto.randomBytes(16), ecdh = null } = {}) {
  const uaPublic = fromB64u(sub.keys.p256dh); const authSecret = fromB64u(sub.keys.auth);
  const as = ecdh || crypto.createECDH('prime256v1'); if (!ecdh) as.generateKeys();
  const asPublic = as.getPublicKey(); const shared = as.computeSecret(uaPublic);
  const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0'), uaPublic, asPublic]);
  const ikm = Buffer.from(crypto.hkdfSync('sha256', shared, authSecret, keyInfo, 32));
  const cek = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16));
  const nonce = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12));
  const plain = Buffer.concat([Buffer.from(payload), Buffer.from([2])]); // one record, last-record delimiter, no padding
  const c = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const ct = Buffer.concat([c.update(plain), c.final(), c.getAuthTag()]);
  const rs = Buffer.alloc(4); rs.writeUInt32BE(4096);
  return Buffer.concat([salt, rs, Buffer.from([asPublic.length]), asPublic, ct]);
}

/** Send to every device a member turned on. Never throws: a notification is a courtesy, not part of the action. */
export async function notify(memberId, { title, body = '', url = '/', tag = null, kind = null } = {}) {
  const list = subs[memberId] || []; if (!list.length || !keys) return { sent: 0 };
  // the member's own choices: a kind they turned off, or quiet hours, means no ping (the bell on the site still has it)
  if (kind && prefsOf(memberId).kinds[kind] === false) return { sent: 0, skipped: 'turned off' };
  if (kind && isQuiet(memberId)) return { sent: 0, skipped: 'quiet hours' };
  const payload = JSON.stringify({ title: String(title || 'Cohabi').slice(0, 80), body: String(body).slice(0, 160), url: String(url || '/'), tag });
  let sent = 0; const dead = new Set();
  await Promise.all(list.map(async (s) => {
    try {
      const r = await fetch(s.endpoint, { method: 'POST', headers: { Authorization: vapidHeader(s.endpoint), 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: '86400', Urgency: 'normal' }, body: encrypt(payload, s), signal: AbortSignal.timeout(10_000) });
      if (r.status === 404 || r.status === 410) dead.add(s.endpoint); // the device unsubscribed or the browser was reset
      else if (r.ok) sent++;
      else console.error('[push]', r.status, new URL(s.endpoint).host);
    } catch (e) { console.error('[push]', e.message); }
  }));
  if (dead.size) { subs[memberId] = list.filter((s) => !dead.has(s.endpoint)); if (!subs[memberId].length) delete subs[memberId]; saveSubs(); }
  return { sent, forgotten: dead.size };
}
