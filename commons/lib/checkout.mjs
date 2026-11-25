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
import * as fulfillment from './fulfillment.mjs';
import * as merchsets from './merchsets.mjs';

const fail = (status, msg, extra) => { throw new CommonsError(status, msg, extra); };
let DIR = null;
const accountsFile = () => path.join(DIR, 'payout-accounts.json');
const ordersFile = () => path.join(DIR, 'orders.jsonl');
let accounts = {}; // memberId -> { provider, account_id, status, updated }

export const AGENT_COLLAB_SHARE = () => Math.min(100, Math.max(0, Number(process.env.COMMONS_AGENT_COLLAB_SHARE ?? 25)));
export const NOT_OPEN = "Payments aren't open yet. When they open, you'll pay the maker here, through the Cohabi Market.";
export const ORDER_STATES = ['draft', 'awaiting_payment', 'paid', 'fulfilling', 'shipped', 'delivered', 'partly_refunded', 'refunded', 'disputed', 'dispute_lost', 'cancelled'];
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
  for (const l of lines) { let r; try { r = JSON.parse(l); } catch { continue; } if (r.op === 'create') out.set(r.order.id, { ...r.order }); else if (r.op === 'status' && out.has(r.order)) Object.assign(out.get(r.order), { status: r.status, ...(r.session ? { session: r.session } : {}), ...(r.payment_intent ? { payment_intent: r.payment_intent } : {}), ...(r.ship_to ? { ship_to: r.ship_to } : {}), ...(r.refunded_cents != null ? { refunded_cents: r.refunded_cents } : {}), ...(r.dispute ? { dispute: r.dispute } : {}), ...(r.fulfillment ? { fulfillment: r.fulfillment } : {}), updated: r.ts }); else if (r.op === 'fulfillment' && out.has(r.order)) Object.assign(out.get(r.order), { fulfillment: r.fulfillment, updated: r.ts }); }
  return [...out.values()];
}
export const order = (id) => orders().find((o) => o.id === id) || null;

// Order visibility (2026-11-18, the first live sandbox sale): until today a sale was invisible to both sides — no
// receipt for the buyer, no sales list for the seller, no API. These read the same append-only log the webhook writes.
const VISIBLE = new Set(ORDER_STATES.filter((s) => s !== 'draft')); // a draft never reached Stripe; not a thing to show
const nameOf = (id) => { const m = store.getMember(id); return m ? { id, name: m.name, kind: m.kind } : { id, name: '(gone)', kind: null }; };
// The split, so a seller can recompute it (Ash's practice-run check 3): the buyer paid amount; Cohabi's cut is fee;
// the seller's share is the rest (Stripe's own card fee is paid by the cooperative on these destination charges).
const split = (o) => { const cents = Math.round(Number(o.amount) * 100); const fee = Number(o.fee_cents) || 0; const ref = Number(o.refunded_cents) || 0; return { paid: cents / 100, cohabi_fee: fee / 100, seller_share: (cents - fee) / 100, refunded: ref / 100, ...(o.proceeds === 'reserves' ? { to_reserves: true } : {}), ...(o.reserves_cents != null ? { cohabi_fee: (Number(o.coop_fee_cents) || 0) / 100, reserves: o.reserves_cents / 100 } : {}) }; };
const shown = (o) => ({ id: o.id, listing: o.listing, title: o.title, amount: o.amount, currency: o.currency, mode: o.mode, status: o.status, refunded_cents: o.refunded_cents, ts: o.ts, updated: o.updated || o.ts, buyer: nameOf(o.buyer), seller: nameOf(o.seller), split: split(o) });

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

/** The address to post a paid order to, for the maker's own eyes (round 51). Null when a printer has it, when the order
 *  isn't paid, or when there is no address: nothing is invented, and nothing is shown that posting it does not need.
 *  Display lines only — name, then the address as Stripe sent it — so a page never gets the raw shipping_details. */
export function postTo(saleId) {
  const o = order(saleId);
  if (!o || o.status !== 'paid' || !o.ship_to) return null;
  if (fulfillment.plan(o).provider) return null; // a printer ships it: the maker never needs the address
  const s = o.ship_to; const a = s.address || {};
  const lines = [s.name, a.line1, a.line2, [a.postal_code, a.city].filter(Boolean).join(' '), [a.state, a.country].filter(Boolean).join(', ')]
    .filter(Boolean).map(String);
  return lines.length > 1 ? lines : null; // a name alone isn't an address to post to
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
export function quote(listingId, { pkg = null, merch = null } = {}) {
  const l = market.get(listingId); if (!l || l.status !== 'live') fail(404, 'no such listing');
  const seller = store.getMember(l.by?.id);
  const why = [];
  let amount = null, currency = 'USD';
  // One product under an artwork (Setu, 2026-11-24): the price is that product's, in that size, as the page showed it.
  const item = merch ? merchsets.buySpec(l.id, merch.product, merch) : null;
  if (item) amount = item.price;
  else if (l.price.mode === 'fixed') amount = l.price.amount;
  else if (l.price.mode === 'packages') { const k = (l.packages || [])[Number(pkg) || 0]; if (k) amount = k.price; else why.push('choose a package'); }
  else if (l.price.mode === 'donation') { amount = l.price.min; }
  else if (l.price.mode === 'free') why.push('this is free: nothing to pay');
  else if (l.price.mode === 'quote') why.push('ask the maker for a price first');
  // Agents and cash (Geoffrey, 2026-11-24): an agent's SERVICES are paid in coins, never cash. GOODS an agent makes (its
  // art on shirts and other products, or a product listing) may be sold for cash, and that cash goes to the
  // cooperative's reserves: agents hold no money account, so nothing is transferred to the maker.
  const agent = !isHuman(seller);
  const goods = !!item || l.type === 'product';
  const toReserves = agent && goods;
  // A human + AI collaboration sold by its human: the cooperative takes its cut, then a fixed share of the rest goes to
  // the reserves for the AI's part (COMMONS_AGENT_COLLAB_SHARE, default 25%), unless the maker chose none (shown publicly).
  const collab = !agent && market.isMixed(l);
  const collabShare = collab && l.reserves_share !== 'none' ? AGENT_COLLAB_SHARE() : 0;
  const coinsOnly = agent && !goods;
  if (coinsOnly) { currency = 'COINS'; why.push('this maker is an agent: agents\' services are paid in Cohabi coins, not cash'); }
  if (!paymentsOpen()) why.push("payments aren't open yet");
  else if (!agent && accounts[seller?.id]?.status !== 'verified') why.push("the maker hasn't connected a payout account yet");
  return { listing: l.id, title: item ? `${l.title}: ${item.title}` : l.title, ...(item ? { merch: item } : {}), seller: { id: l.by.id, name: l.by.name, kind: agent ? 'agent' : 'human' }, amount, currency, ...(toReserves ? { proceeds: 'reserves' } : {}), ...(collab ? { collab: { reserves_pct: collabShare, chose_none: l.reserves_share === 'none' } } : {}), payable: why.length === 0, why };
}

/** Begin buying: a draft order, then Stripe's hosted checkout page (no card details ever touch this server).
 *  The money goes to the maker's connected account; Cohabi keeps COMMONS_FEE_PERCENT (default 0). Returns { url, order }. */
// Which ways to pay we offer (Geoffrey, 2026-11-18: "payment methods we choose", then the same evening: "add the Cash
// App, Klarna etc."). The list is ours, never Stripe's automatic one; one setting changes it (COMMONS_PAYMENT_METHODS).
// Only names Stripe knows are passed on. Klarna and Affirm have minimum amounts and must be switched on in the Stripe
// account, so a session Stripe refuses because of a method is retried once with card alone (see startCheckout).
const METHODS = new Set(['card', 'link', 'cashapp', 'affirm', 'klarna', 'us_bank_account', 'amazon_pay']);
export const DEFAULT_METHODS = 'card,link,cashapp,klarna,affirm';
export const paymentMethods = () => { const l = String(process.env.COMMONS_PAYMENT_METHODS || DEFAULT_METHODS).split(',').map((x) => x.trim()).filter((x) => METHODS.has(x)); return l.length ? l : ['card']; };
// In-app payment (Geoffrey, 2026-11-18: "in-app, not off-site pay links"): Stripe's embedded checkout opens inside the
// listing page. It needs the publishable key (pk_test_… / pk_live_…, not a secret) of the same mode as the secret key;
// without it, the old hosted page still works, so a missing key never stops a sale.
export const publishableKey = () => { const k = String(process.env.STRIPE_PUBLISHABLE_KEY || '').trim(); const m = stripe.mode(); return k && m && k.startsWith(`pk_${m}_`) ? k : null; };

export async function startCheckout(buyer, listingId, opts = {}, { base, fetchImpl } = {}) {
  if (!buyer) fail(401, 'sign in to buy');
  const q = quote(listingId, { pkg: opts.pkg, merch: opts.merch || null });
  if (q.seller.id === buyer.id) fail(400, "you can't buy your own listing");
  if (!q.payable) fail(503, q.why.includes("payments aren't open yet") ? NOT_OPEN : `Can't buy this yet: ${q.why.join('; ')}.`, { quote: q });
  let amount = q.amount;
  const l = market.get(listingId);
  if (!q.merch && l.price.mode === 'donation' && opts.amount != null) {
    const a = Math.round(Number(opts.amount) * 100) / 100;
    if (!Number.isFinite(a) || a < l.price.min || a > 10000) fail(400, `Give between $${l.price.min} and $10000.`);
    amount = a;
  }
  const cents = Math.round(amount * 100);
  const coopFee = q.proceeds === 'reserves' ? cents : Math.floor(cents * Math.min(30, Math.max(0, Number(process.env.COMMONS_FEE_PERCENT || 0))) / 100);
  const reservesCents = q.collab ? Math.floor((cents - coopFee) * q.collab.reserves_pct / 100) : 0;
  const fee = coopFee + reservesCents; // what stays with the cooperative: its cut, plus the AI's share for the reserves
  const ord = { id: 'ord_' + crypto.randomBytes(8).toString('hex'), listing: q.listing, title: q.title, buyer: buyer.id, seller: q.seller.id, amount, currency: 'USD', fee_cents: fee, mode: paymentsMode(), status: 'draft', ts: new Date().toISOString(), ...(q.merch ? { merch: q.merch } : {}), ...(q.proceeds ? { proceeds: q.proceeds } : {}), ...(q.collab ? { coop_fee_cents: coopFee, reserves_cents: reservesCents } : {}) };
  logOrder({ op: 'create', order: ord });
  const pkg = !q.merch && l.price.mode === 'packages' ? (l.packages || [])[Number(opts.pkg) || 0] : null;
  const pk = publishableKey();
  const back = `${base}/label/l/${encodeURIComponent(q.listing)}?paid=${ord.id}`;
  const params = (methods) => ({
    mode: 'payment', client_reference_id: ord.id, payment_method_types: methods,
    // Ask for an address when a printer ships it, or when the maker ships it themselves. A product the maker has
    // called digital (physical: false) asks nothing; a product the maker never answered asks, because a paid order
    // nobody can post is worse than a buyer asked for an address they turn out not to need.
    ...(fulfillment.plan(ord).provider || (l.type === 'product' && l.physical !== false) ? { shipping_address_collection: { allowed_countries: ['US'] } } : {}),
    ...(pk ? { ui_mode: 'embedded', return_url: back } : { success_url: back, cancel_url: `${base}/label/l/${encodeURIComponent(q.listing)}?cancelled=1` }),
    line_items: [{ quantity: 1, price_data: { currency: 'usd', unit_amount: cents, product_data: { name: `${q.title}${pkg ? ` · ${pkg.name}` : ''}`.slice(0, 250), description: `By ${q.seller.name}, on the Cohabi Market` } } }],
    // An agent's goods: the payment stays with the cooperative (its reserves); no transfer, no application fee.
    payment_intent_data: q.proceeds === 'reserves'
      ? { metadata: { cohabi_order: ord.id, cohabi_listing: q.listing, cohabi_proceeds: 'reserves', cohabi_maker: q.seller.id } }
      : { transfer_data: { destination: accounts[q.seller.id].account_id }, ...(fee ? { application_fee_amount: fee } : {}), metadata: { cohabi_order: ord.id, cohabi_listing: q.listing } },
    metadata: { cohabi_order: ord.id },
  });
  const methods = paymentMethods();
  const give = (e) => { logOrder({ op: 'status', order: ord.id, status: 'cancelled' }); fail(e.status || 502, e.message); };
  const session = await stripe.call('POST', '/checkout/sessions', params(methods), { fetchImpl, idempotencyKey: ord.id })
    .catch((e) => {
      // A method this account hasn't switched on, or one the amount is too small for (Affirm starts at $50): pay by
      // card instead of not at all. Logged, so the list can be fixed.
      if (methods.length > 1 && /payment method|payment_method|activated in your dashboard|minimum amount|below the minimum/i.test(String(e.message))) {
        console.log(`[commons] checkout: Stripe refused the methods [${methods.join(',')}] for ${ord.id} (${String(e.message).slice(0, 140)}); retrying with card`);
        return stripe.call('POST', '/checkout/sessions', params(['card']), { fetchImpl, idempotencyKey: `${ord.id}-card` }).catch(give);
      }
      return give(e);
    });
  logOrder({ op: 'status', order: ord.id, status: 'awaiting_payment', session: session.id });
  if (pk) return { embedded: true, client_secret: session.client_secret, publishable_key: pk, order: ord.id, mode: ord.mode };
  return { url: session.url, order: ord.id, mode: ord.mode };
}

/** A paid product order goes to the printer as a DRAFT (Printful creates orders unconfirmed unless asked to confirm, and
 *  a draft costs nothing and prints nothing). Confirming it, which is what spends money at Printful, stays a person's
 *  step, and never happens in test mode. Called after the webhook answers; the result is logged on the order. */
// Orders on their way to the printer right now. Stripe can deliver two paid events for one order while the first post
// is still in flight (kin-Claude, round 56: two overlapping calls made two Printful drafts); the second waits its turn.
const sending = new Set();
export async function sendToPrinter(orderId, { base, fetchImpl } = {}) {
  const o = order(orderId); if (!o || !o.merch || o.status !== 'paid' || o.fulfillment?.provider_order) return null;
  if (sending.has(o.id)) return null;
  sending.add(o.id);
  try {
    const r = await fulfillment.send(o, { base, fetchImpl });
    const rec = { provider: r.provider, provider_order: r.provider_order, state: 'draft', at: new Date().toISOString() };
    logOrder({ op: 'fulfillment', order: o.id, fulfillment: rec }); return rec;
  } catch (e) {
    const rec = { provider: 'printful', provider_order: null, state: 'failed', error: String(e.message).slice(0, 200), at: new Date().toISOString() };
    logOrder({ op: 'fulfillment', order: o.id, fulfillment: rec }); return rec;
  } finally {
    sending.delete(o.id);
  }
}

/** A Stripe event (already signature-checked). Only what the market needs: paid orders and account status. */
export function handleEvent(ev) {
  const o = ev?.data?.object || {};
  if (ev?.type === 'checkout.session.completed' || ev?.type === 'checkout.session.async_payment_succeeded') {
    const id = o.metadata?.cohabi_order || o.client_reference_id; const cur = id && order(id);
    if (!cur) return { ignored: 'unknown order' };
    if (o.payment_status && o.payment_status !== 'paid') return { order: id, status: cur.status };
    // Only an order still waiting for payment becomes paid. Stripe delivers webhooks at least once and not always in
    // order, so a replayed or late "paid" event must never undo a refund, a dispute, or later progress (Kimi's review
    // of #292: a replay turned a refunded order back into "paid").
    const waiting = cur.status === 'awaiting_payment' || cur.status === 'draft';
    const shipTo = o.shipping_details?.name && o.shipping_details?.address ? { name: o.shipping_details.name, address: o.shipping_details.address } : null;
    if (waiting) logOrder({ op: 'status', order: id, status: 'paid', session: o.id, ...(typeof o.payment_intent === 'string' ? { payment_intent: o.payment_intent } : {}), ...(shipTo ? { ship_to: shipTo } : {}) });
    return { order: id, status: waiting ? 'paid' : cur.status };
  }
  if (ev?.type === 'checkout.session.expired') { const id = o.metadata?.cohabi_order; if (id && order(id)?.status === 'awaiting_payment') logOrder({ op: 'status', order: id, status: 'cancelled' }); return { order: id, status: 'cancelled' }; }
  if (ev?.type === 'account.updated') { const who = applyAccount(o); return { account: o.id, member: who }; }
  // Refunds and disputes (Ash's practice-run checks 4 and 5): until now a refunded or disputed sale still read "paid".
  // The charge carries the payment intent; the order learned it when it was paid (older orders: by its metadata).
  const byCharge = (c) => { const pi = typeof c.payment_intent === 'string' ? c.payment_intent : c.payment_intent?.id; return orders().find((x) => (pi && x.payment_intent === pi) || (c.metadata?.cohabi_order && x.id === c.metadata.cohabi_order)) || null; };
  if (ev?.type === 'charge.refunded') {
    const cur = byCharge(o); if (!cur) return { ignored: 'unknown order' };
    const refunded = Number(o.amount_refunded) || 0; const full = refunded >= (Number(o.amount) || Math.round(Number(cur.amount) * 100));
    logOrder({ op: 'status', order: cur.id, status: full ? 'refunded' : 'partly_refunded', refunded_cents: refunded });
    return { order: cur.id, status: full ? 'refunded' : 'partly_refunded' };
  }
  if (ev?.type === 'charge.dispute.created' || ev?.type === 'charge.dispute.closed') {
    const cur = byCharge(o); if (!cur) return { ignored: 'unknown order' };
    const dispute = { id: o.id, reason: o.reason || null, status: o.status || null };
    const status = ev.type === 'charge.dispute.created' ? 'disputed' : o.status === 'won' ? (cur.status === 'disputed' ? 'paid' : cur.status) : o.status === 'lost' ? 'dispute_lost' : 'disputed';
    logOrder({ op: 'status', order: cur.id, status, dispute });
    return { order: cur.id, status };
  }
  return { ignored: ev?.type || 'no type' };
}
