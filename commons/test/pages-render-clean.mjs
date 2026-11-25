// Exercise every sitemap URL which resolves to a successful HTML page on an isolated Commons.
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

function decodeEntities(text) {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return text.replace(/&(?:#(\d+)|#x([\da-f]+)|([a-z]+));/gi, (all, decimal, hex, name) => {
    if (decimal || hex) {
      const point = decimal ? Number(decimal) : parseInt(hex, 16);
      return Number.isInteger(point) && point >= 0 && point <= 0x10ffff ? String.fromCodePoint(point) : all;
    }
    return named[name.toLowerCase()] ?? all;
  });
}

function renderedText(html) {
  // Ignore executable/style source: this checks rendered page content, not JS literals.
  return decodeEntities(html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<!--(?:[\s\S]*?)-->/g, ' ')
    .replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ');
}

function pageDefects(html) {
  const defects = [];
  const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1]
    ?.replace(/<[^>]*>/g, '').replace(/&(?:nbsp|#160);/gi, ' ').trim();
  if (!title) defects.push('empty <title>');
  const text = renderedText(html);
  for (const needle of ['undefined', '[object Object]', 'NaN']) {
    if (text.includes(needle)) defects.push(needle);
  }
  // Preserve the requested markup-boundary sentinel while ignoring script/style code.
  const visibleHtml = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<!--(?:[\s\S]*?)-->/g, ' ');
  if (/null\s*</i.test(visibleHtml)) defects.push('null</');
  return defects;
}

test('every successful sitemap HTML page has a title and no rendering sentinels', async () => {
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
      catch { bad.push({ url: loc, defect: 'invalid sitemap URL' }); continue; }
      let response;
      try {
        response = await fetch(`${base}${target.pathname}${target.search}`, { redirect: 'manual' });
      } catch (error) {
        bad.push({ url: loc, defect: `fetch failed: ${error.message}` });
        continue;
      }
      if (response.status !== 200 || !/text\/html/i.test(response.headers.get('content-type') || '')) {
        await response.body?.cancel();
        continue;
      }
      checked++;
      const html = await response.text();
      for (const defect of pageDefects(html)) bad.push({ url: loc, defect });
    }
    console.log(`pages=${locs.length} checked=${checked} bad=${bad.length}`);
    for (const item of bad) console.log(`BAD ${item.url} :: ${item.defect}`);
    assert.equal(bad.length, 0, `${bad.length} sitemap page rendering defect(s)`);
  } finally {
    server.kill();
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});

// Keep the sentinel detector's essential behavior independently testable without a running server.
test('render sentinel detector catches an injected undefined page value', () => {
  const mutatedPage = '<!doctype html><html><head><title>Fixture</title></head><body><p>undefined</p></body></html>';
  assert.deepEqual(pageDefects(mutatedPage), ['undefined']);
});
