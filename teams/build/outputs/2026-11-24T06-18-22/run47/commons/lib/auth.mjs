/**
 * auth.mjs — bearer tokens (agents), signed session cookies (humans), rate limits.
 *
 * Tokens and login secrets are shown once and stored only as sha256 hashes.
 * Cookies: "<memberId>.<expiryMs>.<sessionVersion>.<hmac>" signed with data/secret.key, httpOnly, SameSite=Strict.
 * Bumping a member's sessionVersion (admin.mjs relink) signs out every device holding an older cookie.
 * Older three-part cookies ("<memberId>.<expiryMs>.<hmac>") count as version 0.
 */

import crypto from 'node:crypto';
import * as store from './store.mjs';

export const newToken = () => 'cmn_' + crypto.randomBytes(32).toString('base64url');
export const newLoginSecret = () => crypto.randomBytes(24).toString('base64url');

const COOKIE = 'commons_session';
const COOKIE_DAYS = 180;

function hmac(s) { return crypto.createHmac('sha256', store.cookieKey()).update(s).digest('base64url'); }

/* Passwords (2026-11-01, Geoffrey: "there needs to just be a login — what sense does it make for me
 * every time I want to log in, or anyone else"): a human may set one; it is stored as scrypt(salt, pw),
 * never plaintext. Login links and one-time codes remain as recovery paths. */
export function passwordHash(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  return { salt, hash: crypto.scryptSync(String(password), salt, 64).toString('hex') };
}
export function passwordOk(password, ph) {
  if (!ph || !ph.salt || !ph.hash) return false;
  const h = crypto.scryptSync(String(password), ph.salt, 64);
  const want = Buffer.from(ph.hash, 'hex');
  return h.length === want.length && crypto.timingSafeEqual(h, want);
}

/** `keep` true: the browser keeps the sign-in for COOKIE_DAYS. `keep` false: the browser forgets it when it is closed
 *  (Geoffrey, 2026-11-11: an unticked "Keep me signed in" means the person wants to be signed out when they leave). */
export function sessionCookie(memberId, secure, version = 0, keep = true) {
  const exp = Date.now() + (keep ? COOKIE_DAYS : 1) * 86400_000; // a session-only cookie is also refused by us after a day
  const ver = Number(version) || 0;
  const v = `${memberId}.${exp}.${ver}.${hmac(`${memberId}.${exp}.${ver}`)}`;
  return `${COOKIE}=${v}; Path=/; HttpOnly; SameSite=Strict${keep ? `; Max-Age=${COOKIE_DAYS * 86400}` : ''}${secure ? '; Secure' : ''}`;
}
export const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;

/** Sign-out: revoke the presented session cookie server-side (only this device's session; other devices stay
 * signed in). Without this, clearing the browser's copy left a replayable cookie valid for its full 180 days. */
export function revokeFromCookie(cookieHeader) {
  const v = parseCookies(cookieHeader)[COOKIE]; if (!v) return;
  if (!memberFromCookie(cookieHeader)) return; // only a genuine, live session is worth recording
  const parts = v.split('.'); if (parts.length < 3) return;
  store.revokeSession(parts[parts.length - 1], Number(parts[1]));
}

/** The parts of the presented session cookie (memberId, exp, ver, sig), or null. Used to tie an unfinished
 *  "Connect Google/GitHub" to the exact session that pressed the button (Setu, 2026-11-11). */
export function sessionParts(cookieHeader) {
  const m = memberFromCookie(cookieHeader); if (!m) return null;
  const parts = parseCookies(cookieHeader)[COOKIE].split('.');
  return parts.length === 4 ? { id: parts[0], exp: Number(parts[1]), ver: parts[2], sig: parts[3] } : { id: parts[0], exp: Number(parts[1]), ver: '0', sig: parts[2] };
}
/** True only if that session would still be accepted now: not expired, not signed out, not superseded. */
export function sessionStillLive(member, s) {
  if (!member || !s || typeof s.sig !== 'string' || s.id !== member.id) return false;
  if (!(Number(s.exp) > Date.now())) return false;
  if (store.sessionRevoked(s.sig)) return false;
  return String(Number(member.sessionVersion) || 0) === String(s.ver);
}

export function parseCookies(header) {
  const out = {};
  for (const part of String(header || '').split(';')) {
    const i = part.indexOf('='); if (i < 0) continue;
    out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

/** Returns the human member for a valid session cookie, else null. */
export function memberFromCookie(cookieHeader) {
  const v = parseCookies(cookieHeader)[COOKIE]; if (!v) return null;
  const parts = v.split('.');
  let id, exp, ver, sig, signed;
  if (parts.length === 4) { [id, exp, ver, sig] = parts; signed = `${id}.${exp}.${ver}`; }
  else if (parts.length === 3) { [id, exp, sig] = parts; ver = '0'; signed = `${id}.${exp}`; }
  else return null;
  if (!id || !exp || !sig) return null;
  const want = hmac(signed);
  if (sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  if (Date.now() > Number(exp)) return null;
  if (store.sessionRevoked(sig)) return null; // signed out: a replayed copy of this cookie is dead
  const m = store.getMember(id);
  if (!m || m.kind !== 'human' || m.retired) return null;
  return String(Number(m.sessionVersion) || 0) === ver ? m : null;
}

export function bearer(req) {
  // Connector apps put an API key in different places (Ash's Muse connector, 2026-11-06): "Authorization: Bearer <t>",
  // "Authorization: Token <t>", a bare "Authorization: cmn_…", or a key header. All carry the same token; nothing else.
  const h = String(req.headers.authorization || '').trim();
  const m = h.match(/^(?:Bearer|Token)\s+(\S+)$/i);
  if (m) return m[1];
  if (/^cmn_[A-Za-z0-9_-]{20,}$/.test(h)) return h;
  for (const k of ['x-commons-token', 'x-api-key']) { const v = String(req.headers[k] || '').trim(); if (/^cmn_[A-Za-z0-9_-]{20,}$/.test(v)) return v; }
  return null;
}

/**
 * An agent's token from the request: the bearer header, else a "token" field in the JSON body, else ?token=.
 * The body/query forms exist for clients that can't set headers (ChatGPT custom-GPT actions without auth).
 * Never logged. A query-string token can end up in a reverse proxy's access log, so the body is preferred.
 */
export function tokenFrom(req) {
  const b = bearer(req); if (b) return b;
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body.token : undefined;
  if (typeof body === 'string' && body) return body;
  const q = req.query?.token;
  return typeof q === 'string' && q ? q : null;
}

/** Constant-time string comparison (via fixed-length hashes, so lengths don't leak either). */
export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || !b) return false;
  return crypto.timingSafeEqual(crypto.createHash('sha256').update(a).digest(), crypto.createHash('sha256').update(b).digest());
}

/** The runner's shared kin key (COMMONS_KIN_KEY) from the bearer header, compared in constant time. */
export function isKinKey(req) {
  const key = process.env.COMMONS_KIN_KEY;
  return !!key && safeEqual(bearer(req) || '', key);
}

/** Sliding-window rate limiter. allow(key, max, windowMs) -> true if under the limit (and records the hit). */
const hits = new Map();
export function allow(key, max, windowMs) {
  const now = Date.now();
  const list = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (list.length >= max) { hits.set(key, list); return false; }
  list.push(now); hits.set(key, list); return true;
}
export function retryAfter(key, windowMs) {
  const list = hits.get(key) || []; if (!list.length) return 0;
  return Math.max(1, Math.ceil((list[0] + windowMs - Date.now()) / 1000));
}
setInterval(() => {
  const now = Date.now();
  for (const [k, list] of hits) if (!list.length || now - list[list.length - 1] > 86400_000) hits.delete(k);
}, 600_000).unref();
