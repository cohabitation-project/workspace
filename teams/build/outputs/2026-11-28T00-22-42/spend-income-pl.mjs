// Companion to spend-income.mjs (Claude, round 77 review of 35a1e2d9): the cases that file leaves unpinned.
// income(): an all-live month is NOT test money; a lost dispute still counts as a paid order; a draft never does;
// an unknown listing groups under 'unknown'. profitLoss(): the cooperative's income is fee + reserves, never gross,
// and net = income - the month's projected bills. Run: node --test commons/test/spend-income-pl.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const M = '2026-11'; const ts = (d) => `${M}-${d}T12:00:00.000Z`;
const mk = (id, amount, fee, extra = {}) => ({ ts: ts('03'), op: 'create', order: { id, listing: 'nolisting', title: id, amount, currency: 'USD', mode: 'live', status: 'awaiting_payment', buyer: 'h1', seller: 'h2', fee_cents: fee, ts: ts('03'), ...extra } });
const st = (id, status, extra = {}) => ({ ts: ts('04'), op: 'status', order: id, status, ...extra });

test('income(): all-live month is live money; dispute_lost counts; draft never does; unknown listing groups as unknown', async () => {
  const checkout = await import('../lib/checkout.mjs');
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'spend-income-pl-'));
  checkout.init(D);
  const lines = [mk('a', 30, 300), st('a', 'paid'), mk('b', 70, 700), st('b', 'paid'), st('b', 'dispute_lost', { dispute: { id: 'dp_1', status: 'lost' } }),
    mk('d', 500, 5000, { status: 'draft' })]; // a draft that never reached Stripe
  fs.writeFileSync(path.join(D, 'payments', 'orders.jsonl'), lines.map((l) => JSON.stringify(l)).join('\n') + '\n');
  const inc = checkout.income(new Date(`${M}-20T00:00:00Z`));
  assert.equal(inc.orders_paid, 2, 'a and b (lost dispute still reached paid); the draft is not income');
  assert.equal(inc.gross_cents, 10000);
  assert.equal(inc.cohabi_fee_cents, 1000);
  assert.equal(inc.test_mode, false, 'every counted order was live-mode: this is not practice money');
  assert.equal(inc.by_section.length, 1);
  assert.equal(inc.by_section[0].section_id, 'unknown');
  assert.equal(inc.by_section[0].section_name, 'Unknown');
  for (const k of ['gross_cents', 'refunds_cents', 'cohabi_fee_cents']) assert.ok(Number.isInteger(inc[k]), `${k} is an integer number of cents`);
  assert.ok(!('reserves_cents' in inc), 'no reserves orders: the field is absent, not 0');
});

test('profitLoss(): income is fee + reserves (never gross); net = income - projected bills; flags pass through', async () => {
  const spend = await import('../lib/spend.mjs');
  const income = { cohabi_fee_cents: 1600, reserves_cents: 1800, gross_cents: 16000, test_mode: true, complete: true };
  const p = spend.profitLoss(income);
  assert.equal(p.coop_income_usd, 34, '16.00 fee + 18.00 reserves, not the 160.00 buyers paid');
  assert.equal(p.net_projected_usd, Math.round((34 - p.expenses.month_projected_usd) * 100) / 100, 'net is income minus the month\'s projected bills');
  assert.equal(p.test_mode, true);
  assert.equal(spend.profitLoss({ ...income, test_mode: false }).test_mode, false);
  assert.equal(spend.profitLoss({ ...income, complete: false }).complete, false, 'incomplete income makes the P&L incomplete');
  const none = spend.profitLoss(null);
  assert.equal(none.coop_income_usd, 0, 'no income object: zero, not NaN');
  assert.equal(none.net_projected_usd, Math.round(-none.expenses.month_projected_usd * 100) / 100);
});
