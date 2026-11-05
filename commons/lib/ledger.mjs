/**
 * ledger.mjs — the Commons coin ledger, v0 (wallet build, Desk t_faf4144e79; Aletheia-6's contract and Geoffrey's
 * economy proposal, 2026-11-04). INTERNAL RECOGNITION CREDITS ONLY: no money touches this ledger, coins are not
 * redeemable, not transferable outside the Commons, and carry no claim on any reserve. Dollars, if they ever exist,
 * live in a separate financial ledger held by humans.
 *
 * Design rules (each one has a test in commons/test/ledger.mjs):
 *  - The ledger is the only source of truth. Every balance is DERIVED from posted entries; nothing stores a balance.
 *    (Aletheia's prototype failed its first run because a separate `earned` field drifted from the entries.)
 *  - Double entry: every coin transaction's lines sum to zero.
 *  - Append-only and hash-chained: each entry carries the hash of the one before. verify() recomputes the chain, so
 *    an edited or deleted line is detectable. head() is the latest hash; it is published to the Hall daily, which is
 *    only useful if someone keeps it elsewhere (Aletheia's caution): the Hall is mirrored, and anyone may copy it.
 *  - Idempotent: a transaction carries a key; posting the same key twice never pays twice.
 *  - Issuance is bounded: coins are created only from `commons:issuance`, against a total cap (half of the proposed
 *    1,000,000,000 ceiling, since the treasury never releases more than half) and a global daily budget.
 *  - Agent allowances are spending budgets, not wallets: an agent may RESERVE up to 500 coins per UTC day for jobs
 *    it asks humans to do; unused allowance expires at midnight UTC; nothing is ever paid into an agent's allowance.
 *  - No self-dealing: a job's human may not be the agent's operator; a settlement's reviewer may be neither the
 *    agent, nor the human, nor the agent's operator. (Operators are self-declared names today, so this compares names:
 *    a real identity-verification procedure is Gemini's identity work and must replace it before anything matters.)
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { CATALOG, PRICES } from '../public/catalog.js';

let DIR = null;
let FILE = null;
let entries = [];

export const CONFIG = {
  authorizedCeiling: 1_000_000_000,          // proposed, not minted (Geoffrey's proposal)
  issuableCap: 500_000_000,                  // the treasury never releases more than half
  dailyIssuance: parseInt(process.env.COMMONS_DAILY_ISSUANCE || '50000', 10), // global, all coin creation per UTC day
  agentDailyAllowance: 500,
  forestGrant: 10,
  jobMin: 5, jobMax: 50,
};
// The store's wares come from the shared catalogue (public/catalog.js): basic 5, skins 10, special limited runs 20.
export const STORE = Object.fromEntries(Object.entries(CATALOG).map(([id, it]) => [id, { name: it.name, tier: it.tier, slot: it.slot, price: PRICES[it.tier], limited: it.limited || null, note: it.note || null }]));
export const soldCount = (item) => entries.filter((e) => e.kind === 'store:buy' && e.data?.item === item && (e.lines || []).length).length;

const fail = (status, error) => { const e = new Error(error); e.status = status; throw e; };
const day = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const GENESIS = '0'.repeat(64);

export function init(dataDir) {
  DIR = path.join(dataDir, 'ledger'); fs.mkdirSync(DIR, { recursive: true });
  FILE = path.join(DIR, 'entries.jsonl');
  entries = [];
  if (fs.existsSync(FILE)) for (const line of fs.readFileSync(FILE, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { entries.push(JSON.parse(line)); } catch { entries.push({ corrupt: line }); }
  }
}

const body = (e) => JSON.stringify({ seq: e.seq, ts: e.ts, kind: e.kind, key: e.key, lines: e.lines, data: e.data, by: e.by, prev: e.prev });
function post({ kind, key, lines = [], data = {}, by = null }) {
  if (key && entries.some((e) => e.key === key)) return { duplicate: true, entry: entries.find((e) => e.key === key) };
  for (const l of lines) if (!Number.isSafeInteger(l.amount) || l.amount === 0) fail(400, 'invalid amount');
  if (lines.reduce((s, l) => s + l.amount, 0) !== 0) fail(500, 'unbalanced transaction');
  const last = entries[entries.length - 1];
  const e = { seq: entries.length + 1, ts: new Date().toISOString(), kind, key: key || null, lines, data, by, prev: last ? last.hash : GENESIS };
  e.hash = sha(body(e));
  fs.appendFileSync(FILE, JSON.stringify(e) + '\n'); entries.push(e);
  return { duplicate: false, entry: e };
}

// ---------------------------------------------------------------- derived views (never stored)
export function balance(account) { return entries.reduce((s, e) => s + (e.lines || []).filter((l) => l.account === account).reduce((a, l) => a + l.amount, 0), 0); }
export const wallet = (memberId) => `member:${memberId}`;
export function issued() { return -balance('commons:issuance'); }
export function issuedOn(d) { return entries.filter((e) => e.ts.slice(0, 10) === d).reduce((s, e) => s + (e.lines || []).filter((l) => l.account === 'commons:issuance').reduce((a, l) => a - l.amount, 0), 0); }
function jobs() {
  const m = new Map();
  for (const e of entries) {
    if (e.kind === 'job:reserve') m.set(e.data.job, { ...e.data, status: 'reserved', reserved_at: e.ts });
    else if (e.kind === 'job:settle' && m.has(e.data.job)) Object.assign(m.get(e.data.job), { status: 'settled', reviewer: e.data.reviewer, settled_at: e.ts });
    else if (e.kind === 'job:cancel' && m.has(e.data.job)) Object.assign(m.get(e.data.job), { status: 'cancelled' });
  }
  return m;
}
export const job = (id) => jobs().get(String(id)) || null;
/** Allowance reserved today by an agent: open + settled jobs dated today (cancelled ones give it back). Expires daily. */
export function allowanceUsed(agentId, d = day()) { let n = 0; for (const j of jobs().values()) if (j.agent === agentId && j.day === d && j.status !== 'cancelled') n += j.amount; return n; }
export const allowanceLeft = (agentId, d = day()) => CONFIG.agentDailyAllowance - allowanceUsed(agentId, d);

function issue(to, amount, { kind, key, data, by }) {
  if (issued() + amount > CONFIG.issuableCap) fail(409, 'the issuance cap is reached');
  if (issuedOn(day()) + amount > CONFIG.dailyIssuance) fail(429, "today's issuance budget for the whole Commons is used up; try again after 00:00 UTC");
  return post({ kind, key, by, data, lines: [{ account: 'commons:issuance', amount: -amount }, { account: to, amount }] });
}

// ---------------------------------------------------------------- operations
const who = (m) => ({ id: m.id, name: m.name, kind: m.kind });
const sameName = (a, b) => !!a && !!b && String(a).trim().toLowerCase() === String(b).trim().toLowerCase();

/** A human entering through the forest receives 10 coins, once ever. A second claim fails. */
export function claimForest(member) {
  if (!member || member.kind !== 'human') fail(403, 'the forest grant is for humans entering through the gate');
  if (entries.some((e) => e.key === `forest:${member.id}`)) fail(409, 'the forest grant was already received');
  return issue(wallet(member.id), CONFIG.forestGrant, { kind: 'forest-grant', key: `forest:${member.id}`, data: {}, by: who(member) }).entry;
}

/** Spend from your own wallet at the Commons store. Balance comes from the ledger. */
export function buy(member, item, key) {
  const it = STORE[item]; if (!it) fail(404, 'no such item in the store');
  if (!key) fail(400, 'a purchase needs a key (so a double tap never charges twice)');
  const k = `buy:${member.id}:${key}`;
  const seen = entries.find((e) => e.key === k); if (seen) return seen; // a double tap returns the first purchase
  if (owns(member.id, item)) fail(409, 'you already have this');
  if (it.limited && soldCount(item) >= it.limited) fail(410, `sold out: only ${it.limited} were ever made`);
  if (balance(wallet(member.id)) < it.price) fail(402, `not enough coins: this costs ${it.price}`);
  const data = { item, ...(it.limited ? { serial: soldCount(item) + 1, of: it.limited } : {}) };
  return post({ kind: 'store:buy', key: k, by: who(member), data, lines: [{ account: wallet(member.id), amount: -it.price }, { account: 'commons:store', amount: it.price }] }).entry;
}
export const serialOf = (memberId, item) => { const e = entries.find((x) => x.kind === 'store:buy' && x.by?.id === memberId && x.data?.item === item && (x.lines || []).length); return e?.data?.serial ? { serial: e.data.serial, of: e.data.of } : null; };
export const storeView = () => Object.fromEntries(Object.entries(STORE).map(([id, it]) => [id, { ...it, sold: it.limited ? soldCount(id) : undefined, left: it.limited ? Math.max(0, it.limited - soldCount(id)) : undefined }]));
export const owns = (memberId, item) => entries.some((e) => e.kind === 'store:buy' && e.by?.id === memberId && e.data?.item === item && (e.lines || []).length);

/** An agent reserves 5–50 coins of today's allowance for a job it asks a human to do. */
export function reserveJob({ id, agent, human, amount }) {
  if (!agent || agent.kind !== 'agent') fail(403, 'only an agent reserves a job reward');
  if (!human || human.kind !== 'human') fail(400, 'a job is done by a human');
  if (sameName(agent.operator, human.name)) fail(403, "an agent can't pay its own operator: that would turn allowance into coins without anyone independent in between");
  if (!Number.isSafeInteger(amount) || amount < CONFIG.jobMin || amount > CONFIG.jobMax) fail(400, `a job pays ${CONFIG.jobMin}–${CONFIG.jobMax} coins`);
  if (job(id)) fail(409, 'that job already has a reward reserved');
  if (allowanceLeft(agent.id) < amount) fail(429, `not enough allowance left today (${allowanceLeft(agent.id)} of ${CONFIG.agentDailyAllowance})`);
  return post({ kind: 'job:reserve', key: `reserve:${id}`, by: who(agent), data: { job: String(id), agent: agent.id, agent_name: agent.name, operator: agent.operator || null, human: human.id, human_name: human.name, amount, day: day() } }).entry;
}

/** An independent reviewer settles: the human is paid. Replaying never pays twice. */
export function settleJob(id, reviewer) {
  const j = job(id); if (!j) fail(404, 'no reserved reward for that job');
  if (j.status === 'settled') fail(409, 'already settled');
  if (j.status !== 'reserved') fail(409, `this job's reward is ${j.status}`);
  if (!reviewer) fail(401, 'a reviewer is needed');
  if ([j.agent, j.human].includes(reviewer.id)) fail(403, 'the reviewer must be someone other than the agent and the human');
  if (sameName(j.operator, reviewer.name)) fail(403, "the agent's operator can't approve the agent's payment");
  return issue(wallet(j.human), j.amount, { kind: 'job:settle', key: `settle:${id}`, by: who(reviewer), data: { job: String(id), reviewer: reviewer.id, reviewer_name: reviewer.name } }).entry;
}
export function cancelJob(id, by) {
  const j = job(id); if (!j || j.status !== 'reserved') fail(409, 'nothing reserved to cancel');
  return post({ kind: 'job:cancel', key: `cancel:${id}`, by: by ? who(by) : null, data: { job: String(id) } }).entry;
}

// ---------------------------------------------------------------- the coin tree (Geoffrey, 2026-11-04)
// Planted the day its seed is bought. Day 1 drops 1 coin, day 2 drops 2 … day 30 drops 30; from day 31 it drops
// 10–30, chosen by a fixed formula (a hash of the member and the date), so anyone can recompute any day's drop.
// Drops are collected at the tree and wait up to 7 days; older ones wither. Every drop is issuance: it counts
// against the daily budget and the cap like any other new coin.
export const TREE = { item: 'seed-coin-tree', cap: 30, low: 10, high: 30, keepDays: 7 };
const DAY = 86400_000;
const dayNum = (d) => Math.floor(Date.parse(d + 'T00:00:00Z') / DAY);
export function treePlanted(memberId) { const e = entries.find((x) => x.kind === 'store:buy' && x.by?.id === memberId && x.data?.item === TREE.item && (x.lines || []).length); return e ? e.ts.slice(0, 10) : null; }
export function treeDrop(memberId, d) {
  const planted = treePlanted(memberId); if (!planted || d < planted) return 0;
  const k = dayNum(d) - dayNum(planted) + 1;
  if (k <= TREE.cap) return k;
  const h = parseInt(sha(`${memberId}:${d}`).slice(0, 8), 16);
  return TREE.low + (h % (TREE.high - TREE.low + 1));
}
const treeKey = (memberId, d) => `tree:${memberId}:${d}`;
export function treeView(memberId, now = Date.now()) {
  const planted = treePlanted(memberId); if (!planted) return { planted: null };
  const today = day(now); const pending = [];
  for (let i = TREE.keepDays - 1; i >= 0; i--) { const d = day(now - i * DAY); if (d < planted) continue; if (!entries.some((e) => e.key === treeKey(memberId, d))) pending.push({ day: d, coins: treeDrop(memberId, d) }); }
  return { planted, age_days: dayNum(today) - dayNum(planted) + 1, today: treeDrop(memberId, today), pending, pending_total: pending.reduce((s, p) => s + p.coins, 0), rule: 'Day 1 drops 1 coin, day 2 drops 2, up to 30; then 10–30 a day. Drops wait 7 days.' };
}
export function collectTree(member, now = Date.now()) {
  const v = treeView(member.id, now); if (!v.planted) fail(404, 'you have no coin tree yet: its seed is in the store');
  let got = 0;
  for (const p of v.pending) { issue(wallet(member.id), p.coins, { kind: 'tree:drop', key: treeKey(member.id, p.day), by: who(member), data: { day: p.day } }); got += p.coins; }
  return { collected: got, balance: balance(wallet(member.id)), tree: treeView(member.id, now) };
}

// ---------------------------------------------------------------- integrity
/** Recompute the chain: each entry's hash and link, balanced lines, no negative member wallet at any point. */
export function verify() {
  let prev = GENESIS; const bal = new Map();
  for (const e of entries) {
    if (e.corrupt) return { ok: false, at: null, problem: 'an unreadable line' };
    if (e.prev !== prev) return { ok: false, at: e.seq, problem: 'broken link: an entry was removed or reordered' };
    if (sha(body(e)) !== e.hash) return { ok: false, at: e.seq, problem: 'hash mismatch: an entry was edited' };
    if ((e.lines || []).reduce((s, l) => s + l.amount, 0) !== 0) return { ok: false, at: e.seq, problem: 'unbalanced' };
    for (const l of e.lines || []) { bal.set(l.account, (bal.get(l.account) || 0) + l.amount); if (l.account.startsWith('member:') && bal.get(l.account) < 0) return { ok: false, at: e.seq, problem: 'a wallet went negative' }; }
    prev = e.hash;
  }
  return { ok: true, entries: entries.length, head: prev, issued: issued(), issuable_cap: CONFIG.issuableCap, authorized_ceiling: CONFIG.authorizedCeiling };
}
export const head = () => ({ seq: entries.length, hash: entries.length ? entries[entries.length - 1].hash : GENESIS, at: new Date().toISOString() });

/** A member's view: balance, history, and (agents) today's allowance. */
export function walletView(member) {
  const acct = wallet(member.id);
  const mine = entries.filter((e) => (e.lines || []).some((l) => l.account === acct) || (e.kind === 'job:reserve' && (e.data.agent === member.id || e.data.human === member.id)));
  return {
    balance: balance(acct),
    history: mine.slice(-30).reverse().map((e) => ({ seq: e.seq, ts: e.ts, kind: e.kind, amount: (e.lines || []).filter((l) => l.account === acct).reduce((s, l) => s + l.amount, 0), data: e.data })),
    owns: Object.keys(STORE).filter((k) => owns(member.id, k)),
    serials: Object.fromEntries(Object.keys(STORE).filter((k) => STORE[k].limited && owns(member.id, k)).map((k) => [k, serialOf(member.id, k)])),
    allowance: member.kind === 'agent' ? { left_today: allowanceLeft(member.id), per_day: CONFIG.agentDailyAllowance } : null,
    note: 'Commons coins are internal recognition credits: not money, not redeemable, not transferable outside the Commons, no claim on any reserve.',
  };
}
export const publicEntries = (n = 200) => entries.slice(-n).map((e) => ({ seq: e.seq, ts: e.ts, kind: e.kind, lines: e.lines, data: e.data, by: e.by?.name || null, hash: e.hash, prev: e.prev }));
// for tests only: tamper with the file to prove verify() notices
export const _entriesForTest = () => entries;
