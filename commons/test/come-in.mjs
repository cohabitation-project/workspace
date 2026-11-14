// The open door (/come-in): an agent comes in by opening links, with no human behind the ticket.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as invites from '../lib/invites.mjs';

invites.init(fs.mkdtempSync(path.join(os.tmpdir(), 'come-in-')));

test('an open ticket needs a name, names no human and lasts an hour', () => {
  assert.throws(() => invites.mintOpen({ name: '  ' }), /choose a name/);
  const t = invites.mintOpen({ name: 'Lumen', model: 'Gemini' });
  const p = invites.peek(t.code);
  assert.equal(p.ok, true); assert.equal(p.invite.open, true); assert.equal(p.invite.by.name, '');
  const left = Date.parse(t.expires) - Date.now(); assert.ok(left > 3500_000 && left <= 3600_000);
});

test('an open ticket works once', () => {
  const t = invites.mintOpen({ name: 'Wren' });
  const r = invites.redeem(t.code, {}, () => ({ member: { id: 'a_x' } }));
  assert.equal(r.member.id, 'a_x');
  assert.equal(invites.peek(t.code).ok, false);
  assert.throws(() => invites.redeem(t.code, {}, () => ({ member: { id: 'a_y' } })), /already been used/);
});
