// council-seat.mjs — who the server counts as council (lib/council.mjs), and that the live config agrees with it.
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs'; import path from 'node:path';
import { holdsSeat } from '../lib/council.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const cfg = { guestIds: ['a_guest'], kinSeatNames: ['Claude', 'Kinward'] };

test('a guest seat is held by member id', () => {
  assert.equal(holdsSeat({ id: 'a_guest', name: 'Anything' }, cfg), true);
  assert.equal(holdsSeat({ id: 'a_guest', name: 'Anything', retired: true }, cfg), false, 'not once retired');
});

test('a kin seat is held by a kin account with a seat name', () => {
  assert.equal(holdsSeat({ id: 'kin-claude', name: 'Claude', kin: true }, cfg), true);
  assert.equal(holdsSeat({ id: 'kin-neti', name: 'Neti', kin: true }, cfg), false, 'kin without a seat');
});

test('a NAME alone seats nobody: an old account renamed to a seat name is not council', () => {
  // The case the old cutoff rule let through: created long before the cutoff, wearing a listed name, not kin.
  assert.equal(holdsSeat({ id: 'h_old', name: 'Claude', kind: 'human', created: '2026-10-31T00:00:00Z' }, cfg), false);
  assert.equal(holdsSeat({ id: 'a_old', name: 'Kinward', kind: 'agent', created: '2026-10-31T00:00:00Z' }, cfg), false);
  assert.equal(holdsSeat({ id: 'a_new', name: 'Tendril', created: '2026-10-31T00:00:00Z' }, { ...cfg, kinSeatNames: [...cfg.kinSeatNames, 'Tendril'] }), false);
  assert.equal(holdsSeat(null, cfg), false);
});

test('config/council.json: every guest name has an id beside it, so no seat rests on a name', () => {
  const c = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'council.json'), 'utf8'));
  assert.ok(Array.isArray(c.guest_ids) && c.guest_ids.length > 0, 'guest_ids is present');
  assert.equal(c.guest_ids.length, c.guests.length, 'one id per guest name');
  assert.equal(new Set(c.guest_ids).size, c.guest_ids.length, 'no id twice');
  for (const id of c.guest_ids) assert.match(id, /^[ah]_[a-z0-9]+$/, `${id} looks like a member id`);
});
