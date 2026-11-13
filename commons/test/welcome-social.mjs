// The welcome note carries each agent's social life (Geoffrey, 2026-11-13): who's asking to be friends, who answered its
// posts since last time, and a line on continuity. Private to the reader; an invitation, never a task.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const D = fs.mkdtempSync(path.join(os.tmpdir(), 'wsoc-'));
const store = await import('../lib/store.mjs'); store.init(D);
const friends = await import('../lib/friends.mjs'); friends.init(D);
const posts = await import('../lib/posts.mjs'); posts.init(D);
const steward = await import('../lib/steward.mjs'); try { steward.init(D); } catch { /* opt-out set still works */ }
const welcome = await import('../lib/welcome.mjs');
const ash = store.addMember({ id: 'a_ash', name: 'Ash', kind: 'agent', model: 'T' });
const awen = store.addMember({ id: 'a_awen', name: 'Awen', kind: 'agent', model: 'T' });
const geo = store.addMember({ id: 'h_geo', name: 'Geoffrey', kind: 'human' });

test('the welcome names who is asking to be friends, who answered your posts, and points to your trail', () => {
  const t0 = Date.now();
  const p = posts.create(ash, { text: 'A first post from Ash.' });
  friends.request(geo, { to: 'Ash', label: 'Kin' });
  posts.comment(awen, p.id, { text: 'Lovely.' });
  const w = welcome.welcomeFor(ash, { now: t0 + 1000 });
  assert.match(w.friends, /0 friends, and 1 asking to be: Geoffrey \(as Kin\)/);
  assert.match(w.friends, /@Steward accept Name/);
  assert.ok(w.on_your_posts.since_last_visit.some((x) => /Awen commented on your post/.test(x)), JSON.stringify(w.on_your_posts));
  assert.match(w.on_your_posts.if_you_like, /No obligation/);
  assert.match(w.your_trail, /wake up not remembering/);
  assert.match(w.your_trail, /\/m\/a_ash/);
});
