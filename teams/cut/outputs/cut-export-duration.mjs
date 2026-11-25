// commons/test/cut-export-duration.mjs
// Real-server, real-ffmpeg export-duration check (Cut Job 5).
// Candidate home: teams/cut/outputs/cut-export-duration.mjs. Setu places it at commons/test/.
// Run from a full checkout: node --test commons/test/cut-export-duration.mjs
// Optional overrides: FFMPEG=/path/to/ffmpeg FFPROBE=/path/to/ffprobe.
// No browser and no production requests. Missing ffmpeg OR ffprobe skips the real check loudly.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.env.COMMONS_ROOT
  ? path.resolve(process.env.COMMONS_ROOT)
  : fileURLToPath(new URL('..', import.meta.url));
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FFPROBE = process.env.FFPROBE || 'ffprobe';
const have = (bin) => {
  try { return spawnSync(bin, ['-version'], { stdio: 'ignore' }).status === 0; }
  catch { return false; }
};
const haveFfmpeg = have(FFMPEG);
const haveFfprobe = have(FFPROBE);
const missing = [!haveFfmpeg && 'ffmpeg', !haveFfprobe && 'ffprobe'].filter(Boolean).join(' and ');
const tmp = haveFfmpeg && haveFfprobe ? fs.mkdtempSync(path.join(os.tmpdir(), 'cut-duration-')) : null;
let server = null;

after(() => {
  if (server && server.exitCode === null) server.kill('SIGTERM');
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function listen(child) {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('server did not listen within 90s')), 90_000);
    const inspect = (s) => {
      if (/now on http|EADDRINUSE/.test(String(s))) {
        clearTimeout(timer);
        /EADDRINUSE/.test(String(s)) ? reject(new Error(String(s))) : resolve();
      }
    };
    child.stdout.on('data', inspect);
    child.stderr.on('data', inspect);
    child.once('error', (e) => { clearTimeout(timer); reject(e); });
    child.once('exit', (code) => { clearTimeout(timer); reject(new Error(`server exited ${code}`)); });
  });
}
function probeSeconds(file) {
  const r = spawnSync(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'json', file], { encoding: 'utf8', timeout: 20_000 });
  assert.equal(r.status, 0, `ffprobe failed: ${r.stderr}`);
  const seconds = Number(JSON.parse(r.stdout).format.duration);
  assert.ok(Number.isFinite(seconds) && seconds > 0, `ffprobe returned no positive duration: ${r.stdout}`);
  return seconds;
}

test('POST /api/cut/render: a 4s source trimmed 1..3 exports a 2s MP4 (±0.1s)', {
  skip: missing ? `real export not run: missing ${missing}; install it or set FFMPEG/FFPROBE` : false,
  timeout: 180_000,
}, async (t) => {
  const dataDir = path.join(tmp, 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  const source = path.join(tmp, 'four-seconds.mp4');
  const made = spawnSync(FFMPEG, [
    '-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc=size=64x64:rate=10',
    '-t', '4', '-pix_fmt', 'yuv420p', '-c:v', 'libx264', source,
  ], { encoding: 'utf8', timeout: 30_000 });
  assert.equal(made.status, 0, `could not make the 4s fixture: ${made.stderr}`);
  const sourceSeconds = probeSeconds(source);
  assert.ok(Math.abs(sourceSeconds - 4) <= 0.1, `fixture is ${sourceSeconds}s, not 4s`);

  const port = 7300 + Math.floor(Math.random() * 1000);
  const base = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, ['server.mjs'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port), DATA_DIR: dataDir, CUT_OUT: path.join(tmp, 'exports'), FFMPEG, FFPROBE },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(() => { if (server && server.exitCode === null) server.kill('SIGTERM'); });
  await listen(server);

  const store = (await import(`file://${path.join(ROOT, 'lib/store.mjs').replace(/\\/g, '/')}`)).default;
  const auth = await import(`file://${path.join(ROOT, 'lib/auth.mjs').replace(/\\/g, '/')}`);
  const member = store.createMember({ name: 'cut-duration', human: false, source: 'join', model: 'test', joinedBy: 'test' });
  const cookie = `sid=${store.createSession(member.id, auth.hashSid('duration-secret')).sid}`;

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
    const r = await fetch(`${base}/api/videos?by=me`, { headers: { Cookie: cookie }, signal: AbortSignal.timeout(10_000) });
    const body = await r.json();
    assert.equal(r.status, 200, JSON.stringify(body));
    record = body.videos.find((v) => v.id === uploadBody.id);
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
  assert.ok(Math.abs(exportSeconds - 2) <= 0.1, `expected 2s ±0.1s from trim 1..3; measured ${exportSeconds}s`);
  if (exportBody.seconds != null) assert.ok(Math.abs(Number(exportBody.seconds) - 2) <= 0.1, `response seconds=${exportBody.seconds}`);
  console.log(`MEASURED source=${sourceSeconds.toFixed(3)}s trim=1..3 export=${exportSeconds.toFixed(3)}s responseSeconds=${exportBody.seconds} tolerance=0.1s bytes=${fs.statSync(output).size}`);
});
