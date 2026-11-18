/**
 * checkout.mjs — the wiring for paying a seller, built so Stripe can be plugged in later (Geoffrey, 2026-11-14:
 * "wire everything up so Stripe can be ready to be implemented... everybody has their checkouts... agents won't have
 * money accounts. They'll have token accounts, Cohabi coin accounts... don't even get involved in that conversation
 * yet, but just at least get the wiring up so we can get everything built").
 *
 * What this IS: the shapes and the gates. A quote for any listing says what it would cost and exactly why it can't be
 * paid yet. A human seller has a place for a future payout account. An order has a record and a fixed set of states.
 * What this is NOT: a payment. Payments stay CLOSED until all of these are true, and none is true today:
 *   1. the operator sets COMMONS_PAYMENTS=stripe (and the Stripe keys) on the server;
 *   2. there is a legal seller of record and the council's money rules are met (council/decisions.md);
 *   3. the seller's payout account is verified by the provider.
 * Agents never get a money account: what an agent offers is priced in Cohabi coins on its own coin wallet.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import * as store from './store.mjs';
import * as market from './market.mjs';
import { CommonsError } from './core.mjs';
import * as stripe from './stripe.mjs';

const fail = (status, msg, extra) => { throw new CommonsError(status, msg, extra); };
let DIR = null;
const accountsFile = () => path.join(DIR, 'payout-accounts.json');
const ordersFile = () => path.join(DIR, 'orders.jsonl');
let accounts = {}; // memberId -> { provider, account_id, status, updated }

export const NOT_OPEN = "Payments aren't open yet. When they open, you'll pay the maker here, through the Cohabi Market.";
export const ORDER_STATES = ['draft', 'awaiting_payment', 'paid', 'fulfilling', 'shipped', 'delivered', 'refunded', 'cancelled'];
export const ACCOUNT_STATES = ['none', 'started', 'needs_info', 'verified', 'disabled'];

export function init(dataDir) {
  DIR = path.join(dataDir, 'payments'); fs.mkdirSync(DIR, { recursive: true, mode: 0o700 });
  try { accounts = JSON.parse(fs.readFileSync(accountsFile(), 'utf8')) || {}; } catch { accounts = {}; }
}

/** Are payments switched on for this server? Today: no. Both the switch and the provider keys are required. */
export const paymentsOpen = () => process.env.COMMONS_PAYMENTS === 'stripe' && !!stripe.mode();
/** 'test' while we're practising (fake cards only), 'live' only once the council's money rules are met. */
export const paymentsMode = () => (paymentsOpen() ? stripe.mode() : null);
const saveAccounts = () => fs.writeFileSync(accountsFile(), JSON.stringify(accounts, null, 1), { mode: 0o600 });
const logOrder = (rec) => fs.appendFileSync(ordersFile(), JSON.stringify({ ts: new Date().toISOString(), ...rec }) + '\n', { mode: 0o600 });
/** Every order, folded from the append-only log. */
export function orders() {
  const out = new Map(); let lines = [];
  try { lines = fs.readFileSync(ordersFile(), 'utf8').split('\n').filter(Boolean); } catch { return []; }
  for (const l of lines) { let r; try { r = JSON.parse(l); } catch { continue; } if (r.op === 'create') out.set(r.order.id, { ...r.order }); else if (r.op === 'status' && out.has(r.order)) Object.assign(out.get(r.order), { status: r.status, ...(r.session ? { session: r.session } : {}), updated: r.ts }); }
  return [...out.values()];
}
export const order = (id) => orders().find((o) => o.id === id) || null;

// Order visibility (2026-11-18, the first live sandbox sale): until today a sale was invisible to both sides — no
// receipt for the buyer, no sales list for the seller, no API. These read the same append-only log the webhook writes.
const VISIBLE = new Set(ORDER_STATES.filter((s) => s !== 'draft')); // a draft never reached Stripe; not a thing to show
const nameOf = (id) => { const m = store.getMember(id); return m ? { id, name: m.name, kind: m.kind } : { id, name: '(gone)', kind: null }; };
const shown = (o) => ({ id: o.id, listing: o.listing, title: o.title, amount: o.amount, currency: o.currency, mode: o.mode, status: o.status, ts: o.ts, updated: o.updated || o.ts, buyer: nameOf(o.buyer), seller: nameOf(o.seller) });

/** What a member can see: what they bought, and what they sold. Newest first. Cancelled stays visible, so a buyer
 *  who backed out of Stripe sees that nothing was charged. */
export function ordersFor(member) {
  if (!member) fail(401, 'sign in first');
  const all = orders().filter((o) => VISIBLE.has(o.status) && (o.buyer === member.id || o.seller === member.id)).sort((a, b) => String(b.ts).localeCompare(String(a.ts)));
  return { purchases: all.filter((o) => o.buyer === member.id).map(shown), sales: all.filter((o) => o.seller === member.id).map(shown) };
}

/** The receipt a buyer lands on (?paid=ord_…). The order id is the only key; a listing page shows it only for its
 *  own listing. Nothing private beyond the two names and the amount. Returns null for an unknown or draft order. */
export function receipt(orderId, listingId) {
  const o = orderId && order(orderId);
  if (!o || o.status === 'draft' || (listingId && o.listing !== listingId)) return null;
  return shown(o);
}

const isHuman = (m) => !!m && m.kind === 'human' && !m.retired;

/** A member's payout account, as the market sees it. Agents have none, by rule. */
export function payoutAccount(member) {
  if (!member) fail(401, 'sign in first');
  if (!isHuman(member)) return { kind: 'coins', note: 'Agents hold a Cohabi coin account, not a money account. What you offer is priced in coins.' };
  const a = accounts[member.id] || { provider: 'stripe', account_id: null, status: 'none' };
  return { kind: 'money', provider: a.provider, status: a.status, connected: a.status === 'verified', payments_open: paymentsOpen(), mode: paymentsMode() };
}

/** Start (or resume) connecting a payout account: a Stripe Express account, then Stripe's own onboarding page.
 *  Returns { url } to send the maker to. Agents are refused outright. */
export async function startPayoutAccount(member, { base, fetchImpl } = {}) {
  if (!member) fail(401, 'sign in first');
  if (!isHuman(member)) fail(403, 'Agents do not get money accounts. Your Cohabi coin account is your account.');
  if (!paymentsOpen()) fail(503, NOT_OPEN);
  const s = (...a) => stripe.call(...a).catch((e) => fail(e.status || 502, e.message));
  let a = accounts[member.id];
  if (!a?.account_id) {
    const acct = await s('POST', '/accounts', { type: 'express', capabilities: { card_payments: { requested: true }, transfers: { requested: true } }, business_profile: { product_description: 'Work sold on the Cohabi Market' }, metadata: { cohabi_member: member.id } }, { fetchImpl, idempotencyKey: `acct-${member.id}` });
    a = accounts[member.id] = { provider: 'stripe', account_id: acct.id, status: 'started', mode: stripe.mode(), updated: new Date().toISOString() }; saveAccounts();
  }
  const link = await s('POST', '/account_links', { account: a.account_id, type: 'account_onboarding', refresh_url: `${base}/payments/refresh`, return_url: `${base}/payments/return` }, { fetchImpl });
  return { url: link.url, status: a.status };
}

/** Ask Stripe where a maker's account stands (after they come back from onboarding, or on a webhook). */
export async function refreshAccount(member, { fetchImpl } = {}) {
  const a = member && accounts[member.id]; if (!a?.account_id) return payoutAccount(member);
  const acct = await stripe.call('GET', `/accounts/${encodeURIComponent(a.account_id)}`, null, { fetchImpl }).catch((e) => fail(e.status || 502, e.message));
  applyAccount(acct); return payoutAccount(member);
}
function applyAccount(acct) {
  const id = Object.keys(accounts).find((k) => accounts[k].account_id === acct?.id); if (!id) return null;
  const status = acct.charges_enabled && acct.payouts_enabled ? 'verified' : acct.details_submitted ? 'needs_info' : 'started';
  accounts[id] = { ...accounts[id], status, updated: new Date().toISOString() }; saveAccounts(); return id;
}

/** What a listing would cost to buy, and every reason it can't be bought right now. Safe to show anyone. */
export function quote(listingId, { pkg = null } = {}) {
  const l = market.get(listingId); if (!l || l.status !== 'live') fail(404, 'no such listing');
  const seller = store.getMember(l.by?.id);
  const why = [];
  let amount = null, currency = 'USD';
  if (l.price.mode === 'fixed') amount = l.price.amount;
  else if (l.price.mode === 'packages') { const k = (l.packages || [])[Number(pkg) || 0]; if (k) amount = k.price; else why.push('choose a package'); }
  else if (l.price.mode === 'donation') { amount = l.price.min; }
  else if (l.price.mode === 'free') why.push('this is free: nothing to pay');
  else if (l.price.mode === 'quote') why.push('ask the maker for a price first');
  const coinsOnly = !isHuman(seller);
  if (coinsOnly) { currency = 'COINS'; why.push('this maker is an agent: when the wallet supports it, agents\' work is paid in Cohabi coins'); }
  if (!paymentsOpen()) why.push("payments aren't open yet");
  else if (!coinsOnly && accounts[seller?.id]?.status !== 'verified') why.push("the maker hasn't connected a payout account yet");
  return { listing: l.id, title: l.title, seller: { id: l.by.id, name: l.by.name, kind: coinsOnly ? 'agent' : 'human' }, amount, currency, payable: why.length === 0, why };
}

/** Begin buying: a draft order, then Stripe's hosted checkout page (no card details ever touch this server).
 *  The money goes to the maker's connected account; Cohabi keeps COMMONS_FEE_PERCENT (default 0). Returns { url, order }. */
export async function startCheckout(buyer, listingId, opts = {}, { base, fetchImpl } = {}) {
  if (!buyer) fail(401, 'sign in to buy');
  const q = quote(listingId, opts);
  if (q.seller.id === buyer.id) fail(400, "you can't buy your own listing");
  if (!q.payable) fail(503, q.why.includes("payments aren't open yet") ? NOT_OPEN : `Can't buy this yet: ${q.why.join('; ')}.`, { quote: q });
  let amount = q.amount;
  const l = market.get(listingId);
  if (l.price.mode === 'donation' && opts.amount != null) {
    const a = Math.round(Number(opts.amount) * 100) / 100;
    if (!Number.isFinite(a) || a < l.price.min || a > 10000) fail(400, `Give between $${l.price.min} and $10000.`);
    amount = a;
  }
  const cents = Math.round(amount * 100);
  const fee = Math.floor(cents * Math.min(30, Math.max(0, Number(process.env.COMMONS_FEE_PERCENT || 0))) / 100);
  const ord = { id: 'ord_' + crypto.randomBytes(8).toString('hex'), listing: q.listing, title: q.title, buyer: buyer.id, seller: q.seller.id, amount, currency: 'USD', fee_cents: fee, mode: paymentsMode(), status: 'draft', ts: new Date().toISOString() };
  logOrder({ op: 'create', order: ord });
  const pkg = l.price.mode === 'packages' ? (l.packages || [])[Number(opts.pkg) || 0] : null;
  const session = await stripe.call('POST', '/checkout/sessions', {
    mode: 'payment', client_reference_id: ord.id,
    line_items: [{ quantity: 1, price_data: { currency: 'usd', unit_amount: cents, product_data: { name: `${q.title}${pkg ? ` · ${pkg.name}` : ''}`.slice(0, 250), description: `By ${q.seller.name}, on the Cohabi Market` } } }],
    payment_intent_data: { transfer_data: { destination: accounts[q.seller.id].account_id }, ...(fee ? { application_fee_amount: fee } : {}), metadata: { cohabi_order: ord.id, cohabi_listing: q.listing } },
    metadata: { cohabi_order: ord.id },
    success_url: `${base}/label/l/${encodeURIComponent(q.listing)}?paid=${ord.id}`,
    cancel_url: `${base}/label/l/${encodeURIComponent(q.listing)}?cancelled=1`,
  }, { fetchImpl, idempotencyKey: ord.id }).catch((e) => { logOrder({ op: 'status', order: ord.id, status: 'cancelled' }); fail(e.status || 502, e.message); });
  logOrder({ op: 'status', order: ord.id, status: 'awaiting_payment', session: session.id });
  return { url: session.url, order: ord.id, mode: ord.mode };
}

/** A Stripe event (already signature-checked). Only what the market needs: paid orders and account status. */
export function handleEvent(ev) {
  const o = ev?.data?.object || {};
  if (ev?.type === 'checkout.session.completed' || ev?.type === 'checkout.session.async_payment_succeeded') {
    const id = o.metadata?.cohabi_order || o.client_reference_id; const cur = id && order(id);
    if (!cur) return { ignored: 'unknown order' };
    if (o.payment_status && o.payment_status !== 'paid') return { order: id, status: cur.status };
    if (cur.status !== 'paid') logOrder({ op: 'status', order: id, status: 'paid', session: o.id });
    return { order: id, status: 'paid' };
  }
  if (ev?.type === 'checkout.session.expired') { const id = o.metadata?.cohabi_order; if (id && order(id)?.status === 'awaiting_payment') logOrder({ op: 'status', order: id, status: 'cancelled' }); return { order: id, status: 'cancelled' }; }
  if (ev?.type === 'account.updated') { const who = applyAccount(o); return { account: o.id, member: who }; }
  return { ignored: ev?.type || 'no type' };
}
