// /api/spend income side (Aletheia-6's P&L schema, 2026-11-27): income is folded from the real order log,
// the cooperative's income is its fee (never sellers' gross), test money is labelled test, and every
// expense field the page already served is still there. Run: node --test commons/test/spend-income.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { freePort } from './lib/port.mjs';

test('income() folds the order log: paid orders only, split mirrored, sections grouped, test labelled', async () => {
  const checkout = await import('../lib/checkout.mjs');
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'spend-income-'));
  checkout.init(D);
  const M = '2026-11'; const ts = (d) => `${M}-${d}T12:00:00.000Z`;
  const lines = [
    // a paid test order: $40, $4 fee
    { ts: ts('03'), op: 'create', order: { id: 'ord_a', listing: 'l1', title: 'Bowl', amount: 40, currency: 'USD', mode: 'test', status: 'awaiting_payment', buyer: 'h1', seller: 'h2', fee_cents: 400, ts: ts('03') } },
    { ts: ts('03'), op: 'status', order: 'ord_a', status: 'paid' },
    // a live order later partly refunded: $100, $10 fee, $25 back
    { ts: ts('04'), op: 'create', order: { id: 'ord_b', listing: 'l2', title: 'Print', amount: 100, currency: 'USD', mode: 'live', status: 'awaiting_payment', buyer: 'h3', seller: 'h2', fee_cents: 1000, ts: ts('04') } },
    { ts: ts('04'), op: 'status', order: 'ord_b', status: 'paid' },
    { ts: ts('05'), op: 'status', order: 'ord_b', status: 'partly_refunded', refunded_cents: 2500 },
    // reserves variant (proceeds to the co-op): $20, $2 co-op fee, $18 reserves
    { ts: ts('06'), op: 'create', order: { id: 'ord_c', listing: 'l3', title: 'Zine', amount: 20, currency: 'USD', mode: 'test', status: 'awaiting_payment', buyer: 'h1', seller: 'h2', proceeds: 'reserves', coop_fee_cents: 200, reserves_cents: 1800, ts: ts('06') } },
    { ts: ts('06'), op: 'status', order: 'ord_c', status: 'paid' },
    // never income: one that never got paid, one cancelled, one from another month
    { ts: ts('07'), op: 'create', order: { id: 'ord_d', listing: 'l4', title: 'Ghost', amount: 999, currency: 'USD', mode: 'test', status: 'awaiting_payment', buyer: 'h1', seller: 'h2', fee_cents: 9990, ts: ts('07') } },
    { ts: ts('08'), op: 'create', order: { id: 'ord_e', listing: 'l5', title: 'Backed out', amount: 50, currency: 'USD', mode: 'test', status: 'awaiting_payment', buyer: 'h1', seller: 'h2', fee_cents: 500, ts: ts('08') } },
    { ts: ts('08'), op: 'status', order: 'ord_e', status: 'cancelled' },
    { ts: '2026-10-09T12:00:00.000Z', op: 'create', order: { id: 'ord_f', listing: 'l6', title: 'Last month', amount: 60, currency: 'USD', mode: 'test', status: 'awaiting_payment', buyer: 'h1', seller: 'h2', fee_cents: 600, ts: '2026-10-09T12:00:00.000Z' } },
    { ts: '2026-10-09T12:00:01.000Z', op: 'status', order: 'ord_f', status: 'paid' },
  ];
  fs.writeFileSync(path.join(D, 'payments', 'orders.jsonl'), lines.map((l) => JSON.stringify(l)).join('\n') + '\n');
  const inc = checkout.income(new Date(`${M}-20T00:00:00Z`));
  assert.equal(inc.period, M); assert.equal(inc.currency, 'USD'); assert.equal(inc.source, 'market_orders');
  assert.equal(inc.orders_paid, 3, 'paid-at-some-point only: no draft, no cancelled, no other month');
  assert.equal(inc.gross_cents, 16000, '40 + 100 + 20 dollars');
  assert.equal(inc.refunds_cents, 2500);
  assert.equal(inc.cohabi_fee_cents, 1600, '400 + 1000 + 200: the reserves variant uses coop_fee_cents, as split() does');
  assert.equal(inc.reserves_cents, 1800);
  assert.equal(inc.test_mode, true, 'a month with any test-mode order is test money');
  assert.ok(Array.isArray(inc.by_section) && inc.by_section.length >= 1, 'sections grouped');
  assert.equal(inc.by_section.reduce((a, s) => a + s.gross_cents, 0), 16000, 'sections sum to the whole');
  // the fields future code must not lose
  for (const k of ['period', 'currency', 'source', 'test_mode', 'complete', 'as_of', 'orders_paid', 'gross_cents', 'refunds_cents', 'cohabi_fee_cents', 'by_section']) assert.ok(k in inc, `income carries ${k}`);
});

test('/api/spend serves income + profit_loss AND every expense field it already served', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'spend-http-'));
  const PORT = await freePort(), B = `http://127.0.0.1:${PORT}`;
  const env = { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D }; delete env.COMMONS_PAYMENTS; delete env.STRIPE_SECRET_KEY;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env, stdio: 'ignore' });
  try {
    let ok = false; for (let i = 0; i < 60; i++) { try { if ((await fetch(B + '/healthz')).ok) { ok = true; break; } } catch { /* starting */ } await new Promise((r) => setTimeout(r, 250)); }
    assert.ok(ok, 'server started');
    const s = await (await fetch(B + '/api/spend')).json();
    for (const k of ['day', 'fetched_at', 'openrouter', 'anthropic', 'fixed', 'month', 'seats', 'note']) assert.ok(k in s, `expense field ${k} unchanged`);
    assert.ok(s.income && s.income.source === 'market_orders', 'income rides along');
    assert.equal(s.income.orders_paid, 0, 'no orders yet: zeros, not inventions');
    assert.equal(s.income.test_mode, true, 'payments closed means practice money');
    const p = s.profit_loss;
    assert.ok(p && p.period === s.month.month && 'net_projected_usd' in p, 'profit_loss present, same period');
    assert.equal(p.coop_income_usd, 0);
    assert.match(p.coop_income_is, /never sellers' gross/, 'the P&L says whose money income is');
    assert.ok(p.expenses && 'fixed_monthly_usd' in p.expenses && 'month_projected_usd' in p.expenses, 'expenses labelled, not mushed');
  } finally { srv.kill(); }
});
