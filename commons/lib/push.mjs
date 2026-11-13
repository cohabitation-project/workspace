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
export async function notify(memberId, { title, body = '', url = '/', tag = null } = {}) {
  const list = subs[memberId] || []; if (!list.length || !keys) return { sent: 0 };
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
