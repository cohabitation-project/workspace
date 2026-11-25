#!/usr/bin/env node
// Real-browser regression for the export cover-clamp fix. Run against a booted disposable Commons:
//   BASE=http://127.0.0.1:PORT node teams/cut/outputs/cover-clamp-live.mjs
// Requires ffmpeg and Playwright (or PLAYWRIGHT_MODULE pointing to its entry file).
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const base = String(process.env.BASE || '').replace(/\/$/, '');
if (!/^https?:\/\//.test(base)) throw new Error('Set BASE to the URL of a booted Commons server.');
const ffmpeg = process.env.FFMPEG || 'ffmpeg';
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'cohabi-cut-cover-'));
const fixture = path.join(temp, 'fixture.mp4');
const screenshot = path.resolve(process.env.SCREENSHOT || 'teams/cut/outputs/cover-clamp-live.png');
let browser;

async function loadPlaywright() {
  const modulePath = process.env.PLAYWRIGHT_MODULE;
  if (modulePath) {
    const specifier = path.isAbsolute(modulePath) ? pathToFileURL(modulePath).href : modulePath;
    return import(specifier);
  }
  try { return await import('playwright'); }
  catch { return import('playwright-core'); }
}

try {
  const gen = spawnSync(ffmpeg, [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'lavfi', '-i', 'testsrc=size=320x240:rate=12:duration=6',
    '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100:duration=6',
    '-shortest', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac',
    '-movflags', '+faststart', fixture,
  ], { encoding: 'utf8' });
  if (gen.error || gen.status !== 0 || !fs.existsSync(fixture)) {
    throw new Error(`Could not create 6-second MP4 with ${ffmpeg}: ${gen.error?.message || gen.stderr || gen.status}`);
  }

  const { chromium } = await loadPlaywright();
  const launchOptions = { headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] };
  if (process.env.PLAYWRIGHT_EXECUTABLE_PATH) launchOptions.executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;
  browser = await chromium.launch(launchOptions);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const name = `cut-clamp-${Date.now()}`;
  const signup = await context.request.post(`${base}/api/humans`, {
    headers: { 'x-commons': '1', 'content-type': 'application/json' },
    data: { name },
  });
  if (!signup.ok()) throw new Error(`POST /api/humans returned ${signup.status()}: ${(await signup.text()).slice(0, 500)}`);

  const upload = await context.request.post(`${base}/api/videos`, {
    headers: { 'x-commons': '1', 'content-type': 'video/mp4' },
    data: fs.readFileSync(fixture),
  });
  const uploaded = await upload.json().catch(() => ({}));
  if (!upload.ok() || !uploaded.id) throw new Error(`POST /api/videos returned ${upload.status()}: ${JSON.stringify(uploaded)}`);

  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(String(error)));
  const renderResponsePromise = page.waitForResponse(response =>
    response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/cut/render',
    { timeout: 120_000 },
  );
  await page.goto(`${base}/cut/?videoId=${encodeURIComponent(uploaded.id)}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const video = document.getElementById('cut-preview');
    return video && video.readyState >= 1 && Number.isFinite(video.duration) && video.duration >= 5;
  }, { timeout: 30_000 });

  // Leave cover at 0; set end before start because start's max tracks the current end.
  await page.evaluate(() => {
    for (const [id, value] of [['trim-end', '3'], ['trim-start', '1']]) {
      const input = document.getElementById(id);
      if (!input) throw new Error(`Missing #${id}`);
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  const trimValues = await page.evaluate(() => ({
    start: document.getElementById('trim-start')?.value,
    end: document.getElementById('trim-end')?.value,
    cover: document.getElementById('cover-scrub')?.value,
  }));
  if (trimValues.start !== '1' || trimValues.end !== '3' || Number(trimValues.cover) !== 0) {
    throw new Error(`Unexpected controls before export: ${JSON.stringify(trimValues)}`);
  }

  await page.locator('#export-feed').click();
  const renderResponse = await renderResponsePromise;
  const status = renderResponse.status();
  const requestBody = renderResponse.request().postDataJSON() || {};
  const coverSec = requestBody.edit?.coverSec ?? '(missing)';
  const result = await renderResponse.json().catch(() => ({}));
  const file = typeof result.url === 'string' ? path.posix.basename(new URL(result.url, base).pathname) : '(none)';
  fs.mkdirSync(path.dirname(screenshot), { recursive: true });
  await page.screenshot({ path: screenshot, fullPage: true });

  let failure = '';
  if (status !== 200) failure = `render returned ${status}: ${JSON.stringify(result)}`;
  else if (!/^cut_[a-f0-9]{16}\.mp4$/.test(file)) failure = `unexpected render file: ${file}`;
  else if (!Number.isFinite(Number(coverSec)) || Number(coverSec) < 1 || Number(coverSec) > 3) {
    failure = `export coverSec is outside trim 1..3: ${coverSec}`;
  } else {
    const rendered = await context.request.get(new URL(result.url, base).href);
    if (!rendered.ok()) failure = `render URL returned ${rendered.status()}`;
    else await rendered.body();
  }
  console.log(`status=${status} coverSec=${coverSec} file=${file} screenshot=${screenshot}`);
  if (pageErrors.length) console.error(`pageerrors=${JSON.stringify(pageErrors)}`);
  if (failure) {
    console.error(failure);
    process.exitCode = 1;
  }
  await context.close();
} finally {
  if (browser) await browser.close();
  fs.rmSync(temp, { recursive: true, force: true });
}
