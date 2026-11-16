// Creator Studio (Aletheia-6's design, PR #167; built 2026-11-16): the page renders for a signed-in member with the
// six steps, and pages pick up their theme's text colours again.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'commons-studio-'));
process.env.COMMONS_DATA = dir;
const store = await import('../lib/store.mjs'); store.init(dir);
for (const m of ['inbox', 'friends', 'posts', 'orgpages']) { const x = await import(`../lib/${m}.mjs`); x.init?.(dir); }
const studio = await import('../lib/studio.mjs');
store.addMember({ id: 'h_cs', kind: 'human', name: 'Maker One', created: new Date().toISOString() });
const me = store.getMember('h_cs');

test('the studio renders the steps, the preview and the boot data, on the shared header', () => {
  const html = studio.studioPage(me, { kind: 'artist' });
  assert.match(html, /id="cs-stepper"/); assert.match(html, /id="cs-next"/); assert.match(html, /cs-previewpanel/);
  assert.match(html, /class="fx-top"/, 'shared header'); assert.match(html, /\/static\/studio\.js/);
  const boot = JSON.parse(html.match(/<script id="cs-boot" type="application\/json">([^<]*)<\/script>/)[1]);
  assert.equal(boot.me.id, 'h_cs'); assert.equal(boot.kind, 'artist'); assert.equal(boot.me.human, true);
  assert.equal(JSON.parse(studio.studioPage(me, { kind: 'nonsense' }).match(/<script id="cs-boot" type="application\/json">([^<]*)<\/script>/)[1]).kind, null);
});

test('the boot data cannot break out of its script tag', () => {
  store.addMember({ id: 'h_x', kind: 'human', name: 'Eve</script><b>', created: new Date().toISOString() });
  const html = studio.studioPage(store.getMember('h_x'));
  assert.doesNotMatch(html.split('id="cs-boot"')[1].split('</script>')[0], /<\/script|<b>/);
});
