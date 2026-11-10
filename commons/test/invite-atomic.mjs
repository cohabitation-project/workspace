// invite-atomic.mjs — the invite ledger under failure (Aletheia-6's review and Claude's reading, 2026-11-10).
// Failure injection, not parallel GETs: make a write fail or the file unreadable, then count accounts and check
// whether the invite can be used again. The rule: at most one account per invite, and a bad file is never
// mistaken for an empty one.
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import * as invites from '../lib/invites.mjs';

const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'invatomic-')); invites.init(DIR);
const FILE = path.join(DIR, 'invites.json');
const human = { id: 'h_test', name: 'Inviter', kind: 'human' };
const realWrite = invites._io.write;
let made = 0; const join = () => { made += 1; return { member: { id: `a_${made}` } }; };
const status = (fn) => { try { fn(); return 0; } catch (e) { return e.status || -1; } };

test('the normal path: one account, the invite is spent', () => {
  made = 0; const { code } = invites.mint(human, { name: 'One' });
  assert.equal(invites.redeem(code, {}, join).member.id, 'a_1');
  assert.equal(invites.peek(code).ok, false); assert.equal(status(() => invites.redeem(code, {}, join)), 410); assert.equal(made, 1);
});

test('the reservation cannot be written: no account is made and the invite is untouched', () => {
  made = 0; const { code } = invites.mint(human, { name: 'Two' });
  invites._io.write = () => { throw new Error('disk full'); };
  assert.notEqual(status(() => invites.redeem(code, {}, join)), 0); assert.equal(made, 0, 'join never ran');
  invites._io.write = realWrite;
  assert.equal(invites.peek(code).ok, true, 'still usable'); invites.redeem(code, {}, join); assert.equal(made, 1);
});

test('the account is made but the final write fails: the invite stays spent, so there is never a second account', () => {
  made = 0; const { code } = invites.mint(human, { name: 'Three' });
  let n = 0; invites._io.write = (f, t) => { n += 1; if (n >= 2) throw new Error('disk full'); return realWrite(f, t); }; // 1st = reservation
  assert.equal(invites.redeem(code, {}, join).member.id, 'a_1');
  invites._io.write = realWrite;
  assert.equal(invites.peek(code).ok, false, 'spent');
  assert.equal(status(() => invites.redeem(code, {}, join)), 410); assert.equal(made, 1, 'exactly one account');
});

test('joining fails (a taken name, say): nothing is made and the same invite can be tried again', () => {
  made = 0; const { code } = invites.mint(human, { name: 'Four' });
  assert.equal(status(() => invites.redeem(code, {}, () => { const e = new Error('that name is taken'); e.status = 409; throw e; })), 409);
  assert.equal(invites.peek(code).ok, true, 'released');
  invites.redeem(code, {}, join); assert.equal(made, 1);
});

test('a second use while the first is still in flight is refused (the reservation is on disk before join runs)', () => {
  made = 0; const { code } = invites.mint(human, { name: 'Five' }); let inner = null;
  invites.redeem(code, {}, () => { inner = status(() => invites.redeem(code, {}, join)); return join(); });
  assert.equal(inner, 410); assert.equal(made, 1);
});

test('a damaged file is not an empty file: mint and redeem refuse, and nothing is overwritten', () => {
  made = 0; const { code } = invites.mint(human, { name: 'Six' });
  const good = fs.readFileSync(FILE, 'utf8'); const broken = good.slice(0, Math.floor(good.length / 2));
  fs.writeFileSync(FILE, broken);
  assert.equal(status(() => invites.mint(human, { name: 'Seven' })), 503);
  assert.equal(status(() => invites.redeem(code, {}, join)), 503); assert.equal(made, 0);
  assert.equal(fs.readFileSync(FILE, 'utf8'), broken, 'the damaged file was left for an operator, not replaced');
  fs.writeFileSync(FILE, good);
  assert.equal(invites.peek(code).ok, true, 'restored: the outstanding invite is still there');
});

test('writes are atomic: no temp file is left behind', () => {
  assert.deepEqual(fs.readdirSync(DIR).filter((f) => f.endsWith('.tmp')), []);
});
