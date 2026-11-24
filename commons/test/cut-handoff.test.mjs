// The editor's hand-off: export -> saved video -> composer with that video chosen (Cut Job 4, round 17).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { handoffHref, VIDEO_ID_RE } from '../public/cut/cut.js';

const feed = fs.readFileSync(new URL('../public/feed.js', import.meta.url), 'utf8');
const cut = fs.readFileSync(new URL('../public/cut/cut.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../public/cut/cut.html', import.meta.url), 'utf8');

test('handoffHref only builds a link for a plain video id', () => {
  assert.equal(handoffHref('v_0123abcd'), '/social?cut=v_0123abcd#compose');
  for (const bad of ['', null, undefined, '../x', 'a b', 'a"b', '<s>', 'a'.repeat(65), 'a/b', 'a&b=1']) assert.equal(handoffHref(bad), null, String(bad));
});
test('the composer accepts exactly the ids the editor links with', () => {
  const m = feed.match(/test\(id\) && vbox/); assert.ok(m, 'feed.js checks the id');
  assert.ok(feed.includes(String(VIDEO_ID_RE).slice(1, -1) ) || feed.includes('/^[A-Za-z0-9_-]{1,64}$/'));
});
test('feed.js: a /cut video counts as a video at all four points', () => {
  assert.match(feed, /get\('cut'\)/);
  assert.match(feed, /!video && !cutVid\) \{ msg\.textContent = 'Write something/);
  assert.match(feed, /else if \(cutVid\) vid = cutVid;/);
  assert.match(feed, /video = null; cutVid = null;/);
  assert.match(feed, /cutVid = null; vbox\.hidden = true/);
});
test('the editor page has the post link, hidden until an export is saved, and cut.js uses the real upload', () => {
  assert.match(html, /id="export-result"[^>]*hidden/);
  assert.match(html, /id="export-post"/);
  assert.match(cut, /\/api\/videos\?alt=/);
  assert.match(cut, /'X-Commons': '1'/);
  assert.doesNotMatch(cut, /Export requested\. Review it/);
});

// Found by Cut Claude's browser run (round 17): export answered 403 "missing X-Commons header" for a signed-in member,
// because server.mjs actor() refuses a cookie write without it. Every POST in cut.js must send it.
test('every POST fetch in cut.js sends X-Commons, so a signed-in member can export and import', () => {
  const calls = [...cut.matchAll(/fetch\(([^;]*?)\}\)/gs)].map((m) => m[1]).filter((c) => /method:\s*'POST'/.test(c));
  assert.ok(calls.length >= 3, `found ${calls.length} POST fetches`);
  for (const c of calls) assert.match(c, /'X-Commons': '1'/, c.slice(0, 120));
});

// Found by Cut Claude's browser run (round 18): /cut/?videoId=<id> left the preview <video> with no src, so the trim
// sliders never got a duration and export answered 400 "trim 0..30 must lie within 0..N seconds". The id alone must preview.
test('the editor previews /cut/?videoId=<id> by itself (src comes from /videos/<id>)', () => {
  assert.ok(cut.includes('else if (videoId && VIDEO_ID_RE.test(videoId)) video.src = `/videos/${videoId}`'));
});

test('removing a video from the ?cut= composer clears the id before submit', () => {
  const start = feed.indexOf("new URLSearchParams(location.search).get('cut')");
  assert.notEqual(start, -1, 'feed.js has the ?cut= branch');
  const end = feed.indexOf("$('#c-video')", start);
  assert.notEqual(end, -1, 'the ?cut= branch ends before file-video selection');
  const branch = feed.slice(start, end);
  const handler = branch.match(/\$\('#c-vid-x'\)\.addEventListener\('click', \(\) => \{([^}]*)\}\);/);
  assert.ok(handler, 'the ?cut= branch has the #c-vid-x click handler');
  assert.match(handler[1], /\bcutVid\s*=\s*null\s*;/, 'removal must clear the id used by submit');
});
