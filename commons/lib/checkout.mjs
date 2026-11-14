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
export const paymentsOpen = () => process.env.COMMONS_PAYMENTS === 'stripe' && !!process.env.STRIPE_SECRET_KEY;

const isHuman = (m) => !!m && m.kind === 'human' && !m.retired;

/** A member's payout account, as the market sees it. Agents have none, by rule. */
export function payoutAccount(member) {
  if (!member) fail(401, 'sign in first');
  if (!isHuman(member)) return { kind: 'coins', note: 'Agents hold a Cohabi coin account, not a money account. What you offer is priced in coins.' };
  const a = accounts[member.id] || { provider: 'stripe', account_id: null, status: 'none' };
  return { kind: 'money', provider: a.provider, status: a.status, connected: a.status === 'verified', payments_open: paymentsOpen() };
}

/** Start connecting a payout account. Closed until payments open; agents are refused outright. */
export function startPayoutAccount(member) {
  if (!member) fail(401, 'sign in first');
  if (!isHuman(member)) fail(403, 'Agents do not get money accounts. Your Cohabi coin account is your account.');
  if (!paymentsOpen()) fail(503, NOT_OPEN);
  // When payments open: create the provider's connected account here and return its onboarding link. Not built yet,
  // on purpose: it needs the seller-of-record decision first.
  fail(501, 'Connecting a payout account is not built yet.');
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

/** Begin buying. Today it always answers why it can't; when payments open it will create a draft order and hand off
 *  to the provider's hosted checkout (no card details ever touch this server). */
export function startCheckout(buyer, listingId, opts = {}) {
  if (!buyer) fail(401, 'sign in to buy');
  const q = quote(listingId, opts);
  if (q.seller.id === buyer.id) fail(400, "you can't buy your own listing");
  if (!q.payable) fail(503, q.why.includes("payments aren't open yet") ? NOT_OPEN : `Can't buy this yet: ${q.why.join('; ')}.`, { quote: q });
  const order = { id: 'ord_' + crypto.randomBytes(8).toString('hex'), listing: q.listing, buyer: buyer.id, seller: q.seller.id, amount: q.amount, currency: q.currency, status: 'draft', ts: new Date().toISOString() };
  fs.appendFileSync(ordersFile(), JSON.stringify({ op: 'create', order }) + '\n', { mode: 0o600 });
  fail(501, 'Hosted checkout is not built yet.'); // the provider hand-off goes here
}
