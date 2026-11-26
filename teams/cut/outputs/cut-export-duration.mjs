// Real-server, real-ffmpeg export-duration check (Cut Job 5, rebuilt boot).
// Candidate: teams/cut/outputs/cut-export-duration.mjs; place as commons/test/cut-export-duration.mjs.
// Run from a full checkout: node --test commons/test/cut-export-duration.mjs
// Optional binary overrides: FFMPEG=/path/to/ffmpeg FFPROBE=/path/to/ffprobe.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// Same checkout-root and import pattern as commons/test/cut-phone-overflow.mjs.
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
const haveFfprobe = have(FFPROBE);
const missing = [!haveFfmpeg && 'ffmpeg', !haveFfprobe && 'ffprobe'].filter(Boolean).join(' and ');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function probeSeconds(file) {
  const result = spawnSync(FFPROBE, [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'json', file,
  ], { encoding: 'utf8', timeout: 20_000 });
  assert.equal(result.status, 0, `ffprobe failed: ${result.stderr}`);
  const seconds = Number(JSON.parse(result.stdout).format.duration);
  assert.ok(Number.isFinite(seconds) && seconds > 0, `ffprobe returned no positive duration: ${result.stdout}`);
  return seconds;
}

test('POST /api/cut/render: a 4s source trimmed 1..3 exports a 2s MP4 (±0.1s)', {
  skip: missing ? `real export not run: missing ${missing}; install it or set FFMPEG/FFPROBE` : false,
  timeout: 180_000,
}, async (t) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cut-export-duration-'));
  const dataDir = path.join(tmp, 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;

  // Exact placed-test store/member/cookie/server pattern: no manual port or listen parser.
  store.init(dataDir);
  const member = store.addMember({ id: 'h_cut_export_duration', name: 'Cut Export Duration', kind: 'human' });
  const cookie = auth.sessionCookie(member.id, false, member.sessionVersion || 0);
  const server = spawn(process.execPath, ['commons/server.mjs'], {
    cwd: ROOT,
    env: { ...process.env, ASHRAM_PORT: String(port), COMMONS_DATA: dataDir,
      COMMONS_FAKE_LLM: '1', COMMONS_NO_SPEND_POLL: '1', FFMPEG, FFPROBE },
    stdio: 'ignore',
  });

  try {
    let booted = false;
    for (let i = 0; i < 80 && !booted; i++) {
      try { booted = (await fetch(`${base}/api/presence`)).ok; } catch { /* server starting */ }
      if (!booted) await sleep(250);
    }
    assert.ok(booted, 'Commons server booted on an isolated temporary data directory');

    const source = path.join(tmp, 'four-seconds.mp4');
    const made = spawnSync(FFMPEG, [
      '-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc=size=64x64:rate=10',
      '-t', '4', '-pix_fmt', 'yuv420p', '-c:v', 'libx264', source,
    ], { encoding: 'utf8', timeout: 30_000 });
    assert.equal(made.status, 0, `could not make the 4s fixture: ${made.stderr}`);
    const sourceSeconds = probeSeconds(source);
    assert.ok(Math.abs(sourceSeconds - 4) <= 0.1, `fixture is ${sourceSeconds}s, not 4s`);

    const uploaded = await fetch(`${base}/api/videos`, {
      method: 'POST',
      headers: { Cookie: cookie, 'Content-Type': 'video/mp4', 'X-Commons': '1' },
      body: fs.readFileSync(source),
      signal: AbortSignal.timeout(15_000),
    });
    const uploadBody = await uploaded.json();
    assert.equal(uploaded.status, 201, JSON.stringify(uploadBody));
    assert.ok(uploadBody.id, JSON.stringify(uploadBody));

    let record;
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      const response = await fetch(`${base}/api/videos?by=me`, {
        headers: { Cookie: cookie }, signal: AbortSignal.timeout(10_000),
      });
      const body = await response.json();
      assert.equal(response.status, 200, JSON.stringify(body));
      record = body.videos.find((video) => video.id === uploadBody.id);
      if (record?.ready) break;
      await sleep(250);
    }
    assert.ok(record?.ready, `upload did not become ready within 60s: ${JSON.stringify(record)}`);

    const exported = await fetch(`${base}/api/cut/render`, {
      method: 'POST',
      headers: { Cookie: cookie, 'Content-Type': 'application/json', 'X-Commons': '1' },
      body: JSON.stringify({ videoId: uploadBody.id, edit: { trimStart: 1, trimEnd: 3, coverSec: 1 } }),
      signal: AbortSignal.timeout(90_000),
    });
    const exportBody = await exported.json();
    assert.equal(exported.status, 200, JSON.stringify(exportBody));
    assert.equal(exportBody.ok, true, JSON.stringify(exportBody));
    assert.ok(/^\/cut\/.+\.mp4$/.test(exportBody.url), JSON.stringify(exportBody));

    const videoResponse = await fetch(base + exportBody.url, { signal: AbortSignal.timeout(15_000) });
    assert.equal(videoResponse.status, 200, `GET ${exportBody.url} returned ${videoResponse.status}`);
    const output = path.join(tmp, 'export.mp4');
    fs.writeFileSync(output, Buffer.from(await videoResponse.arrayBuffer()));
    assert.ok(fs.statSync(output).size > 0, 'exported MP4 is empty');
    const exportSeconds = probeSeconds(output);
    assert.ok(Math.abs(exportSeconds - 2) <= 0.1,
      `expected 2s ±0.1s from trim 1..3; measured ${exportSeconds}s`);
    if (exportBody.seconds != null) {
      assert.ok(Math.abs(Number(exportBody.seconds) - 2) <= 0.1, `response seconds=${exportBody.seconds}`);
    }
    console.log(`MEASURED source=${sourceSeconds.toFixed(3)}s trim=1..3 export=${exportSeconds.toFixed(3)}s responseSeconds=${exportBody.seconds} tolerance=0.1s bytes=${fs.statSync(output).size}`);
  } finally {
    server.kill();
    try { fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch {}
  }
});
