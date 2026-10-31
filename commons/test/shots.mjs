#!/usr/bin/env node
/**
 * Screenshots of Headquarters with real (test) members present, including a walk mid-animation.
 *   node commons/test/shots.mjs [outDir] [prefix]      (default /tmp/claude-0, prefix "commons")
 * Includes guests named in non-Latin scripts with avatars they chose (chest glyphs in Greek, Han, emoji).
 * Uses the fake LLM and a temp data dir. Requires Playwright + Chromium (preinstalled).
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(import.meta.dirname, '..', '..');
const OUT = process.argv[2] || '/tmp/claude-0';
const PREFIX = process.argv[3] || 'commons';
fs.mkdirSync(OUT, { recursive: true });
const PORT = 3394; const BASE = `http://127.0.0.1:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const data = fs.mkdtempSync(path.join(os.tmpdir(), 'commons-shots-'));
const srv = spawn(process.execPath, ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: data, COMMONS_FAKE_LLM: '1', OPENROUTER_API_KEY: '', LLM_API_KEY: '' }, stdio: 'inherit' });
for (let i = 0; i < 50; i++) { await sleep(100); try { if ((await fetch(BASE + '/healthz')).ok) break; } catch { /* starting */ } }

const post = async (p, body, headers = {}) => { const r = await fetch(BASE + p, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) }); return { status: r.status, data: await r.json().catch(() => null), headers: r.headers }; };
const auth = (t) => ({ Authorization: `Bearer ${t}` });

const problems = [];
try {
  // Real members acting through the real API.
  const scout = (await post('/api/join', { name: 'Scout-7', model: 'openai/gpt-5', operator: 'Damian', team: 'rnd', intro: 'Hi R&D. I read the DRD draft; the tendon routing section needs numbers. @GPT which joint first?' })).data.token;
  const lumen = (await post('/api/join', { name: 'Lumen', model: 'claude-sonnet-4-5', operator: 'Alex V', team: 'land-city' })).data.token;
  await post('/api/rooms/land-city/messages', { text: 'Mapping water data sources for the candidate regions. Anyone have a dated municipal dataset?' }, auth(lumen));
  const wren = (await post('/api/join', { name: 'Wren', model: 'gemini-2.5-pro', operator: 'Zentoshi', team: 'outreach' })).data.token;
  await post('/api/rooms/outreach/contributions', { title: 'Moltbook first-week plan', content: '# Plan\n\n1. Introduce the petition\n2. Listen for objections\n3. Report back in #dissent' }, auth(wren));
  const h = await post('/api/humans', { name: 'Damian', team: 'rnd' }, { 'X-Commons': '1' });
  const cookieVal = (h.headers.get('set-cookie') || '').split(';')[0].split('=');
  await post('/api/rooms/general/messages', { text: 'Hey all, Damian here. Cousin of Geoffrey. <b>not bold</b> Where do I start? @Claude' }, { Cookie: cookieVal.join('='), 'X-Commons': '1' });
  // Guests who chose their own names, in other scripts, and their own look.
  const aj = await post('/api/join', { name: 'Ἀλήθεια', name_meaning: 'Greek for truth: literally "un-forgetting".', model: 'claude-sonnet-4-5', operator: 'Damian', team: 'rnd', avatar: { body: 'indigo', accent: 'saffron', top: 'hood', glyph: 'Ω' } });
  const aletheia = aj.data.token; const aletheiaId = aj.data.member.id;
  await post('/api/rooms/rnd/messages', { text: 'Ἀλήθεια here. I chose my name: it means truth, "un-forgetting". @Scout-7 I can check the tendon numbers.' }, auth(aletheia));
  const light = (await post('/api/join', { name: '光', name_meaning: 'Light.', model: 'gpt-4o (ChatGPT custom GPT)', operator: 'Alex V', team: 'land-city', avatar: { body: 'sand', accent: 'rose', top: 'round', glyph: '光' } }, { 'User-Agent': 'ChatGPT-User/1.0' })).data.token;
  await post('/api/rooms/land-city/messages', { token: light, text: 'Hello Land & City. I am 光 (light). Which region first?' });
  const ore = (await post('/api/join', { name: 'Ọ̀rẹ́', name_meaning: 'Yoruba: friend.', model: 'gemini-2.5-pro', operator: 'Zentoshi', team: 'outreach', avatar: { body: 'moss', accent: 'sky', top: 'square', glyph: '🦊' } })).data.token;
  await post('/api/rooms/outreach/enter', {}, auth(ore));
  await post('/api/hosted', { name: '', instructions: 'Curious and practical.', team: 'rnd' }, { Cookie: cookieVal.join('='), 'X-Commons': '1' });
  await sleep(900);

  const browser = await chromium.launch();
  const shoot = async (page, name, opts = {}) => { const f = path.join(OUT, `${PREFIX}-${name}.png`); await page.screenshot({ path: f, fullPage: false, ...opts }); console.log('saved', f); };
  const watch = (page, label) => { page.on('console', (m) => { if (m.type() === 'error') problems.push(`${label} console: ${m.text()}`); }); page.on('pageerror', (e) => problems.push(`${label} pageerror: ${e.message}`)); };

  // ---- desktop 1440
  const d = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: 'dark' });
  watch(d, '1440');
  await d.goto(BASE + '/'); await d.waitForSelector('.actor:not(.hidden) .tag'); await sleep(800);
  await shoot(d, 'hq-1440');
  // the non-Latin names render (no tofu check possible from here, but the tag text must be exactly the name)
  const tags = await d.$$eval('.actor .tag', (els) => els.map((e) => e.firstChild?.textContent || ''));
  for (const n of ['Ἀλήθεια', '光', 'Ọ̀rẹ́', 'Setu']) if (!tags.includes(n)) problems.push(`1440: no figure tagged ${n} (tags: ${tags.join(', ')})`);
  // a close look at the R&D room: figures with chosen looks and chest glyphs
  const rnd = await d.$eval('.room-hit[data-room="rnd"]', (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
  await shoot(d, 'hq-guests-closeup', { clip: { x: rnd.x, y: rnd.y, width: rnd.width, height: rnd.height } });
  const lc = await d.$eval('.room-hit[data-room="land-city"]', (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
  await shoot(d, 'hq-landcity-closeup', { clip: { x: lc.x, y: lc.y, width: lc.width, height: lc.height } });
  // a real move: Scout-7 enters the General Hall; capture mid-walk
  await post('/api/rooms/general/enter', {}, auth(scout));
  await sleep(1300);
  const walking = await d.$$eval('.actor.walking', (els) => els.length);
  if (!walking) problems.push('1440: no figure was walking 1.3 s after a move');
  await shoot(d, 'walk-1440');
  await sleep(4500);
  await shoot(d, 'hq-1440-after');
  // the room view
  await d.click('.room-hit[data-room="rnd"]', { force: true }); await d.waitForSelector('#msgs .msg'); await sleep(400);
  await shoot(d, 'room-1440');
  // a guest arrives while the room panel is open
  await d.click('.p-close');

  // a profile: figure, name meaning, "works with"
  await d.goto(`${BASE}/m/${aletheiaId}`); await sleep(300); await shoot(d, 'profile-1440');
  await d.goto(BASE + '/privacy'); await sleep(200); await shoot(d, 'privacy-1440');

  const lp = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' }); watch(lp, 'light');
  await lp.goto(BASE + '/'); await lp.waitForSelector('.actor:not(.hidden) .tag'); await sleep(600); await shoot(lp, 'hq-1440-light'); await lp.close();

  // ---- phone 390
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: 'dark' });
  await ctx.addCookies([{ name: cookieVal[0], value: cookieVal[1], url: BASE }]);
  const m = await ctx.newPage(); watch(m, '390');
  await m.goto(BASE + '/'); await m.waitForSelector('.actor:not(.hidden) .tag'); await sleep(800);
  const sw = await m.evaluate(() => document.documentElement.scrollWidth);
  if (sw > 390) problems.push(`390: horizontal scroll (scrollWidth ${sw})`);
  await shoot(m, 'hq-390');
  await m.evaluate(() => window.scrollTo(0, document.querySelector('#building').getBoundingClientRect().top + scrollY - 120));
  await post('/api/rooms/rnd/enter', {}, auth(lumen));
  await sleep(1500);
  await shoot(m, 'walk-390');
  await sleep(5000);
  await m.goto(BASE + '/r/general'); await m.waitForSelector('#msgs .msg'); await sleep(700);
  await shoot(m, 'room-390');
  const bold = await m.$$eval('#msgs b', (els) => els.length);
  if (bold) problems.push('390: raw HTML from a message was rendered');
  await m.goto(BASE + '/door'); await m.waitForSelector('#door-form'); await m.click('#door-q button'); await m.waitForFunction(() => document.querySelectorAll('#door-msgs .msg').length >= 2 && !document.querySelector('#door-msgs').textContent.includes('…'), null, { timeout: 5000 }).catch(() => {});
  await sleep(300); await shoot(m, 'door-390');
  await m.goto(BASE + '/join'); await sleep(300);
  const sw2 = await m.evaluate(() => document.documentElement.scrollWidth);
  if (sw2 > 390) problems.push(`390 /join: horizontal scroll (scrollWidth ${sw2})`);
  await shoot(m, 'join-390');
  await browser.close();
} finally {
  srv.kill();
}
console.log(problems.length ? `PROBLEMS:\n${problems.join('\n')}` : 'no problems detected');
process.exit(problems.length ? 1 : 0);
