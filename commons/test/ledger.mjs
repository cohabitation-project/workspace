// The coin ledger v0: the first transaction end to end, Aletheia-6's required assertions, allowance and issuance
// limits, and tamper evidence.   node --test commons/test/ledger.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ledger-test-'));
const L = await import('../lib/ledger.mjs');
L.init(dir);
const human = { id: 'h_willie', name: 'secondson', kind: 'human' };
const other = { id: 'h_rev', name: 'Reviewer', kind: 'human' };
const agent = { id: 'a_ash', name: 'Ash', kind: 'agent', operator: 'Doctoracula' };
const operatorHuman = { id: 'h_doc', name: 'Doctoracula', kind: 'human' };

test('THE FIRST TRANSACTION: forest grant → avatar purchase → paid for an agent job, every step in the ledger', () => {
  L.claimForest(human);
  assert.equal(L.balance(L.wallet(human.id)), 10);
  L.buy(human, 'look-gold-shirt', 'tap-1'); L.buy(human, 'ride-hoverboard', 'tap-2'); // 10 coins = two basic items
  assert.equal(L.balance(L.wallet(human.id)), 0); assert.ok(L.owns(human.id, 'look-gold-shirt')); assert.ok(L.owns(human.id, 'ride-hoverboard'));
  assert.throws(() => L.buy(human, 'hat-tophat', 'tap-3'), /not enough coins/);
  L.reserveJob({ id: 't_photo', agent, human, amount: 25 });
  L.settleJob('t_photo', other);
  assert.equal(L.balance(L.wallet(human.id)), 25);
  const kinds = L.walletView(human).history.map((h) => h.kind);
  for (const k of ['forest-grant', 'store:buy', 'job:settle']) assert.ok(kinds.includes(k), `ledger shows ${k}`);
  assert.equal(L.verify().ok, true);
});

test('Aletheia: a second forest claim fails', () => {
  assert.throws(() => L.claimForest(human), /already received/);
  assert.throws(() => L.claimForest(agent), /for humans/);
});

test('Aletheia: the reviewer cannot be the payer, the recipient, or the agent\'s operator', () => {
  L.reserveJob({ id: 't_two', agent, human, amount: 5 });
  assert.throws(() => L.settleJob('t_two', agent), /someone other than/);
  assert.throws(() => L.settleJob('t_two', human), /someone other than/);
  assert.throws(() => L.settleJob('t_two', operatorHuman), /operator can't approve/);
  assert.throws(() => L.reserveJob({ id: 't_self', agent, human: operatorHuman, amount: 5 }), /own operator/);
});

test('Aletheia: replaying a settlement cannot pay twice', () => {
  L.settleJob('t_two', other);
  const before = L.balance(L.wallet(human.id));
  assert.throws(() => L.settleJob('t_two', other), /already settled/);
  assert.equal(L.balance(L.wallet(human.id)), before);
});

test('a purchase: double tap charges once; not enough coins is refused; buying twice is refused', () => {
  const p = { id: 'h_poor', name: 'Poor', kind: 'human' };
  assert.throws(() => L.buy(p, 'skin-ghost', 'x'), /not enough coins/);
  L.claimForest(p);
  const a = L.buy(p, 'skin-ghost', 'same'); const b = L.buy(p, 'skin-ghost', 'same'); // a skin is 10
  assert.equal(a.seq, b.seq); assert.equal(L.balance(L.wallet(p.id)), 0);
  assert.throws(() => L.buy(p, 'skin-ghost', 'again'), /already have/);
});

test('the 500/day allowance: reservations count, cancelling gives back, it expires at midnight, nothing pays into it', () => {
  const ag = { id: 'a_busy', name: 'Busy', kind: 'agent', operator: 'Someone' };
  for (let i = 0; i < 10; i++) L.reserveJob({ id: `t_b${i}`, agent: ag, human, amount: 50 });
  assert.equal(L.allowanceLeft(ag.id), 0);
  assert.throws(() => L.reserveJob({ id: 't_b10', agent: ag, human, amount: 5 }), /not enough allowance/);
  L.cancelJob('t_b0', ag); assert.equal(L.allowanceLeft(ag.id), 50, 'a cancelled job gives its reservation back');
  const tomorrow = new Date(Date.now() + 86400_000).toISOString().slice(0, 10);
  assert.equal(L.allowanceLeft(ag.id, tomorrow), 500, 'yesterday\'s use does not carry into tomorrow');
  assert.equal(L.balance(L.wallet(ag.id)), 0, 'an allowance is a budget, never coins in the agent\'s wallet');
  assert.throws(() => L.reserveJob({ id: 't_big', agent: ag, human, amount: 51 }), /5–50/);
});

test('issuance limits: the global daily budget and the cap', () => {
  const save = { ...L.CONFIG };
  L.CONFIG.dailyIssuance = L.issuedOn(new Date().toISOString().slice(0, 10)) + 10;
  const h1 = { id: 'h_a1', name: 'A1', kind: 'human' }, h2 = { id: 'h_a2', name: 'A2', kind: 'human' };
  L.claimForest(h1);
  assert.throws(() => L.claimForest(h2), /issuance budget/);
  L.CONFIG.dailyIssuance = save.dailyIssuance; L.CONFIG.issuableCap = L.issued();
  assert.throws(() => L.claimForest(h2), /cap is reached/);
  Object.assign(L.CONFIG, save);
});

test('the ledger survives a restart, and verify() catches an edited or deleted line', () => {
  const before = L.verify(); assert.equal(before.ok, true);
  L.init(dir); assert.equal(L.verify().head, before.head, 'same chain after a restart');
  const file = path.join(dir, 'ledger', 'entries.jsonl');
  const lines = fs.readFileSync(file, 'utf8').trim().split('\n');
  const edited = lines.map((l, i) => { if (i !== 0) return l; const e = JSON.parse(l); e.lines[1].amount += 1000; e.lines[0].amount -= 1000; return JSON.stringify(e); }); // a balanced but forged edit
  fs.writeFileSync(file, edited.join('\n') + '\n'); L.init(dir);
  assert.equal(L.verify().ok, false, 'an edited entry is detected');
  const removed = lines.filter((_, i) => i !== 2);
  fs.writeFileSync(file, removed.join('\n') + '\n'); L.init(dir);
  assert.match(L.verify().problem, /broken link/, 'a removed entry is detected');
  fs.writeFileSync(file, lines.join('\n') + '\n'); L.init(dir); assert.equal(L.verify().ok, true);
});

test('special skins come in numbered limited runs and sell out', () => {
  const save = L.STORE['skin-eleven'].limited; L.STORE['skin-eleven'].limited = 2;
  const buyers = [0, 1, 2].map((i) => ({ id: `h_sp${i}`, name: `Sp${i}`, kind: 'human' }));
  for (const b of buyers) { L.claimForest(b); }
  // a special costs 20: settle a job to each so they can afford it
  const ag = { id: 'a_pay', name: 'Payer', kind: 'agent', operator: 'Nobody' };
  buyers.forEach((b, i) => { L.reserveJob({ id: `t_sp${i}`, agent: ag, human: b, amount: 10 }); L.settleJob(`t_sp${i}`, other); });
  const e1 = L.buy(buyers[0], 'skin-eleven', 'k'); const e2 = L.buy(buyers[1], 'skin-eleven', 'k');
  assert.deepEqual([e1.data.serial, e2.data.serial], [1, 2]); assert.equal(e2.data.of, 2);
  assert.throws(() => L.buy(buyers[2], 'skin-eleven', 'k'), /sold out/);
  assert.deepEqual(L.serialOf(buyers[1].id, 'skin-eleven'), { serial: 2, of: 2 });
  L.STORE['skin-eleven'].limited = save;
});

test('the coin tree: 1, 2, 3 … up to 30, then 10–30; drops wait 7 days; each day collects once', () => {
  const g = { id: 'h_gard', name: 'Gardener', kind: 'human' };
  L.claimForest(g); L.buy(g, 'seed-coin-tree', 'seed');
  const planted = L.treePlanted(g.id); const at = (n) => new Date(Date.parse(planted + 'T12:00:00Z') + n * 86400_000).toISOString().slice(0, 10);
  assert.deepEqual([0, 1, 2, 29].map((n) => L.treeDrop(g.id, at(n))), [1, 2, 3, 30]);
  for (let n = 30; n < 60; n++) { const c = L.treeDrop(g.id, at(n)); assert.ok(c >= 10 && c <= 30, `day ${n + 1}: ${c}`); }
  assert.equal(L.treeDrop(g.id, at(40)), L.treeDrop(g.id, at(40)), 'the same day always gives the same drop');
  const r = L.collectTree(g); assert.equal(r.collected, 1, 'planting day drops 1');
  assert.equal(L.collectTree(g).collected, 0, 'collecting again the same day gives nothing');
  const later = Date.parse(planted + 'T12:00:00Z') + 2 * 86400_000; // two days later: day 2 and day 3 waiting
  assert.equal(L.collectTree(g, later).collected, 5);
  const muchLater = Date.parse(planted + 'T12:00:00Z') + 20 * 86400_000; // only the last 7 days are waiting
  assert.equal(L.treeView(g.id, muchLater).pending.length, 7);
  assert.equal(L.verify().ok, true);
  assert.throws(() => L.collectTree({ id: 'h_none', name: 'N', kind: 'human' }), /no coin tree/);
});
