// commons/test/cut-video-noprobe.mjs: server-free. What a maker is told when ffprobe (and/or ffmpeg) is missing.
// Each case runs videos.mjs in a CHILD node process, because videos.mjs memoizes "is ffmpeg/ffprobe here" on first use.
// Cases that need a real ffmpeg are skipped (loudly) when none is on PATH (set FFMPEG=/path to override).
// Findings are pinned as tests of CURRENT behaviour; the behaviour they show is the thing to fix, so each has a test.todo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LIB = fileURLToPath(new URL('../lib/videos.mjs', import.meta.url));
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const haveFfmpeg = spawnSync(FFMPEG, ['-version'], { stdio: 'ignore' }).status === 0;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'noprobe-'));
test.after(() => fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }));

function makeClip(name, secs) {
  const f = path.join(tmp, name);
  const r = spawnSync(FFMPEG, ['-y', '-f', 'lavfi', '-i', 'testsrc=size=64x64:rate=1', '-t', String(secs), '-pix_fmt', 'yuv420p', f], { stdio: 'ignore' });
  assert.equal(r.status, 0, 'ffmpeg could not make the fixture');
  return f;
}
const CHILD = `
import fs from 'node:fs';
const v = await import(process.env.LIB);
v.init(process.env.DATA);
const buf = fs.readFileSync(process.env.CLIP);
const out = { canProbe: !!v.canProbe() };
try { out.first = v.upload({ id: 'm1' }, buf, { type: 'video/mp4' }); } catch (e) { out.error = { status: e.status, msg: e.message }; }
const until = Date.now() + Number(process.env.WAIT_MS || 0);
while (out.first && Date.now() < until) { const g = v.get(out.first.id); if (g.failed || (g.ready && !v.fileFor(out.first.id)?.file.includes('.orig.'))) break; await new Promise((r) => setTimeout(r, 100)); }
if (out.first) { out.last = v.get(out.first.id); out.mine = v.listMine('m1'); const f = v.fileFor(out.first.id); out.served = f ? path.basename(f.file) : null; out.servedType = f?.type ?? null; out.poster = !!v.posterFor(out.first.id); }
console.log('RESULT ' + JSON.stringify(out));
process.exit(0);
`.replace("import fs from 'node:fs';", "import fs from 'node:fs'; import path from 'node:path';");

function run(clip, { ffmpeg = true, waitMs = 0 } = {}) {
  const data = fs.mkdtempSync(path.join(tmp, 'data-'));
  const env = { ...process.env, LIB: 'file://' + LIB, DATA: data, CLIP: clip, WAIT_MS: String(waitMs), FFPROBE: '/nonexistent/ffprobe', FFMPEG: ffmpeg ? FFMPEG : '/nonexistent/ffmpeg' };
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', CHILD], { env, encoding: 'utf8', timeout: 60000 });
  const line = String(r.stdout).split('\n').find((l) => l.startsWith('RESULT '));
  assert.ok(line, 'child printed no RESULT: ' + r.stderr);
  return JSON.parse(line.slice(7));
}

test('no ffprobe, real ffmpeg: a short clip still converts and becomes ready (ffprobe is not needed for convert)', { skip: !haveFfmpeg && 'no ffmpeg on PATH' }, () => {
  const o = run(makeClip('short.mp4', 2), { waitMs: 30000 });
  assert.equal(o.canProbe, false);
  assert.equal(o.first.seconds, null, 'no probe -> the upload record has no length');
  assert.equal(o.first.ready, false, 'the POST answer is always ready:false while converting');
  assert.equal(o.last.ready, true);
  assert.equal(o.served, o.first.id + '.mp4');
});

test('no ffprobe: a clip over 2 minutes is ACCEPTED, silently (current behaviour, the finding)', { skip: !haveFfmpeg && 'no ffmpeg on PATH' }, () => {
  const o = run(makeClip('long.mp4', 125), { waitMs: 0 });
  assert.equal(o.error, undefined, 'if this now fails, the limit is enforced: delete this test and un-todo the one below');
  assert.equal(o.first.seconds, null);
});
test.todo('no ffprobe: a clip over 2 minutes is refused with a 413 the maker can read (videos.mjs:52 only checks when secs != null)');

test('no ffprobe, conversion failure: maker sees a failure in their own video list', { skip: !haveFfmpeg && 'no ffmpeg on PATH' }, () => {
  const junk = path.join(tmp, 'junk.mp4'); fs.writeFileSync(junk, Buffer.alloc(4096, 7));
  const o = run(junk, { waitMs: 4000 });
  assert.equal(o.error, undefined);
  assert.equal(o.last.failed, true);
  assert.match(o.last.reason, /couldn't convert this video/i);
  const listed = o.mine.find((record) => record.id === o.first.id);
  assert.ok(listed, 'failed video is returned in the member own-videos list');
  assert.equal(listed.failed, true);
  assert.equal(listed.reason, o.last.reason);
  assert.equal(listed.ready, false);
  assert.doesNotMatch(listed.reason, /stderr|ffmpeg/i, 'internal conversion diagnostics are not exposed');
});

test('no ffmpeg and no ffprobe: upload reports ready:true at once and serves the original; no length, no poster', () => {
  const clip = path.join(tmp, 'any.mp4'); fs.writeFileSync(clip, Buffer.alloc(2048, 1));
  const o = run(clip, { ffmpeg: false });
  assert.equal(o.canProbe, false);
  assert.equal(o.first.ready, true, 'publicVideo: ready = !!v.ready || !ff().ffmpeg (videos.mjs:82)');
  assert.equal(o.first.seconds, null);
  assert.equal(o.first.poster, null);
  assert.ok(o.served.includes('.orig.'));
});
