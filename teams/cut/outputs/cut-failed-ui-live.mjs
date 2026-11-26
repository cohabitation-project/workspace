// Browser check: the failure message a maker SEES in /cut/ when the saved export can't be converted.
// Candidate home: teams/cut/outputs/cut-failed-ui-live.mjs. Setu places it unchanged as commons/test/cut-failed-ui-live.mjs.
// Run from a full checkout: node --test commons/test/cut-failed-ui-live.mjs
// Optional: FFMPEG=/path FFPROBE=/path CHROME_PATH=/path/to/chrome SHOT_DIR=/where/to/save/the/png
//
// How it reaches the real failure path (there is no file input in /cut/: the editor opens a video by ?videoId=):
//   1. real server on a temp data dir, signed-in cookie (same boot as cut-video-failed-http.mjs);
//   2. a real 2 s testsrc mp4 is uploaded through the API and waited on until ready;
//   3. Playwright opens /cut/?videoId=<id> at 390x844 and clicks "Export to Feed". The real /api/cut/render runs;
//   4. ONLY the download of the finished render is replaced by 4096 junk bytes, so the editor's own hand-off
//      uploads junk to the real POST /api/videos, the real ffmpeg fails to convert it, and the editor's poll
//      sees the real failed record. Nothing about the failure message is stubbed.
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

test('/cut/ at 390x844: an export whose saved video cannot be converted shows the failure message and no Post control', {
  skip: missing ? `browser failure check not run: missing ${missing}; install it or set FFMPEG/FFPROBE/CHROME_PATH` : false,
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
  const member = store.addMember({ id: 'h_cut_failed_ui_live', name: 'Cut Failed UI Live', kind: 'human' });
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
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const pair = cookie.split(';', 1)[0], equals = pair.indexOf('=');
  await context.addCookies([{ name: pair.slice(0, equals), value: pair.slice(equals + 1), url: base, httpOnly: true, sameSite: 'Strict' }]);
  const page = await context.newPage();

  // Replace only the download of the finished render with junk; everything else is the real server.
  const junk = Buffer.alloc(4096);
  let renderUrl = null;
  await page.route('**/api/cut/render', async (route) => {
    const response = await route.fetch();
    const body = await response.json().catch(() => ({}));
    if (typeof body.url === 'string') {
      renderUrl = body.url;
      await page.route(`**${body.url}`, (r) => r.fulfill({ status: 200, contentType: 'video/mp4', body: junk }));
    }
    await route.fulfill({ response, body: JSON.stringify(body), contentType: 'application/json' });
  });

  await page.goto(`${base}/cut/?videoId=${encodeURIComponent(uploadBody.id)}`);
  // Chromium may not decode H.264, so loadedmetadata can't be relied on: set the trim to the real 2 s ourselves.
  await page.evaluate(() => {
    for (const id of ['trim-start', 'trim-end', 'cover-scrub']) document.getElementById(id).max = '2';
    const end = document.getElementById('trim-end'); end.value = '2'; end.dispatchEvent(new Event('input', { bubbles: true }));
    const cover = document.getElementById('cover-scrub'); cover.value = '0'; cover.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.click('#export-feed');

  const SEEN = /couldn't (prepare|convert) this video/i;
  let toast = '';
  try {
    await page.waitForFunction((src) => {
      const el = document.querySelector('.rl-toast');
      return el && !el.hidden && new RegExp(src, 'i').test(el.textContent);
    }, SEEN.source, { timeout: 15_000, polling: 100 });
    toast = await page.textContent('.rl-toast');
  } catch {
    toast = (await page.textContent('.rl-toast').catch(() => '')) || '';
  }
  const shotDir = process.env.SHOT_DIR || tmp;
  const shot = path.join(shotDir, 'cut-failed-ui-live.png');
  await page.screenshot({ path: shot }).catch(() => {});
  if (shotDir === tmp) fs.copyFileSync(shot, path.join(os.tmpdir(), 'cut-failed-ui-live.png')); // tmp is deleted after the run
  const view = await page.evaluate(() => {
    const shown = (el) => !!el && !el.hidden && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0;
    return {
      resultBoxVisible: shown(document.getElementById('export-result')),
      postLinkVisible: shown(document.getElementById('export-post')),
      anyPostLinkVisible: [...document.querySelectorAll('a')].some((a) => /post it/i.test(a.textContent) && shown(a)),
      exportButtonVisible: shown(document.getElementById('export-feed')),
      docWidth: document.documentElement.scrollWidth,
    };
  });
  console.log(`toast=${JSON.stringify(toast)}`);
  console.log(`screenshot=${shotDir === tmp ? path.join(os.tmpdir(), 'cut-failed-ui-live.png') : shot} renderUrl=${renderUrl} junkBytes=${junk.length} view=${JSON.stringify(view)}`);

  assert.ok(renderUrl, 'the real /api/cut/render never answered with a video url (the export did not reach the hand-off)');
  assert.match(toast, SEEN, `the maker did not see a failure message within 15s; toast was ${JSON.stringify(toast)}`);
  assert.doesNotMatch(toast, /ffmpeg|stderr|undefined|\[object/i, `failure message leaked internals: ${toast}`);
  assert.equal(view.resultBoxVisible, false, 'the "Post it" box is visible after a failed conversion');
  assert.equal(view.postLinkVisible, false, 'the Post link is visible after a failed conversion');
  assert.equal(view.anyPostLinkVisible, false, 'some "Post it" link is visible after a failed conversion');
  assert.ok(view.docWidth <= 390, `page overflowed the 390px phone width: ${view.docWidth}`);
  // The always-present "Export to Feed" button is not asserted hidden: the maker may retry. Its state is printed above.
});
