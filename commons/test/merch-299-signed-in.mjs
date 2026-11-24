// Diagnostic for PR #299 at 1536x900, signed in. Not part of CI.
// Run from the checkout under test: node commons/test/merch-299-signed-in.mjs
// Optional: PR299_OUTPUT_DIR=/path PR299_HEAD=3e60cce9... node ...
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer-core';
import { freePort } from './lib/port.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const OUT = process.env.PR299_OUTPUT_DIR || process.env.OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'merch-299-'));
fs.mkdirSync(OUT, { recursive: true });
const resultPath = path.join(OUT, 'pr299-signed-in-1536-result.json');
const shotPath = path.join(OUT, 'pr299-signed-in-1536.png');
const serverLogPath = path.join(OUT, 'round49-server.log');
const expectedHead = process.env.PR299_HEAD || '3e60cce9e99f6a5dce76082d893783f72105798d';
const result = {
  status: 'started', head: process.env.PR299_HEAD || null, viewport: { width: 1536, height: 900 },
  stage: 'boot', started_at: new Date().toISOString(), evidence: {}, failure: null,
};
const save = () => fs.writeFileSync(resultPath, JSON.stringify(result, null, 2) + '\n');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function deadline(name, fn, ms = 45_000) {
  let timer;
  result.stage = name; save();
  try {
    return await Promise.race([
      Promise.resolve().then(fn),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${name}: exceeded ${ms}ms`)), ms); }),
    ]);
  } finally { clearTimeout(timer); }
}
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC', 'base64');
let browser, srv, fake, serverLog;
try {
  const FP = await freePort();
  const seen = [];
  fake = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://fake.local');
    const json = (code, value) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(value)); };
    let m = u.pathname.match(/^\/products\/(\d+)$/);
    if (m) {
      const id = Number(m[1]);
      const variants = id === 3
        ? [{ id: 5, name: '12″×16″', size: '12″×16″', price: '24.25' }, { id: 7, name: '16″×20″', size: '16″×20″', price: '29.50' }]
        : [{ id: 4012, name: 'Black / M', color: 'Black', color_code: '#111111', size: 'M', price: '11.50' }, { id: 4022, name: 'White / M', color: 'White', color_code: '#ffffff', size: 'M', price: '11.50' }];
      return json(200, { code: 200, result: { product: { id, title: id === 3 ? 'Canvas (in)' : `Diagnostic product ${id}`, currency: 'USD', is_discontinued: false }, variants: variants.map((v) => ({ ...v, in_stock: true })) } });
    }
    m = u.pathname.match(/^\/mockup-generator\/printfiles\/(\d+)$/);
    if (m) {
      const canvas = m[1] === '3';
      return json(200, { code: 200, result: {
        available_placements: { default: 'Print' },
        printfiles: [{ printfile_id: 1, width: canvas ? 3600 : 1800, height: canvas ? 4800 : 2400, dpi: 150 }],
        variant_printfiles: (canvas ? [5, 7] : [4012, 4022]).map((variant_id) => ({ variant_id, placements: { default: 1 } })),
      } });
    }
    m = u.pathname.match(/^\/mockup-generator\/templates\/(\d+)$/);
    if (m) return json(200, { code: 200, result: {
      version: 1, min_dpi: 150,
      variant_mapping: [{ variant_id: m[1] === '3' ? 5 : 4012, templates: [{ placement: 'default', template_id: 919 }] }],
      templates: [{ template_id: 919, image_url: `http://127.0.0.1:${FP}/template.png`, background_url: null, background_color: '#ffffff', printfile_id: 1, template_width: 1000, template_height: 1000, print_area_width: 300, print_area_height: 400, print_area_top: 200, print_area_left: 350 }],
    } });
    if (u.pathname === '/template.png' || u.pathname === '/mockup.png') { res.writeHead(200, { 'content-type': 'image/png' }); return res.end(PNG); }
    if (u.pathname === '/mockup-generator/task') return json(200, { code: 200, result: { task_key: u.searchParams.get('task_key'), status: 'completed', mockups: [{ placement: 'default', mockup_url: `http://127.0.0.1:${FP}/mockup.png` }] } });
    m = u.pathname.match(/^\/mockup-generator\/create-task\/(\d+)$/);
    if (m && req.method === 'POST') return json(200, { code: 200, result: { task_key: `diagnostic-${++seen.length}`, status: 'pending' } });
    json(404, { code: 404, path: u.pathname });
  });
  await deadline('fake-printful-listen', () => new Promise((resolve, reject) => { fake.once('error', reject); fake.listen(FP, '127.0.0.1', resolve); }));
  const PORT = await freePort();
  const B = `http://127.0.0.1:${PORT}`;
  const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'merch-299-data-'));
  serverLog = fs.openSync(serverLogPath, 'w');
  srv = spawn(process.execPath, ['commons/server.mjs'], { cwd: ROOT, env: {
    ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: DATA, COMMONS_FAKE_LLM: '1', COMMONS_TEST_ASSETS: '1',
    COMMONS_PUBLIC_URL: B, PRINTFUL_TOKEN: 'test-token', PRINTFUL_API_URL: `http://127.0.0.1:${FP}`,
    PRINTFUL_MOCKUPS_PER_MINUTE: '10', MERCH_TICK_MS: '1000', COMMONS_FEE_PERCENT: '0',
  }, stdio: ['ignore', serverLog, serverLog] });
  const J = { 'content-type': 'application/json', 'x-commons': '1' };
  const call = (p, method = 'GET', body, cookie) => fetch(B + p, { method, headers: { ...J, ...(cookie ? { cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(45_000) });
  await deadline('boot', async () => {
    for (let i = 0; i < 150; i++) {
      if (srv.exitCode !== null) throw new Error(`server exited ${srv.exitCode}; see ${serverLogPath}`);
      try { const r = await fetch(B + '/healthz', { signal: AbortSignal.timeout(1000) }); if (r.ok) return; } catch { /* booting */ }
      await sleep(250);
    }
    throw new Error(`server did not become healthy; see ${serverLogPath}`);
  });
  const made = await deadline('sign-in', async () => {
    const r = await call('/api/humans', 'POST', { name: 'PR299 Painter', bio: 'isolated visual diagnostic' });
    const body = await r.json();
    if (r.status !== 200 && r.status !== 201) throw new Error(`sign-in ${r.status}: ${JSON.stringify(body)}`);
    const setCookie = r.headers.get('set-cookie') || '';
    const cookie = setCookie.split(';')[0];
    if (!cookie.includes('=')) throw new Error('sign-in returned no session cookie');
    return { cookie, member: body.member };
  });
  result.evidence.member_id = made.member?.id || null; save();
  const listing = await deadline('listing', async () => {
    const imageResponse = await call('/api/images', 'POST', { data: PNG.toString('base64'), alt: 'a single-colour diagnostic artwork' }, made.cookie);
    const image = await imageResponse.json();
    if (!imageResponse.ok) throw new Error(`image ${imageResponse.status}: ${JSON.stringify(image)}`);
    const r = await call('/api/market/listings', 'POST', { title: 'PR299 diagnostic art', text: 'An isolated layout measurement.', category: 'art', type: 'product', price: { mode: 'quote' }, license: 'all-rights', rights: true, images: [image.id] }, made.cookie);
    const body = await r.json();
    if (r.status !== 201) throw new Error(`listing ${r.status}: ${JSON.stringify(body)}`);
    return { id: body.id, image_id: image.id };
  });
  result.evidence.listing_id = listing.id; save();
  browser = await deadline('browser-launch', () => puppeteer.launch({ executablePath: '/opt/commons-browser/chrome-linux64/chrome', headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] }));
  const page = await browser.newPage();
  await page.setViewport({ width: 1536, height: 900, deviceScaleFactor: 1 });
  await page.setExtraHTTPHeaders({ cookie: made.cookie });
  const target = `/label/l/${listing.id}/products`;
  const navigation = await deadline('navigation', () => page.goto(B + target, { waitUntil: 'networkidle0', timeout: 45_000 }));
  result.evidence.http_status = navigation?.status() || null;
  result.evidence.url = page.url(); save();
  await deadline('selector', () => page.waitForFunction(() => {
    const app = document.querySelector('#mp-app');
    return app && app.querySelector('.cz-stage, .cz-hang') && app.querySelector('.cz-pay') && !/loading/i.test(app.textContent.slice(0, 300));
  }, { timeout: 45_000 }));
  await deadline('fonts', () => page.evaluate(() => document.fonts.ready));
  await sleep(500);
  result.evidence.geometry = await deadline('geometry', () => page.evaluate(() => {
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: +r.x.toFixed(2), y: +r.y.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2), right: +r.right.toFixed(2), bottom: +r.bottom.toFixed(2) };
    };
    const overlap = (a, b) => a && b ? +Math.max(0, Math.min(a.right, b.right) - Math.max(a.x, b.x)).toFixed(2) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y)) : 0;
    const app = document.querySelector('#mp-app');
    const head = app?.querySelector('.cz-head');
    const actions = app?.querySelector('.cz-actions');
    const actionsCard = actions?.closest('.cz-card') || actions;
    const priceHead = app?.querySelector('.cz-payhead');
    const pricingHeading = priceHead?.querySelector('h1,h2,h3,h4');
    const price = priceHead?.querySelector('.cz-price') || app?.querySelector('.cz-price');
    const table = app?.querySelector('.cz-pay table, table.cz-money, .cz-money');
    const all = [...document.querySelectorAll('body *')];
    const purpleBands = all.filter((el) => {
      const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      if (r.width < innerWidth * 0.65 || r.height < 2 || r.height > 300 || r.bottom < 0 || r.top > innerHeight) return false;
      const rgb = cs.backgroundColor.match(/[\d.]+/g)?.map(Number) || [];
      const purple = rgb.length >= 3 && rgb[0] > 45 && rgb[2] > 65 && rgb[2] > rgb[1] * 1.25 && rgb[0] > rgb[1] * 1.15;
      return purple || (/gradient/.test(cs.backgroundImage) && /(91,\s*58,\s*140|122,\s*85,\s*179)/.test(cs.backgroundImage));
    }).map((el) => ({ tag: el.tagName, id: el.id, class: String(el.className).slice(0, 180), rect: rect(el), background: getComputedStyle(el).backgroundColor, image: getComputedStyle(el).backgroundImage.slice(0, 250) }));
    const hr = rect(head), ar = rect(actionsCard), phr = rect(pricingHeading), pr = rect(price), tr = rect(table);
    return {
      signed_in_label: { member_name_visible: document.body.innerText.includes('PR299 Painter'), sign_out_visible: /sign out/i.test(document.body.innerText), header_text: document.querySelector('.fx-top, header')?.innerText.slice(0, 600) || '' },
      header: hr, actions_card: ar, actions_card_heading_overlap_px2: overlap(ar, hr),
      pricing_heading: phr, price: pr, pricing_heading_price_overlap_px2: overlap(phr, pr),
      table: tr ? { rect: tr, client_width: table.clientWidth, scroll_width: table.scrollWidth, horizontal_overflow_px: Math.max(0, table.scrollWidth - table.clientWidth), outside_viewport_px: Math.max(0, tr.right - innerWidth) } : null,
      document_horizontal_overflow_px: Math.max(0, document.documentElement.scrollWidth - innerWidth),
      purple_band_bottom: purpleBands.length ? Math.max(...purpleBands.map((x) => x.rect.bottom)) : null,
      purple_bands: purpleBands,
      counts: { products: app?.querySelectorAll('.cz-prod').length || 0, headings: app?.querySelectorAll('h1,h2,h3').length || 0 },
      app_text: app?.innerText.slice(0, 2500) || '',
    };
  }));
  await deadline('screenshot', () => page.screenshot({ path: shotPath, fullPage: true }));
  result.evidence.screenshot = shotPath;
  result.evidence.console_errors = [];
  result.status = 'measured'; result.stage = 'done'; result.finished_at = new Date().toISOString(); save();
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  result.status = 'failed'; result.failure = { stage: result.stage, message: error.message, stack: error.stack }; result.finished_at = new Date().toISOString(); save();
  console.error(JSON.stringify(result, null, 2)); process.exitCode = 1;
} finally {
  await deadline('close', async () => {
    if (browser) await Promise.race([browser.close(), sleep(5000)]);
    if (srv && srv.exitCode === null) { srv.kill('SIGTERM'); await sleep(300); if (srv.exitCode === null) srv.kill('SIGKILL'); }
    if (fake) await new Promise((resolve) => fake.close(resolve));
    if (serverLog) fs.closeSync(serverLog);
  }).catch((error) => { result.close_failure = error.message; save(); });
}
