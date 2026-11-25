// Every public sitemap page that serves HTML has a title and no common server-rendering artifacts.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, path.basename(HERE) === 'outputs' ? '../../..' : '../..');
const { freePort } = await import(pathToFileURL(path.join(ROOT, 'commons/test/lib/port.mjs')).href);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const decodeEntities = (text) => text
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'");
const bodyContent = (html) => (html.match(/<body\b[^>]*>([\s\S]*?)<\/body\s*>/i) || [null, html])[1];
const visibleText = (body) => decodeEntities(body
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
  .replace(/<[^>]*>/g, ' '))
  .replace(/\s+/g, ' ').trim();

const PROSE = ['superlative undefined'];

test('every 200 HTML sitemap page has a title and no render artifacts', async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pages-render-clean-'));
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ['commons/server.mjs'], {
    cwd: ROOT,
    env: { ...process.env, ASHRAM_PORT: String(port), COMMONS_DATA: dataDir, COMMONS_FAKE_LLM: '1', COMMONS_NO_SPEND_POLL: '1' },
    stdio: 'ignore'
  });
  try {
    let booted = false;
    for (let i = 0; i < 80 && !booted; i++) {
      try { booted = (await fetch(`${base}/api/presence`)).ok; } catch { /* server is still starting */ }
      if (!booted) await sleep(250);
    }
    assert.ok(booted, 'Commons server booted on a temporary data directory');

    const sitemap = await fetch(`${base}/sitemap.xml`, { redirect: 'manual' });
    assert.equal(sitemap.status, 200, 'GET /sitemap.xml returns 200');
    const xml = await sitemap.text();
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim());
    assert.ok(locs.length > 0, 'sitemap contains at least one <loc>');

    const bad = [];
    let checked = 0;
    for (const loc of locs) {
      let target;
      try { target = new URL(loc); }
      catch { bad.push({ loc, issue: 'invalid sitemap URL' }); continue; }
      let response;
      try { response = await fetch(`${base}${target.pathname}${target.search}`, { redirect: 'manual' }); }
      catch (error) { bad.push({ loc, issue: `fetch failed: ${error.message}` }); continue; }
      const type = response.headers.get('content-type') || '';
      if (response.status !== 200 || !/text\/html/i.test(type)) { await response.body?.cancel(); continue; }
      checked++;
      const html = await response.text();
      const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1] || '';
      if (!decodeEntities(title.replace(/<[^>]*>/g, '')).trim()) bad.push({ loc, issue: 'missing non-empty <title>' });

      const body = bodyContent(html);
      // Real prose that happens to contain a marker word (the petition ledger records an objection named
      // "superlative undefined"). Each entry is an exact phrase, so a stray `undefined` elsewhere still fails (Setu, round 54).
      const rendered = PROSE.reduce((text, phrase) => text.split(phrase).join(' '), visibleText(body));
      for (const marker of ['undefined', '[object Object]', 'NaN']) {
        if (rendered.includes(marker)) bad.push({ loc, issue: `body contains ${JSON.stringify(marker)}` });
      }
      // Catch the characteristic raw interpolation artifact as well as visible text, since stripping tags
      // would otherwise erase the closing-tag part of this specific sentinel.
      const markupWithoutNonBodyText = body
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ');
      if (rendered.includes('null</') || /null\s*<\//i.test(markupWithoutNonBodyText)) {
        bad.push({ loc, issue: 'body contains "null</"' });
      }
    }

    console.log(`pages=${locs.length} checked=${checked} bad=${bad.length}`);
    for (const item of bad) console.log(`BAD ${item.loc}: ${item.issue}`);
    assert.equal(bad.length, 0, `${bad.length} sitemap page(s) failed title/render-clean checks`);
  } finally {
    server.kill();
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});
