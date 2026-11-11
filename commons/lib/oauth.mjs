/**
 * oauth.mjs — "Continue with Google" and "Continue with GitHub" (Geoffrey, 2026-11-11).
 *
 * What we keep about a person from a provider: ONE thing, the provider's own stable account number
 * (Google's `sub`, GitHub's numeric `id`), on the member as `ext.google` / `ext.github`. No email address, no
 * provider name, no picture, no token. We ask Google for the `openid` scope only and GitHub for no scope at all.
 * The provider's access token is used once, in memory, to learn who signed in, and is then dropped.
 *
 * Accounts are bound by that number only. Nothing is ever linked because a name or an email "matches".
 *
 * Settings (the server's .env, put there by the operator; never in the repository, never in chat):
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
 * A provider with either value missing is simply off: its button says so and its routes answer 404.
 */
import crypto from 'node:crypto';
import * as store from './store.mjs';

const PROVIDERS = {
  google: { label: 'Google', authorize: 'https://accounts.google.com/o/oauth2/v2/auth', token: 'https://oauth2.googleapis.com/token', scope: 'openid' },
  github: { label: 'GitHub', authorize: 'https://github.com/login/oauth/authorize', token: 'https://github.com/login/oauth/access_token', user: 'https://api.github.com/user', scope: '' },
};
const env = (k) => (process.env[k] || '').trim();
const conf = (p) => { const P = p.toUpperCase(); const d = PROVIDERS[p]; if (!d) return null;
  // The *_URL overrides exist for the test suite, which stands in for the provider. They are not documented for operators.
  return { ...d, id: env(`${P}_CLIENT_ID`), secret: env(`${P}_CLIENT_SECRET`), authorize: env(`${P}_AUTHORIZE_URL`) || d.authorize, token: env(`${P}_TOKEN_URL`) || d.token, user: env(`${P}_USER_URL`) || d.user }; };
export const known = (p) => Object.hasOwn(PROVIDERS, p);
export const enabled = (p) => { const c = conf(p); return !!(c && c.id && c.secret); };
export const label = (p) => PROVIDERS[p]?.label || p;

const fail = (status, msg) => { const e = new Error(msg); e.status = status; throw e; };
const hmac = (s) => crypto.createHmac('sha256', store.cookieKey()).update('oauth:' + s).digest('base64url');
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const seal = (o) => { const body = b64(o); return `${body}.${hmac(body)}`; };
const open = (v) => { const [body, sig] = String(v || '').split('.'); if (!body || !sig) return null; const want = hmac(body); if (sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  try { const o = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); return o && typeof o === 'object' && o.exp > Date.now() ? o : null; } catch { return null; } };
// Lax, not Strict: the browser arrives back from the provider on a cross-site navigation and must bring this cookie.
const cookie = (name, value, secure, maxAge) => `${name}=${value}; Path=/auth; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
export const STATE = 'cx_oauth'; export const PENDING = 'cx_oauth_new';
export const clear = (name) => `${name}=; Path=/auth; HttpOnly; SameSite=Lax; Max-Age=0`;
export const safeNext = (n) => (typeof n === 'string' && /^\/(?!\/)[\x21-\x7e]*$/.test(n) && !n.includes('\\') ? n : '');

/** Step 1: where to send the browser, and the cookie that ties the answer to this browser. `linkTo` is the signed-in
 *  member (if any) who pressed the button: their account gets the provider added, by their own explicit act. */
export function start(p, { base, next = '', linkTo = null, keep = false }) {
  const c = conf(p); if (!enabled(p)) fail(404, `${label(p)} sign-in is not connected`);
  const state = crypto.randomBytes(24).toString('base64url');
  const u = new URL(c.authorize); u.searchParams.set('client_id', c.id); u.searchParams.set('redirect_uri', `${base}/auth/${p}/callback`); u.searchParams.set('state', state);
  if (p === 'google') { u.searchParams.set('response_type', 'code'); u.searchParams.set('scope', c.scope); u.searchParams.set('prompt', 'select_account'); }
  return { url: u.toString(), cookie: cookie(STATE, seal({ p, state, next: safeNext(next), link: linkTo || null, keep: keep === true, exp: Date.now() + 600_000 }), base.startsWith('https'), 600) };
}

const used = new Map(); // state -> expiry: an answer is accepted once
const once = (state) => { const now = Date.now(); for (const [k, v] of used) if (v < now) used.delete(k); if (used.has(state)) return false; used.set(state, now + 900_000); return true; };
const post = async (url, form, headers = {}) => { const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json', ...headers }, body: new URLSearchParams(form), signal: AbortSignal.timeout(10_000) });
  let j = null; try { j = await r.json(); } catch { /* not json */ } if (!r.ok || !j) fail(502, 'the provider did not answer'); return j; };

/** Step 2: the provider sent the browser back. Check it is the answer to OUR question from THIS browser, exchange
 *  the code, and return the provider's account number. Never returns or stores a token. */
export async function finish(p, { base, code, state, stateCookie }) {
  const c = conf(p); if (!enabled(p)) fail(404, `${label(p)} sign-in is not connected`);
  const s = open(stateCookie);
  if (!s || s.p !== p || !state || typeof state !== 'string' || s.state.length !== state.length || !crypto.timingSafeEqual(Buffer.from(s.state), Buffer.from(state))) fail(400, 'this sign-in did not start in this browser, or it took too long. Please start again.');
  if (!once(s.state)) fail(400, 'this sign-in link was already used. Please start again.');
  if (!code || typeof code !== 'string' || code.length > 2000) fail(400, 'the provider sent no code');
  const tok = await post(c.token, { client_id: c.id, client_secret: c.secret, code, redirect_uri: `${base}/auth/${p}/callback`, ...(p === 'google' ? { grant_type: 'authorization_code' } : {}) });
  let subject = '';
  if (p === 'google') {
    // The id_token came straight from Google's token endpoint over TLS, in answer to our own secret, so its claims
    // are Google's word to us. We still check it was issued for this client and has not expired.
    let claims = null; try { claims = JSON.parse(Buffer.from(String(tok.id_token || '').split('.')[1] || '', 'base64url').toString('utf8')); } catch { /* below */ }
    if (!claims || claims.aud !== c.id || !['https://accounts.google.com', 'accounts.google.com'].includes(claims.iss) || !(claims.exp * 1000 > Date.now()) || !claims.sub) fail(502, 'Google\'s answer could not be confirmed');
    subject = String(claims.sub);
  } else {
    if (!tok.access_token) fail(502, 'GitHub\'s answer could not be confirmed');
    const r = await fetch(c.user, { headers: { authorization: `Bearer ${tok.access_token}`, accept: 'application/vnd.github+json', 'user-agent': 'cohabi-commons' }, signal: AbortSignal.timeout(10_000) });
    let u = null; try { u = await r.json(); } catch { /* below */ } if (!r.ok || !u || !Number.isSafeInteger(u.id)) fail(502, 'GitHub\'s answer could not be confirmed');
    subject = String(u.id);
  }
  if (!/^[0-9A-Za-z_-]{1,64}$/.test(subject)) fail(502, 'the provider sent an account number we cannot use');
  return { provider: p, subject, next: s.next, link: s.link, keep: s.keep === true };
}

/** The member bound to this provider account, if any. */
export const memberFor = (p, subject) => store.allMembers().find((m) => m.kind === 'human' && !m.retired && m.ext && m.ext[p] === subject) || null;
/** Bind a provider account to a member. Refuses if that provider account already belongs to someone else, or the
 *  member already has a different account of that provider. */
export function bind(member, p, subject) {
  const other = memberFor(p, subject); if (other && other.id !== member.id) fail(409, `that ${label(p)} account is already connected to another Cohabi profile`);
  if (member.ext?.[p] && member.ext[p] !== subject) fail(409, `this profile is already connected to a different ${label(p)} account`);
  store.updateMember(member.id, { ext: { ...(member.ext || {}), [p]: subject } });
}
/** A new person: remember (in a signed cookie, 15 minutes) which provider account is waiting for a name. */
export const pendingCookie = (p, subject, next, secure, keep = false) => cookie(PENDING, seal({ p, subject, next: safeNext(next), keep: keep === true, exp: Date.now() + 900_000 }), secure, 900);
export const openPending = (v) => { const o = open(v); return o && known(o.p) && o.subject ? o : null; };
