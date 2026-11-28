// Cut round 49: every 4xx the render route can send is ONE plain sentence for the maker: no path, no ffmpeg/ffprobe text, no stack.
// Candidate home: teams/cut/outputs/cut-render-error-text.test.mjs. Place unchanged as commons/test/cut-render-error-text.test.mjs (Tier 2, test only).
// Run: node --test commons/test/cut-render-error-text.test.mjs   (no npm install, no ffmpeg, no browser, no network)
//
// What it pins (today's behaviour of commons/lib/cut/route.mjs, not a new rule):
//   (1) every refusal the route makes itself (400/401/403/404/409/422/429) is a clean sentence;
//   (2) a probe that throws with a path + ffmpeg text -> 422 fixed sentence; the real text goes to deps.log only;
//   (3) a renderJob that throws a plain Error with a path + ffmpeg stderr -> 500 "the render failed", text to the log only;
//   (4) an Error carrying a 4xx `.status` and internal text is still the fixed 500 (the route never reads .status, so wrap never shows it);
//   (5) positive control: the job's own refusals (RangeError, TypeError, RenderPlanError) ARE shown at 400, so (3) and (4) are not vacuous;
//   (6) the REAL renderEditJob chain with a shell-script ffmpeg that fails with path-laden stderr -> 500 fixed, no leak; and a real edit.mjs
//       refusal (trim past the end) -> 400 with edit.mjs's own sentence;
//   Round 51 (variant C, provenance): the route shows a refusal only if it carries maker:true (set in edit.mjs / render-job.mjs, carried over the fork).
//   (5) real maker refusals are marked and shown; (8) every unmarked refusal is the fixed sentence; (9) the mark needs Type/RangeError; (10) real job; (11) fork.
//   (7, now a real test) was: DESIRED, reported as TODO: a NATIVE TypeError (Node's own text, which can quote a path) thrown inside the job is shown at 400 today,
//       because the route checks the error's CLASS, not where it came from. Kimi's recommendation: show only maker-authored messages.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const IN_COMMONS_TEST = path.basename(HERE) === 'test' && path.basename(path.dirname(HERE)) === 'commons';
const ROOT = path.resolve(HERE, IN_COMMONS_TEST ? '../..' : '../../..');
const { handleCutRender, _resetCutRouteState } = await import(pathToFileURL(path.join(ROOT, 'commons/lib/cut/route.mjs')).href);

const alice = { id: 'm_alice' };
const GOOD = { trimStart: 1, trimEnd: 4, coverSec: 2 };
const SECRET_PATH = '/srv/cohabi/data/uploads/m_alice/vid_a.orig';
const LEAK = `Error: spawn ffmpeg ENOENT at spawnSync (node:child_process:1:1) ${SECRET_PATH} ffmpeg version 6.0 [libx264 @ 0x55] stderr: Invalid data found when processing input`;
// Anything that looks like server internals. A maker sentence matches none of these.
const INTERNAL = /\/(srv|tmp|home|var|usr|data|root|etc|opt)\/|\.orig\b|\.mjs\b|node_modules|node:|ffmpeg|ffprobe|libx264|stderr|ENOENT|EACCES|\n\s+at |\bat \S+ \(/i;
const READY = { owner: alice.id, path: SECRET_PATH, durationSec: 20, width: 1080, height: 1920, ready: true };
const okProbe = async () => ({ hasAudio: true, durationSec: 20, width: 1080, height: 1920 });

const run = async (over = {}, body = { videoId: 'vid_a', edit: GOOD }, member = alice) => {
  _resetCutRouteState();
  const logs = [];
  const deps = { videos: { get: async () => READY }, probe: okProbe, outDir: os.tmpdir(), log: (m) => logs.push(String(m)), renderJob: async () => ({ outPath: '/x/cut_0123456789abcdef.mp4', seconds: 3 }), ...over };
  const r = await handleCutRender({ member, body, deps });
  return { r, logs };
};
const clean = (r, where) => {
  assert.equal(r.json.ok, false, where);
  const t = r.json.error;
  assert.equal(typeof t, 'string', where);
  assert.ok(t.length > 0 && t.length <= 200, `${where}: length ${t.length}`);
  assert.ok(!/\n/.test(t), `${where}: one line`);
  assert.ok(!INTERNAL.test(t), `${where}: internals in ${JSON.stringify(t)}`);
};

test('(1) every refusal the route makes itself is a clean one-line maker sentence', async () => {
  const seen = new Map();
  const note = (name, r) => { clean(r, name); seen.set(r.status, (seen.get(r.status) || 0) + 1); };
  const cases = [
    ['401 no member', run({}, undefined, null)],
    ['400 no body', run({}, null)],
    ['400 array body', run({}, [])],
    ['400 no videoId', run({}, { edit: GOOD })],
    ['400 no edit', run({}, { videoId: 'vid_a' })],
    ['400 bad musicId', run({}, { videoId: 'vid_a', edit: GOOD, musicId: 5 })],
    ['400 music without id', run({}, { videoId: 'vid_a', edit: { ...GOOD, music: {} } })],
    ['400 music not available', run({}, { videoId: 'vid_a', edit: { ...GOOD, music: { id: 'mu_1' } } })],
    ['404 no video', run({ videos: { get: async () => null } })],
    ['403 not your video', run({ videos: { get: async () => ({ ...READY, owner: 'm_bob' }) } })],
    ['409 failed', run({ videos: { get: async () => ({ ...READY, failed: true }) } })],
    ['409 not ready', run({ videos: { get: async () => ({ ...READY, ready: false }) } })],
    ['404 no music', run({ music: { get: async () => null } }, { videoId: 'vid_a', edit: { ...GOOD, music: { id: 'mu_1' } } })],
    ['403 not your music', run({ music: { get: async () => ({ owner: 'm_bob', path: '/m/a.mp3' }) } }, { videoId: 'vid_a', edit: { ...GOOD, music: { id: 'mu_1' } } })],
    ['422 probe throws', run({ probe: async () => { throw new Error(LEAK); } })],
    ['422 probe says no audio info', run({ probe: async () => ({}) })],
  ];
  for (const [name, p] of cases) note(name, (await p).r);
  // 429s need a render in flight: start one that waits, then ask again.
  _resetCutRouteState();
  let release; const gate = new Promise((res) => { release = res; });
  const slow = { videos: { get: async () => READY }, probe: okProbe, outDir: os.tmpdir(), maxJobs: 1, renderJob: async () => { await gate; return { outPath: '/x/cut_0123456789abcdef.mp4', seconds: 3 }; } };
  const first = handleCutRender({ member: alice, body: { videoId: 'vid_a', edit: GOOD }, deps: slow });
  await new Promise((r) => setTimeout(r, 20));
  note('429 same member', await handleCutRender({ member: alice, body: { videoId: 'vid_a', edit: GOOD }, deps: slow }));
  note('429 site cap', await handleCutRender({ member: { id: 'm_carol' }, body: { videoId: 'vid_a', edit: GOOD }, deps: { ...slow, videos: { get: async () => ({ ...READY, owner: 'm_carol' }) } } }));
  release(); await first;
  for (const s of [400, 401, 403, 404, 409, 422, 429]) assert.ok(seen.get(s) >= 1, `status ${s} was exercised`);
});

test('(2) a probe that throws path + ffmpeg text is a fixed 422; the real text reaches the log only', async () => {
  const { r, logs } = await run({ probe: async () => { throw new Error(LEAK); } });
  assert.equal(r.status, 422); clean(r, 'probe');
  assert.ok(logs.some((l) => l.includes(SECRET_PATH)), 'the operator log has the real text');
});

test('(3) a job that throws a plain Error with a path + ffmpeg stderr is a fixed 500; the real text reaches the log only', async () => {
  const { r, logs } = await run({ renderJob: async () => { throw new Error(LEAK); } });
  assert.equal(r.status, 500); assert.equal(r.json.error, 'the render failed'); clean(r, 'plain');
  assert.ok(logs.some((l) => l.includes(SECRET_PATH)), 'log has the real text');
});

test('(4) an Error carrying a 4xx .status and internal text is still the fixed 500 (the route never reads .status)', async () => {
  for (const status of [400, 409, 422, 429, 499]) {
    const { r } = await run({ renderJob: async () => { throw Object.assign(new Error(LEAK), { status }); } });
    assert.equal(r.status, 500, `status ${status}`); assert.equal(r.json.error, 'the render failed');
  }
  for (const name of ['CommonsError', 'DeskError']) {
    const { r } = await run({ renderJob: async () => { throw Object.assign(new Error(LEAK), { name, status: 422 }); } });
    assert.equal(r.status, 500, name); clean(r, name);
  }
});

test('(5) positive control: every REAL maker-rule refusal is marked maker:true and shown at 400', async () => {
  const { editToTracks } = await import(pathToFileURL(path.join(ROOT, 'commons/lib/cut/edit.mjs')).href);
  const D = { durationSec: 20, width: 1080, height: 1920 };
  const bad = [
    { trimStart: 4, trimEnd: 1, coverSec: 2 }, { trimStart: 1, trimEnd: 99, coverSec: 2 }, { trimStart: 1, trimEnd: 4, coverSec: 9 },
    { trimStart: 'x', trimEnd: 4, coverSec: 2 }, { ...GOOD, text: { body: 'a\nb' } }, { ...GOOD, text: { body: 'z'.repeat(500) } },
    { ...GOOD, text: { body: 'hi', y: 99999 } }, { ...GOOD, music: { id: 'mu_1', volume: 7 } }, { ...GOOD, music: { volume: 0.5 } }, { ...GOOD, text: 'nope' },
  ];
  let n = 0;
  for (const edit of bad) {
    let e; try { editToTracks(edit, D); } catch (x) { e = x; }
    assert.ok(e instanceof TypeError || e instanceof RangeError, JSON.stringify(edit));
    assert.equal(e.maker, true, `maker mark missing on: ${e.message}`);
    const { r } = await run({ renderJob: async () => { throw e; } });
    assert.equal(r.status, 400, e.message); assert.equal(r.json.error, e.message); clean(r, e.message.slice(0, 24)); n++;
  }
  assert.equal(n, bad.length);
});

test('(6) the REAL render chain: a failing shell-script ffmpeg is a fixed 500, and a real edit refusal is a clean 400', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cut-err-text-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const src = path.join(dir, 'vid_a.orig'); fs.writeFileSync(src, 'not a video');
  const fake = path.join(dir, 'ffmpeg'); fs.writeFileSync(fake, `#!/bin/sh\necho "${src}: Invalid data found when processing input" >&2\nexit 1\n`, { mode: 0o755 });
  const out = path.join(dir, 'out'); fs.mkdirSync(out);
  const prev = process.env.FFMPEG; process.env.FFMPEG = fake;
  t.after(() => { if (prev === undefined) delete process.env.FFMPEG; else process.env.FFMPEG = prev; });
  const real = { videos: { get: async () => ({ ...READY, path: src }) }, outDir: out, renderJob: undefined };
  const a = await run(real);
  assert.equal(a.r.status, 500, JSON.stringify(a.r.json)); assert.equal(a.r.json.error, 'the render failed'); clean(a.r, 'real ffmpeg failure');
  assert.ok(a.logs.some((l) => l.includes('Invalid data found')), 'the log has the real stderr');
  assert.deepEqual(fs.readdirSync(out), [], 'no half-written output left');
  const b = await run(real, { videoId: 'vid_a', edit: { trimStart: 1, trimEnd: 99, coverSec: 2 } });
  assert.equal(b.r.status, 400); clean(b.r, 'real edit refusal'); assert.match(b.r.json.error, /trim/);
});

// A real Node error, not a made-up one: spawnSync quotes the bad argument, path included.
const native = (() => { try { spawnSync('ffmpeg', ['-i', `${SECRET_PATH}\0`]); } catch (e) { return e; } })();
test('(7) a native TypeError that quotes a path never reaches the maker: fixed 400 sentence, real text in the log', async () => {
  assert.ok(native instanceof TypeError && native.message.includes(SECRET_PATH), 'the probe error is a real native one that quotes the path');
  const { r, logs } = await run({ renderJob: async () => { throw native; } });
  assert.equal(r.status, 400); clean(r, 'native TypeError');
  assert.ok(!r.json.error.includes(SECRET_PATH), `shown at ${r.status}: ${r.json.error}`);
  assert.ok(logs.some((l) => l.includes(SECRET_PATH)), 'the log keeps the real text');
});

const FIXED = /^That edit couldn't be rendered\./;
test('(8) every UNMARKED refusal, whatever its class, shape or length, is the same fixed 400 sentence; the real text reaches the log', async () => {
  class RenderPlanError extends Error {} const plan = new RenderPlanError('clip c1 asks for source up to 30.0s but the source is 20.0s long'); plan.name = 'RenderPlanError';
  const cases = [
    new TypeError('outDir must be an existing directory'),            // pathless server state, one short line: the hole variant B left open
    new TypeError('video.hasAudio must be true or false when given'), // pathless, one line, plausible-looking
    new RangeError('video.durationSec must be a number greater than 0'),
    new RangeError('trimEnd (1) must be greater than trimStart (4)'), // maker-LOOKING text, but unmarked: provenance is the mark, not the words
    plan, new TypeError('first line\nsecond line'), new RangeError('x'.repeat(300)), new TypeError(''),
    Object.assign(new TypeError('outDir must be an absolute path'), { maker: 'yes' }), Object.assign(new RangeError('video.width must be 3'), { maker: 1 }),
  ];
  for (const e of cases) {
    const { r, logs } = await run({ renderJob: async () => { throw e; } });
    assert.equal(r.status, 400, e.message); clean(r, e.message.slice(0, 24)); assert.match(r.json.error, FIXED, `shown: ${r.json.error}`);
    assert.ok(!r.json.error.includes(e.message.slice(0, 12)) || e.message === '', e.message);
    if (e.message) assert.ok(logs.some((l) => l.includes(e.message.split('\n')[0].slice(0, 30))), 'the log has the real text');
  }
});

test('(9) the mark only counts on a TypeError/RangeError: a marked plain Error is still the fixed 500', async () => {
  const { r, logs } = await run({ renderJob: async () => { throw Object.assign(new Error(LEAK), { maker: true }); } });
  assert.equal(r.status, 500); assert.equal(r.json.error, 'the render failed'); clean(r, 'marked plain Error');
  assert.ok(logs.some((l) => l.includes(SECRET_PATH)));
});

test('(10) the REAL job: server-state refusals (missing outDir, a stored zero length) get the fixed sentence; the over-length trim keeps its own', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cut-prov-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const src = path.join(dir, 'vid_a.orig'); fs.writeFileSync(src, 'x');
  const out = path.join(dir, 'out'); fs.mkdirSync(out);
  const a = await run({ videos: { get: async () => ({ ...READY, path: src }) }, outDir: path.join(dir, 'gone'), renderJob: undefined });
  assert.equal(a.r.status, 400); assert.match(a.r.json.error, FIXED); assert.ok(!/outDir/.test(a.r.json.error));
  assert.ok(a.logs.some((l) => l.includes('outDir')), 'log has it');
  const b = await run({ videos: { get: async () => ({ ...READY, path: src, durationSec: 0 }) }, probe: undefined, outDir: out, renderJob: undefined });
  assert.equal(b.r.status, 400); assert.match(b.r.json.error, FIXED, b.r.json.error);
  const long = await run({ videos: { get: async () => ({ ...READY, path: src, durationSec: 5000 }) }, probe: async () => ({ hasAudio: true, durationSec: 5000, width: 1080, height: 1920 }), outDir: out, renderJob: undefined }, { videoId: 'vid_a', edit: { trimStart: 0, trimEnd: 4000, coverSec: 1 } });
  assert.equal(long.r.status, 400); assert.match(long.r.json.error, /limit/); assert.doesNotMatch(long.r.json.error, FIXED);
});

test('(11) the mark survives the render child: forkRenderJob rejects with maker:true for a bad trim, and without it for a missing outDir', async (t) => {
  const { forkRenderJob } = await import(pathToFileURL(path.join(ROOT, 'commons/lib/cut/wire.mjs')).href);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cut-fork-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const src = path.join(dir, 'v.orig'); fs.writeFileSync(src, 'x'); const out = path.join(dir, 'out'); fs.mkdirSync(out);
  const job = (over) => ({ edit: { trimStart: 1, trimEnd: 99, coverSec: 2 }, video: { path: src, durationSec: 20, width: 1080, height: 1920, hasAudio: true }, music: null, outDir: out, ...over });
  const e1 = await forkRenderJob(job({})).then(() => null, (e) => e);
  assert.ok(e1 instanceof RangeError, String(e1)); assert.equal(e1.maker, true);
  const e2 = await forkRenderJob(job({ outDir: path.join(dir, 'gone') })).then(() => null, (e) => e);
  assert.ok(e2 instanceof TypeError, String(e2)); assert.notEqual(e2.maker, true);
});
