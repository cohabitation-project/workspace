// stripe.mjs — the small Stripe client the Cohabi Market uses (2026-11-15, Geoffrey: "get the Stripe set up").
// No SDK: Stripe's REST API takes form-encoded bodies, and four calls are all the market needs (connected account,
// onboarding link, account status, hosted checkout). Card details never touch this server: buyers pay on Stripe's
// own checkout page, and makers onboard on Stripe's own pages.
//
// TEST MODE ONLY until the council's money rules are met. A live key (sk_live_…) is refused unless the operator also
// sets COMMONS_LIVE_PAYMENTS_APPROVED to the names of the two people who approved it (council/decisions.md: no real
// money moves until there is a legal seller of record and a second approver).
import crypto from 'node:crypto';

const API = 'https://api.stripe.com/v1';
export const key = () => String(process.env.STRIPE_SECRET_KEY || '').trim();
export const keyMode = () => (key().startsWith('sk_test_') || key().startsWith('rk_test_') ? 'test' : key().startsWith('sk_live_') || key().startsWith('rk_live_') ? 'live' : null);
const liveApproved = () => String(process.env.COMMONS_LIVE_PAYMENTS_APPROVED || '').split(/[,&]| and /).map((s) => s.trim()).filter(Boolean).length >= 2;
/** 'test', 'live', or null (not usable). */
export function mode() { const m = keyMode(); if (m === 'live' && !liveApproved()) return null; return m; }

/** Stripe's form encoding: nested objects and arrays as a[b][0][c]=v. */
export function form(obj, prefix = '', out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj || {})) {
    if (v === undefined || v === null) continue;
    const name = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((x, i) => (x && typeof x === 'object' ? form(x, `${name}[${i}]`, out) : out.append(`${name}[${i}]`, String(x))));
    else if (typeof v === 'object') form(v, name, out);
    else out.append(name, String(v));
  }
  return out;
}

export class StripeError extends Error { constructor(status, msg) { super(msg); this.status = status; } }

/** One call to Stripe. fetchImpl is for tests. */
export async function call(method, path, body = null, { fetchImpl = fetch, idempotencyKey = null } = {}) {
  if (!mode()) throw new StripeError(503, keyMode() === 'live' ? 'A live Stripe key is set, but live payments are not approved yet. Use a test key (sk_test_…).' : 'Stripe is not set up on this server.');
  const headers = { Authorization: `Bearer ${key()}`, 'Stripe-Version': '2024-06-20' };
  if (body) headers['Content-Type'] = 'application/x-www-form-urlencoded';
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  let r;
  try { r = await fetchImpl(`${API}${path}`, { method, headers, body: body ? form(body).toString() : undefined }); }
  catch { throw new StripeError(502, "Couldn't reach Stripe. Try again in a minute."); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new StripeError(r.status === 401 ? 503 : 502, `Stripe said: ${j?.error?.message || `error ${r.status}`}`);
  return j;
}

/** Check a webhook's Stripe-Signature header against the endpoint secret (whsec_…). Tolerance 5 minutes. */
export function verifyWebhook(rawBody, header, secret = process.env.STRIPE_WEBHOOK_SECRET, { now = Date.now() } = {}) {
  if (!secret) throw new StripeError(503, 'webhook secret not set');
  const parts = Object.fromEntries(String(header || '').split(',').map((p) => p.split('=')).filter((p) => p.length === 2).map(([k, v]) => [k.trim(), v.trim()]));
  const sigs = String(header || '').split(',').map((p) => p.trim()).filter((p) => p.startsWith('v1=')).map((p) => p.slice(3));
  const t = Number(parts.t);
  if (!t || !sigs.length) throw new StripeError(400, 'bad signature header');
  if (Math.abs(now / 1000 - t) > 300) throw new StripeError(400, 'signature too old');
  const want = crypto.createHmac('sha256', secret).update(`${t}.${Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody)}`).digest('hex');
  const ok = sigs.some((s) => s.length === want.length && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(want)));
  if (!ok) throw new StripeError(400, 'signature does not match');
  return JSON.parse(Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody));
}
