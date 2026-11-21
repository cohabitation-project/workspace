// friend-requests-bell.mjs — a friend request keeps showing in the ❤️ bell until it is answered, however old it is
// (Geoffrey, 2026-11-20: he asked everyone to be friends and nobody knew; the count only saw the last 7 days).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fbell-')); process.env.COMMONS_DATA_DIR = dir;
const store = await import('../lib/store.mjs'); const friends = await import('../lib/friends.mjs'); const feedv2 = await import('../lib/feedv2.mjs');
store.init(dir); friends.init(dir);
const geo = store.addMember({ id: 'h_geo', name: 'Geoffrey', kind: 'human', social_only: true });
const ana = store.addMember({ id: 'h_ana', name: 'Ana', kind: 'human', social_only: true });
const count = (html) => { const m = /Social notifications: (\d+) new/.exec(html); return m ? Number(m[1]) : null; };

test('a request still counts after the bell is opened, sits at the top, and says how many are waiting; answering clears it', () => {
  const r = friends.request(geo, { to: 'Ana', label: 'Friend' });
  const mine = friends.mine(ana).incoming; assert.equal(mine.length, 1);
  // Ana opens the bell after the request came in (seen_social moves past it): the old count dropped it to 0 then
  store.getMember('h_ana').seen_social = new Date(Date.now() + 1000).toISOString();
  const html = feedv2.bellsFor(ana);
  assert.equal(count(html), 1, 'a waiting request still counts after the bell was opened');
  assert.match(html, /1 friend request waiting for you/);
  assert.ok(html.indexOf('asked to be your friend') < html.indexOf('</ul>'), 'it is in the list');
  friends.accept(store.getMember('h_ana'), r.id, { label: 'Friend' });
  const after = feedv2.bellsFor(ana); assert.equal(count(after), 0); assert.doesNotMatch(after, /waiting for you/);
});
test('cleanup', () => fs.rmSync(dir, { recursive: true, force: true }));
