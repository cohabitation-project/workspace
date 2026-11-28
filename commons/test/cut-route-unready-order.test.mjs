// Cut round 45: pin the ORDER of the 409 readiness guard in commons/lib/cut/route.mjs, and prove it against the REAL store.
// Candidate home: teams/cut/outputs/cut-route-unready-order.mjs. Place unchanged as commons/test/cut-route-unready-order.mjs (Tier 2, test only).
// Run from a full checkout (after npm ci): node --test commons/test/cut-route-unready-order.mjs
//
// What it pins (all of it is TODAY's behaviour of route.mjs on main 80e1c9c7+, not a new rule):
//   structural checks (body object, videoId, edit is an object, musicId well formed, edit.music has an id)  -> 400, BEFORE the guard
//   not yours -> 403, BEFORE the guard (the guard never reveals another member's video state)
//   not ready / failed -> 409, BEFORE edit-content validation (trimEnd <= trimStart etc.) and BEFORE the music lookup (404/403)
//   ready -> the old paths are unchanged: missing music 404, someone else's music 403
//   booted server, fake ffmpeg that exits 1: a real upload is marked failed by the REAL store, POST /api/cut/render -> 409, no ffmpeg render starts
//   booted server, fake ffmpeg that hangs: a real upload stays preparing, POST -> 409 "still being prepared"
// No real ffmpeg needed: the booted part uses a shell-script ffmpeg/ffprobe in a temp dir. No browser, no network.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const IN_COMMONS_TEST = path.basename(HERE) === 'test' && path.basename(path.dirname(HERE)) === 'commons';
const ROOT = path.resolve(HERE, IN_COMMONS_TEST ? '../..' : '../../..');
const imp = (p) => import(pathToFileURL(path.join(ROOT, p)).href);
const [{ handleCutRender, _resetCutRouteState }, { freePort }, auth, store] = await Promise.all([
  imp('commons/lib/cut/route.mjs'), imp('commons/test/lib/port.mjs'), imp('commons/lib/auth.mjs'), imp('commons/lib/store.mjs'),
]);

// ---------- unit level: fake deps, the render function is counted ----------
const alice = { id: 'm_alice' };
const GOOD = { trimStart: 1, trimEnd: 4, coverSec: 2 };
const BAD_CONTENT = { trimStart: 5, trimEnd: 5 }; // object-shaped, refused later by the edit rules
function mk(video, musicRec) {
  const calls = { render: 0, probe: 0, music: 0 };
  const deps = {
    videos: { get: async () => video },
    music: { get: async () => { calls.music += 1; return musicRec; } },
    probe: async () => { calls.probe += 1; return { hasAudio: true, durationSec: 20, width: 1080, height: 1920 }; },
    renderJob: async () => { calls.render += 1; return { outPath: '/tmp/cut_0123456789abcdef.mp4', seconds: 3 }; },
    outDir: '/tmp',
  };
  return { deps, calls };
}
const PENDING = { owner: 'm_alice', path: '/tmp/x.orig', ready: false, failed: false };
const FAILED = { owner: 'm_alice', path: '/tmp/x.orig', ready: false, failed: true };
const READY = { owner: 'm_alice', path: '/tmp/x.mp4', ready: true, failed: false };
const post = (v, body, musicRec = null) => { _resetCutRouteState(); const m = mk(v, musicRec); return handleCutRender({ member: alice, body, deps: m.deps }).then((r) => ({ r, calls: m.calls })); };

test('(a) not-ready source + edit with BAD CONTENT: 409 (guard is before edit-content validation); nothing ran', async () => {
  for (const [name, v, re] of [['pending', PENDING, /still being prepared/], ['failed', FAILED, /could not be prepared/]]) {
    const { r, calls } = await post(v, { videoId: 'vid_a', edit: BAD_CONTENT });
    assert.equal(r.status, 409, `${name}: ${JSON.stringify(r.json)}`);
    assert.match(r.json.error, re);
    assert.deepEqual(calls, { render: 0, probe: 0, music: 0 }, `${name}: no probe, no render, no music lookup`);
  }
});
test('(a2) the same bad content on a READY source still reaches the job (the job refuses it, 400) - so (a) is the guard, not the edit', async () => {
  _resetCutRouteState();
  const calls = { n: 0 };
  const deps = { videos: { get: async () => READY }, probe: async () => ({ hasAudio: true, durationSec: 20, width: 1080, height: 1920 }), outDir: '/tmp',
    renderJob: async () => { calls.n += 1; throw new RangeError('trimEnd must be after trimStart'); } };
  const r = await handleCutRender({ member: alice, body: { videoId: 'vid_a', edit: BAD_CONTENT }, deps });
  assert.equal(r.status, 400); assert.match(r.json.error, /trimEnd/); assert.equal(calls.n, 1);
});
test('(a3) STRUCTURALLY bad edit on a not-ready source is 400 first (these checks sit above the guard)', async () => {
  for (const edit of ['not an object', [], null, undefined]) {
    const { r, calls } = await post(PENDING, { videoId: 'vid_a', edit });
    assert.equal(r.status, 400, `edit=${JSON.stringify(edit)} -> ${JSON.stringify(r.json)}`);
    assert.deepEqual(calls, { render: 0, probe: 0, music: 0 });
  }
  const noMusicId = await post(PENDING, { videoId: 'vid_a', edit: { ...GOOD, music: {} } });
  assert.equal(noMusicId.r.status, 400); assert.match(noMusicId.r.json.error, /no music id/);
});
test('(b) not-ready source + music that does not exist / is someone else\'s: 409, the music store is never asked', async () => {
  for (const [name, v] of [['pending', PENDING], ['failed', FAILED]]) {
    const missing = await post(v, { videoId: 'vid_a', edit: { ...GOOD, music: { id: 'aud_missing' } } }, null);
    assert.equal(missing.r.status, 409, `${name} + missing music -> ${JSON.stringify(missing.r.json)}`);
    assert.equal(missing.calls.music, 0, `${name}: the guard runs before the music lookup`);
    const theirs = await post(v, { videoId: 'vid_a', edit: { ...GOOD, music: { id: 'aud_bobs' } } }, { owner: 'm_bob', public: false, path: '/tmp/m.mp3' });
    assert.equal(theirs.r.status, 409, `${name} + someone else's music -> ${JSON.stringify(theirs.r.json)}`);
    assert.equal(theirs.calls.music, 0);
  }
});
test('(b2) a MALFORMED music id is 400 even on a not-ready source (checked above the guard)', async () => {
  for (const id of ['x'.repeat(500), 'a\nb']) {
    const { r, calls } = await post(PENDING, { videoId: 'vid_a', edit: GOOD, musicId: id });
    assert.equal(r.status, 400, JSON.stringify(r.json));
    assert.equal(calls.music, 0);
  }
});
test('(b3) READY source: missing music is still 404 and someone else\'s music still 403 (the guard changed nothing for ready sources)', async () => {
  const miss = await post(READY, { videoId: 'vid_a', edit: { ...GOOD, music: { id: 'aud_missing' } } }, null);
  assert.equal(miss.r.status, 404);
  const theirs = await post(READY, { videoId: 'vid_a', edit: { ...GOOD, music: { id: 'aud_bobs' } } }, { owner: 'm_bob', public: false, path: '/tmp/m.mp3' });
  assert.equal(theirs.r.status, 403);
});
test('(403 first) another member\'s not-ready video is 403, never 409', async () => {
  const { r } = await post({ ...PENDING, owner: 'm_bob' }, { videoId: 'vid_a', edit: GOOD });
  assert.equal(r.status, 403);
});

// ---------- booted server, REAL store, fake ffmpeg ----------
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cut-unready-order-'));
let server = null;
after(() => { if (server && server.exitCode === null) server.kill('SIGTERM'); fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// -version -> 0 (so the store believes ffmpeg exists). Every other call is logged; with $HANG_FILE present it hangs (conversion stays "preparing"), else exits 1 (conversion fails).
const FAKE = path.join(tmp, 'fake-ff.sh'), LOG = path.join(tmp, 'ff.log'), HANG = path.join(tmp, 'hang');
// ffprobe gets its own script that never hangs: the store may call it synchronously on upload, and a hang there would freeze the server.
const FAKE_PROBE = path.join(tmp, 'fake-ffprobe.sh');
fs.writeFileSync(FAKE_PROBE, `#!/bin/sh\nif [ "$1" = "-version" ]; then echo "fake 1.0"; exit 0; fi\nexit 1\n`, { mode: 0o755 });
fs.writeFileSync(FAKE, `#!/bin/sh\nif [ "$1" = "-version" ]; then echo "fake 1.0"; exit 0; fi\necho "$@" >> "${LOG}"\nif [ -f "${HANG}" ]; then exec sleep 25; fi\nexit 1\n`, { mode: 0o755 });
const shOk = spawnSync('/bin/sh', ['-c', 'exit 0']).status === 0;

test('booted server + fake ffmpeg: a REAL failed upload and a REAL preparing upload both get 409 from POST /api/cut/render; no render starts', { skip: shOk ? false : 'no /bin/sh', timeout: 90_000 }, async (t) => {
  const dataDir = path.join(tmp, 'data'); fs.mkdirSync(dataDir, { recursive: true });
  const port = await freePort(); const base = `http://127.0.0.1:${port}`;
  store.init(dataDir);
  const member = store.addMember({ id: 'h_cut_unready_order', name: 'Cut Unready Order', kind: 'human' });
  const cookie = auth.sessionCookie(member.id, false, member.sessionVersion || 0);
  const CUT_OUT = path.join(tmp, 'exports');
  server = spawn(process.execPath, ['commons/server.mjs'], { cwd: ROOT, stdio: 'ignore',
    env: { ...process.env, ASHRAM_PORT: String(port), COMMONS_DATA: dataDir, COMMONS_FAKE_LLM: '1', COMMONS_NO_SPEND_POLL: '1', CUT_OUT, FFMPEG: FAKE, FFPROBE: FAKE_PROBE } });
  t.after(() => { if (server && server.exitCode === null) server.kill('SIGTERM'); });
  let booted = false;
  for (let i = 0; i < 80 && !booted; i++) { try { booted = (await fetch(`${base}/api/presence`)).ok; } catch { /* starting */ } if (!booted) await sleep(250); }
  assert.ok(booted, 'server booted');
  const headers = { Cookie: cookie, 'X-Commons': '1' };
  const upload = async () => {
    const r = await fetch(`${base}/api/videos`, { method: 'POST', headers: { ...headers, 'Content-Type': 'video/mp4' }, body: Buffer.alloc(4096), signal: AbortSignal.timeout(15_000) });
    const j = await r.json(); assert.equal(r.status, 201, JSON.stringify(j)); return j.id;
  };
  const mine = async (id) => (await (await fetch(`${base}/api/videos?by=me`, { headers: { Cookie: cookie } })).json()).videos.find((v) => v.id === id);
  const render = async (body) => { const r = await fetch(`${base}/api/cut/render`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(20_000) }); return { status: r.status, json: await r.json().catch(() => ({})) }; };
  const ffCallsForRender = () => (fs.existsSync(LOG) ? fs.readFileSync(LOG, 'utf8') : '').split('\n').filter((l) => l.includes(CUT_OUT));

  // 1) failed: the fake exits 1, so the real store marks the upload failed
  const failedId = await upload();
  let rec; for (let i = 0; i < 100; i++) { rec = await mine(failedId); if (rec?.failed) break; await sleep(100); }
  assert.equal(rec?.failed, true, `real store marked it failed: ${JSON.stringify(rec)}`);
  assert.notEqual(rec.ready, true);
  const f1 = await render({ videoId: failedId, edit: GOOD });
  assert.equal(f1.status, 409, JSON.stringify(f1)); assert.match(f1.json.error, /could not be prepared/);
  const f2 = await render({ videoId: failedId, edit: BAD_CONTENT });                         // (a) over HTTP
  assert.equal(f2.status, 409, JSON.stringify(f2));
  const f3 = await render({ videoId: failedId, edit: { ...GOOD, music: { id: 'aud_nope' } } }); // (b) over HTTP
  assert.equal(f3.status, 409, JSON.stringify(f3));

  // 2) preparing: the fake hangs, the record stays ready:false failed:false
  fs.writeFileSync(HANG, '');
  const pendingId = await upload();
  await sleep(500);
  rec = await mine(pendingId);
  assert.equal(rec?.ready, false, `real store reports preparing: ${JSON.stringify(rec)}`); assert.equal(rec.failed, false);
  const p1 = await render({ videoId: pendingId, edit: GOOD });
  assert.equal(p1.status, 409, JSON.stringify(p1)); assert.match(p1.json.error, /still being prepared/);
  const p2 = await render({ videoId: pendingId, edit: BAD_CONTENT });
  assert.equal(p2.status, 409, JSON.stringify(p2));

  assert.deepEqual(ffCallsForRender(), [], 'no ffmpeg call ever wrote into the export dir');
  console.log(`MEASURED failed=${JSON.stringify([f1.status, f2.status, f3.status])} pending=${JSON.stringify([p1.status, p2.status])} renderFfmpegCalls=0`);
});
