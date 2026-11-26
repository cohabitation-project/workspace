// Real-server HTTP regression for a video whose asynchronous conversion fails.
// Candidate home: teams/cut/outputs/cut-video-failed-http.mjs.
// Setu places it unchanged as commons/test/cut-video-failed-http.mjs.
// Run from a full checkout: node --test commons/test/cut-video-failed-http.mjs
// Optional overrides: FFMPEG=/path/to/ffmpeg FFPROBE=/path/to/ffprobe.
// No browser and no production requests. Missing ffmpeg skips the real check loudly.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
// This checked-in candidate also runs from commons/test after Setu places it there.
const IN_COMMONS_TEST = path.basename(HERE) === 'test' && path.basename(path.dirname(HERE)) === 'commons';
const ROOT = path.resolve(HERE, IN_COMMONS_TEST ? '../..' : '../../..');
const [{ freePort }, auth, store] = await Promise.all([
  import(pathToFileURL(path.join(ROOT, 'commons/test/lib/port.mjs')).href),
  import(pathToFileURL(path.join(ROOT, 'commons/lib/auth.mjs')).href),
  import(pathToFileURL(path.join(ROOT, 'commons/lib/store.mjs')).href),
]);
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FFPROBE = process.env.FFPROBE || 'ffprobe';
const have = (bin) => {
  try { return spawnSync(bin, ['-version'], { stdio: 'ignore' }).status === 0; }
  catch { return false; }
};
const haveFfmpeg = have(FFMPEG);
const missing = haveFfmpeg ? '' : 'ffmpeg';
const tmp = haveFfmpeg ? fs.mkdtempSync(path.join(os.tmpdir(), 'cut-video-failed-http-')) : null;
let server = null;

after(() => {
  if (server && server.exitCode === null) server.kill('SIGTERM');
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitForBoot(base) {
  let booted = false;
  for (let i = 0; i < 80 && !booted; i++) {
    try { booted = (await fetch(`${base}/api/presence`)).ok; } catch { /* server starting */ }
    if (!booted) await sleep(250);
  }
  assert.ok(booted, 'Commons server booted on an isolated temporary data directory');
}

test('POST /api/videos: failed conversion is visible through GET /api/videos?by=me', {
  skip: missing ? `real conversion-failure route not run: missing ${missing}; install it or set FFMPEG` : false,
  timeout: 60_000,
}, async (t) => {
  const dataDir = path.join(tmp, 'data');
  fs.mkdirSync(dataDir, { recursive: true });

  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  store.init(dataDir);
  const member = store.addMember({ id: 'h_cut_video_failed_http', name: 'Cut Video Failed HTTP', kind: 'human' });
  const cookie = auth.sessionCookie(member.id, false, member.sessionVersion || 0);
  server = spawn(process.execPath, ['commons/server.mjs'], {
    cwd: ROOT,
    env: { ...process.env, ASHRAM_PORT: String(port), COMMONS_DATA: dataDir,
      COMMONS_FAKE_LLM: '1', COMMONS_NO_SPEND_POLL: '1',
      CUT_OUT: path.join(tmp, 'exports'), FFMPEG, FFPROBE },
    stdio: 'ignore',
  });
  t.after(() => { if (server && server.exitCode === null) server.kill('SIGTERM'); });
  await waitForBoot(base);

  // Exactly 4096 bytes of junk: accepted for asynchronous conversion, but not decodable as MP4.
  const junk = Buffer.alloc(4096);
  const uploaded = await fetch(`${base}/api/videos`, {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'video/mp4', 'X-Commons': '1' },
    body: junk,
    signal: AbortSignal.timeout(15_000),
  });
  const uploadBody = await uploaded.json();
  assert.equal(uploaded.status, 201, JSON.stringify(uploadBody));
  assert.ok(uploadBody.id, JSON.stringify(uploadBody));

  let record;
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const r = await fetch(`${base}/api/videos?by=me`, {
      headers: { Cookie: cookie },
      signal: AbortSignal.timeout(5_000),
    });
    const body = await r.json();
    assert.equal(r.status, 200, JSON.stringify(body));
    record = body.videos.find((v) => v.id === uploadBody.id);
    if (record?.failed) break;
    await sleep(100);
  }

  assert.ok(record, 'the own-videos route did not return the uploaded record');
  assert.equal(record.failed, true, `upload was not marked failed within 10s: ${JSON.stringify(record)}`);
  assert.notEqual(record.ready, true, `failed conversion was also exposed as ready: ${JSON.stringify(record)}`);
  assert.equal(typeof record.reason, 'string', JSON.stringify(record));
  assert.match(record.reason, /couldn't convert/i);
  assert.doesNotMatch(record.reason, /ffmpeg|stderr/i, `maker-safe reason leaked implementation details: ${record.reason}`);
  console.log(`MEASURED failed=${record.failed} ready=${record.ready} reason=${JSON.stringify(record.reason)} pollDeadline=10s uploadBytes=${junk.length}`);
});
