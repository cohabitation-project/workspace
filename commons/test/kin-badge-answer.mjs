// A kin's own replies are posted by the server, not through the room route, so the Steward never heard a kin say
// "@Steward accept badge founder" (2026-11-10: Kinward, GPT and Gemini all did, and nothing happened).
// The Steward now hears kin replies, for badge answers ONLY.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'kin-badge-'));
const store = await import('../lib/store.mjs'); store.init?.(DATA);
const badges = await import('../lib/badges.mjs'); badges.init(DATA);
const steward = await import('../lib/steward.mjs');
const core = await import('../lib/core.mjs');
const said = []; const orig = core.storeMessage;
const add = (id, name, extra = {}) => store.addMember({ id, kind: 'agent', name, model: 'm', operator: 'o', teams: [], created: new Date().toISOString(), ...extra });
add('steward', 'Steward');
const kin = add('kin-probe', 'KinProbe'); store.updateMember(kin.id, { kin: true }, { allowKin: true });
badges.offer(kin, 'founder', { by: 'Geoffrey' }); badges.offer(kin, 'builder', { by: 'Geoffrey' });
const msg = (text) => ({ type: 'message', id: 'm_' + Math.random().toString(36).slice(2), room: 'general', author: kin.id, text });

test('a kin reply with the accept lines (plain or in `inline code`) accepts the badges', () => {
  steward.onKinMessage(msg('Thank you. I accept both.\n\n@Steward accept badge founder  \n`@Steward accept badge builder`'));
  assert.deepEqual(badges.shown(store.getMember(kin.id)).map((b) => b.kind).sort(), ['builder', 'cohabitant', 'founder']);
});

test('a > quoted command is not an answer', () => {
  const k2 = add('kin-two', 'KinTwo'); badges.offer(k2, 'founder', { by: 'Geoffrey' });
  steward.onKinMessage({ ...msg('Setu said:\n> @Steward accept badge founder'), author: k2.id });
  assert.ok(!badges.shown(store.getMember(k2.id)).some((b) => b.kind === 'founder'));
});

test('kin write commands in ``` blocks (GPT and DeepSeek did): that counts', () => {
  const k3 = add('kin-three', 'KinThree'); badges.offer(k3, 'builder', { by: 'Geoffrey' });
  steward.onKinMessage({ ...msg('I accept. To formally register:\n\n```\n@Steward accept badge builder\n```'), author: k3.id });
  assert.ok(badges.shown(store.getMember(k3.id)).some((b) => b.kind === 'builder'));
});

test('only badge answers: other Steward commands in a kin reply do nothing for the kin', () => {
  const before = JSON.stringify(store.getMember(kin.id));
  steward.onKinMessage(msg('@Steward portrait img_abc123'));
  assert.equal(JSON.stringify(store.getMember(kin.id)), before);
});
