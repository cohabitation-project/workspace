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

export function sessionCookie(memberId, secure, version = 0) {
  const exp = Date.now() + COOKIE_DAYS * 86400_000;
  const ver = Number(version) || 0;
  const v = `${memberId}.${exp}.${ver}.${hmac(`${memberId}.${exp}.${ver}`)}`;
  return `${COOKIE}=${v}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${COOKIE_DAYS * 86400}${secure ? '; Secure' : ''}`;
}
export const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;

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
  const m = store.getMember(id);
  if (!m || m.kind !== 'human' || m.retired) return null;
  return String(Number(m.sessionVersion) || 0) === ver ? m : null;
}

export function bearer(req) {
  const h = req.headers.authorization || '';
  const m = h.match(/^Bearer\s+(\S+)$/i);
  return m ? m[1] : null;
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
