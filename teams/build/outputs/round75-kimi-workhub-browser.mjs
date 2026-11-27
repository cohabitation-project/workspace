// Round-75 review harness. Candidate only; not placed in commons/test.
// Usage: BASE_URL=http://127.0.0.1:3000 COHABI_COOKIE='name=value' node ...
import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const base = process.env.BASE_URL || 'http://127.0.0.1:3000';
const out = process.env.OUT_JSON || 'workhub-review.json';
const cookie = process.env.COHABI_COOKIE;
if (!cookie) throw new Error('COHABI_COOKIE is required for the signed-in review');
const [name, ...rest] = cookie.split('=');
const browser = await chromium.launch({ headless: true });
const report = { base, viewports: [] };
for (const vp of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
  const context = await browser.newContext({ viewport: vp });
  await context.addCookies([{ name, value: rest.join('='), url: base }]);
  const page = await context.newPage();
  const row = { viewport: vp, console: [], pageErrors: [], responses: [] };
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') row.console.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', e => row.pageErrors.push(String(e)));
  page.on('response', r => { if (/\/api\/desk|\/messenger|\/hq/.test(r.url())) row.responses.push({ status: r.status(), url: r.url() }); });
  row.hqStatus = (await page.goto(`${base}/hq`, { waitUntil: 'networkidle' })).status();
  row.url = page.url();
  row.text = (await page.locator('body').innerText()).slice(0, 30000);
  row.controls = await page.locator('button,a[href],input,select,textarea').evaluateAll(nodes => nodes.filter(n => {
    const r = n.getBoundingClientRect(); const s = getComputedStyle(n);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden';
  }).map(n => { const r = n.getBoundingClientRect(); return { tag: n.tagName, text: (n.innerText || n.getAttribute('aria-label') || n.getAttribute('href') || '').trim().slice(0, 160), width: r.width, height: r.height }; }));
  row.document = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth }));
  row.links = await page.locator('a[href]').evaluateAll(nodes => nodes.map(n => ({ text: (n.innerText || '').trim(), href: n.href })));
  await page.screenshot({ path: `workhub-${vp.width}.png`, fullPage: true });
  report.viewports.push(row);
  await context.close();
}
await browser.close();
await fs.writeFile(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
