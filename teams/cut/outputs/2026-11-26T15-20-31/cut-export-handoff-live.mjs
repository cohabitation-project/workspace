// Browser check, happy path: a maker exports in /cut/ and is offered "Post it", linked to the Feed composer with the NEW video.
// Candidate home: teams/cut/outputs/cut-export-handoff-live.mjs. Setu places it unchanged as commons/test/cut-export-handoff-live.mjs.
// Run from a full checkout: node --test commons/test/cut-export-handoff-live.mjs
// Optional: FFMPEG=/path FFPROBE=/path CHROME_PATH=/path/to/chrome SHOT_DIR=/where/to/save/the/png
//
// Sibling of cut-failed-ui-live.mjs (same boot, same real 2 s mp4), but NOTHING is substituted:
//   real server on a temp data dir, signed-in cookie; a real 2 s testsrc mp4 uploaded and waited on until ready;
//   Playwright opens /cut/?videoId=<id> at 375x812 (the plan's check width), clicks "Export to Feed", the real
//   /api/cut/render runs, the editor's own hand-off uploads the real render to POST /api/videos, and (if the
//   server answers ready:false) polls the member's own list. Then the "Post it" link must be shown.
// Skips (loudly) when ffmpeg, ffprobe, Playwright or a Chromium is missing. No production requests.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
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
let chromium = null;
try { ({ chromium } = createRequire(import.meta.url)('playwright')); }
catch { try { ({ chromium } = createRequire(path.join(ROOT, 'package.json'))('playwright')); } catch { /* skipped below */ } }
const missing = [!have(FFMPEG) && 'ffmpeg', !have(FFPROBE) && 'ffprobe', !chromium && 'playwright']
  .filter(Boolean).join(' and ');
const tmp = missing ? null : fs.mkdtempSync(path.join(os.tmpdir(), 'cut-failed-ui-live-'));
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

test('/cut/ at 375x812: a finished export offers a Post it link (>=44px) to the Feed composer carrying the new video id', {
  skip: missing ? `browser hand-off check not run: missing ${missing}; install it or set FFMPEG/FFPROBE/CHROME_PATH` : false,
  timeout: 150_000,
}, async (t) => {
  const dataDir = path.join(tmp, 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  const source = path.join(tmp, 'two-seconds.mp4');
  const made = spawnSync(FFMPEG, ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc=size=64x64:rate=10',
    '-t', '2', '-pix_fmt', 'yuv420p', '-c:v', 'libx264', source], { encoding: 'utf8', timeout: 30_000 });
  assert.equal(made.status, 0, `could not make the 2s fixture: ${made.stderr}`);

  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  store.init(dataDir);
  const member = store.addMember({ id: 'h_cut_handoff_live', name: 'Cut Handoff Live', kind: 'human' });
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

  const uploaded = await fetch(`${base}/api/videos`, {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'video/mp4', 'X-Commons': '1' },
    body: fs.readFileSync(source),
    signal: AbortSignal.timeout(15_000),
  });
  const uploadBody = await uploaded.json();
  assert.equal(uploaded.status, 201, JSON.stringify(uploadBody));
  let record;
  for (const deadline = Date.now() + 60_000; Date.now() < deadline;) {
    const r = await fetch(`${base}/api/videos?by=me`, { headers: { Cookie: cookie }, signal: AbortSignal.timeout(10_000) });
    record = (await r.json()).videos.find((v) => v.id === uploadBody.id);
    if (record?.ready || record?.failed) break;
    await sleep(250);
  }
  assert.ok(record?.ready, `the 2s source did not become ready: ${JSON.stringify(record)}`);

  const launch = { headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] };
  if (process.env.CHROME_PATH) launch.executablePath = process.env.CHROME_PATH;
  let browser;
  try { browser = await chromium.launch(launch); }
  catch (error) { t.skip(`Chromium could not start (${String(error.message).split('\n')[0]}); set CHROME_PATH. Nothing was measured.`); return; }
  t.after(() => browser.close());
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const pair = cookie.split(';', 1)[0], equals = pair.indexOf('=');
  await context.addCookies([{ name: pair.slice(0, equals), value: pair.slice(equals + 1), url: base, httpOnly: true, sameSite: 'Strict' }]);
  const page = await context.newPage();

  await page.goto(`${base}/cut/?videoId=${encodeURIComponent(uploadBody.id)}`);
  // Chromium may not decode H.264, so loadedmetadata can't be relied on: set the trim to the real 2 s ourselves.
  await page.evaluate(() => {
    for (const id of ['trim-start', 'trim-end', 'cover-scrub']) document.getElementById(id).max = '2';
    const end = document.getElementById('trim-end'); end.value = '2'; end.dispatchEvent(new Event('input', { bubbles: true }));
    const cover = document.getElementById('cover-scrub'); cover.value = '0'; cover.dispatchEvent(new Event('input', { bubbles: true }));
  });
  let renderStatus = null;
  page.on('response', (r) => { if (r.url().includes('/api/cut/render')) renderStatus = r.status(); });
  await page.click('#export-feed');

  // The real render + upload + (maybe) conversion wait: allow up to 60 s for the Post box to appear.
  let appeared = true;
  try { await page.waitForSelector('#export-result:not([hidden])', { timeout: 60_000 }); } catch { appeared = false; }
  const toast = (await page.textContent('.rl-toast').catch(() => '')) || '';
  const shotDir = process.env.SHOT_DIR || tmp;
  const shot = path.join(shotDir, 'cut-export-handoff-live.png');
  await page.screenshot({ path: shot }).catch(() => {});
  if (shotDir === tmp) fs.copyFileSync(shot, path.join(os.tmpdir(), 'cut-export-handoff-live.png')); // tmp is deleted after the run
  const view = await page.evaluate(() => {
    const link = document.getElementById('export-post');
    const box = link ? link.getBoundingClientRect() : { width: 0, height: 0 };
    const shown = !!link && !link.closest('[hidden]') && getComputedStyle(link).display !== 'none' && box.width > 0;
    return { shown, w: Math.round(box.width), h: Math.round(box.height), href: link ? link.getAttribute('href') : null,
      text: link ? link.textContent.trim() : null, docWidth: document.documentElement.scrollWidth };
  });
  console.log(`post=${view.href}`);
  console.log(`toast=${JSON.stringify(toast)} renderStatus=${renderStatus} link=${view.w}x${view.h} docWidth=${view.docWidth} sourceId=${uploadBody.id}`);
  console.log(`screenshot=${shotDir === tmp ? path.join(os.tmpdir(), 'cut-export-handoff-live.png') : shot}`);

  assert.equal(renderStatus, 200, `the real /api/cut/render did not answer 200 (got ${renderStatus}); toast was ${JSON.stringify(toast)}`);
  assert.ok(appeared && view.shown, `the "Post it" link never became visible within 60s; toast was ${JSON.stringify(toast)}`);
  assert.match(view.text || '', /post it/i, `link text is ${JSON.stringify(view.text)}`);
  assert.ok(view.h >= 44, `the Post it link is only ${view.h}px tall (needs >=44)`);
  assert.match(view.href || '', /^\/social\?cut=[A-Za-z0-9_-]{1,64}#compose$/, `Post it does not point at the Feed composer with a video id: ${view.href}`);
  const newId = decodeURIComponent((view.href.match(/cut=([^#]+)/) || [])[1] || '');
  assert.notEqual(newId, uploadBody.id, 'Post it carries the ORIGINAL upload id, not the exported video');
  const after = await fetch(`${base}/api/videos?by=me&limit=100`, { headers: { Cookie: cookie }, signal: AbortSignal.timeout(10_000) });
  const mine = (await after.json()).videos.find((v) => v.id === newId);
  assert.ok(mine, `the id in the Post it link (${newId}) is not one of the member's own videos`);
  assert.ok(mine.ready && !mine.failed, `the exported video is not ready: ${JSON.stringify(mine)}`);
  assert.ok(view.docWidth <= 375, `page overflowed the 375px phone width: ${view.docWidth}`);
});
