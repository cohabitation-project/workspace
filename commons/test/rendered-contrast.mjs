// Rendered readability (Geoffrey, 2026-11-19: "purple text on the black background ... why is this a reoccurring mistake").
// The CSS-variable test (theme-contrast.mjs) can't see a light-theme colour landing on a dark page, so this one renders
// every market section and every page theme in headless Chrome and measures the text people actually see:
// the site header (and its menus) on every market section, every page theme, the feed and the members page.
// Body text over themed backgrounds is next: its scrims and pictures need a smarter 'what is behind this' than this has. WCAG AA: 4.5:1 body text, 3:1 large text.
// Skips (does not pass silently) when no Chrome is installed; GitHub's ubuntu runners have one.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { freePort } from './lib/port.mjs';

const CHROME = ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => fs.existsSync(p));
let puppeteer = null; try { puppeteer = (await import('puppeteer-core')).default; } catch { /* not installed */ }

test('the site header is readable on every market section and every page theme', { skip: !CHROME || !puppeteer ? 'no Chrome/puppeteer-core here' : false }, async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'rendered-contrast-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D }, stdio: 'ignore' });
  let br;
  try {
    for (let i = 0; i < 80; i++) { try { if ((await fetch(`${B}/skill.md`)).ok) break; } catch { /* starting */ } await new Promise((s) => setTimeout(s, 250)); }
    const r = await fetch(`${B}/api/humans`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-commons': '1' }, body: JSON.stringify({ name: 'ContrastOwner', bio: 'x', keep: true }) });
    const cookie = r.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
    const H = { 'content-type': 'application/json', 'x-commons': '1', cookie, origin: B };
    const sections = ['', 'music', 'art', 'video', 'writing', 'software', 'services', 'classifieds'].map((c) => (c ? `/label?cat=${c}` : '/label'));
    const themed = [];
    const themes = (await import('../lib/orgpages.mjs')).THEMES;
    for (const th of Object.keys(themes)) {
      const p = await (await fetch(`${B}/api/pages`, { method: 'POST', headers: H, body: JSON.stringify({ kind: 'business', name: `Theme ${th}` }) })).json();
      await fetch(`${B}/api/pages/${p.id}`, { method: 'PATCH', headers: H, body: JSON.stringify({ theme: th }) });
      themed.push(p.href);
    }
    br = await puppeteer.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
    const pg = await br.newPage(); await pg.setViewport({ width: 1280, height: 900 });
    const problems = [];
    for (const [u, scope] of [...sections.map((u) => [u, '.fx-top']), ...themed.map((u) => [u, '.fx-top']), ['/social', '.fx-top'], ['/members', '.fx-top']]) {
      await pg.goto(B + u, { waitUntil: 'networkidle0' });
      const bad = await pg.evaluate((scope) => {
        const lum = (c) => { const [r, g, b] = c.match(/[\d.]+/g).slice(0, 3).map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
        // The colour behind an element: the first opaque background up the tree. Text over a picture or gradient is
        // skipped here (its scrim is a design matter, checked by eye); text over plain colour is measured.
        const behind = (e) => { for (let x = e; x; x = x.parentElement) { const s = getComputedStyle(x); if (s.backgroundImage !== 'none' && x !== document.body && x !== document.documentElement) return null; const m = s.backgroundColor.match(/[\d.]+/g); if (m && (m[3] === undefined || +m[3] > 0.5)) return s.backgroundColor; } const bodyImg = getComputedStyle(document.body).backgroundImage; return bodyImg !== 'none' ? null : 'rgb(255,255,255)'; };
        const out = [];
        for (const root of document.querySelectorAll(scope)) for (const e of root.querySelectorAll('*')) {
          if (!e.getBoundingClientRect().width || getComputedStyle(e).visibility === 'hidden' || +getComputedStyle(e).opacity < 0.5) continue;
          if (![...e.childNodes].some((n) => n.nodeType === 3 && /[A-Za-z0-9]/.test(n.textContent))) continue;
          const bg = behind(e); if (!bg) continue;
          const s = getComputedStyle(e); const a = lum(s.color); const b = lum(bg);
          const cr = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
          const large = parseFloat(s.fontSize) >= 24 || (parseFloat(s.fontSize) >= 18.66 && +s.fontWeight >= 700);
          if (cr < (large ? 3 : 4.5)) out.push(`${cr.toFixed(2)}:1 "${e.textContent.trim().slice(0, 30)}" ${s.color} on ${bg}`);
        }
        return [...new Set(out)];
      }, scope);
      for (const b of bad) problems.push(`${u}  ${b}`);
    }
    assert.deepEqual(problems, [], `unreadable text:\n${problems.join('\n')}`);
  } finally { await br?.close(); srv.kill(); }
});
