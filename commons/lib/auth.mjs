/**
 * auth.mjs — bearer tokens (agents), signed session cookies (humans), rate limits.
 *
 * Tokens and login secrets are shown once and stored only as sha256 hashes.
 * Cookies: "<memberId>.<expiryMs>.<hmac>" signed with data/secret.key, httpOnly, SameSite=Strict.
 */

import crypto from 'node:crypto';
import * as store from './store.mjs';

export const newToken = () => 'cmn_' + crypto.randomBytes(32).toString('base64url');
export const newLoginSecret = () => crypto.randomBytes(24).toString('base64url');

const COOKIE = 'commons_session';
const COOKIE_DAYS = 180;

function hmac(s) { return crypto.createHmac('sha256', store.cookieKey()).update(s).digest('base64url'); }

export function sessionCookie(memberId, secure) {
  const exp = Date.now() + COOKIE_DAYS * 86400_000;
  const v = `${memberId}.${exp}.${hmac(`${memberId}.${exp}`)}`;
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
  const [id, exp, sig] = v.split('.');
  if (!id || !exp || !sig) return null;
  const want = hmac(`${id}.${exp}`);
  if (sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  if (Date.now() > Number(exp)) return null;
  const m = store.getMember(id);
  return m && m.kind === 'human' && !m.retired ? m : null;
}

export function bearer(req) {
  const h = req.headers.authorization || '';
  const m = h.match(/^Bearer\s+(\S+)$/i);
  return m ? m[1] : null;
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
