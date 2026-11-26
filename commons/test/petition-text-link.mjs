#!/usr/bin/env node
// End-to-end check of the petition page's Markdown link on an isolated Commons server.
// node commons/test/petition-text-link.mjs
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';

const root = path.resolve(import.meta.dirname, '../..');
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'petition-text-link-'));
const port = await new Promise((resolve) => {
  const server = net.createServer();
  server.listen(0, '127.0.0.1', () => {
    const p = server.address().port;
    server.close(() => resolve(p));
  });
});
const base = `http://127.0.0.1:${port}`;
const expectedHref = '/api/petition/text?format=md';

export function markdownLink(html) {
  const match = html.match(/<a\b[^>]*href="([^"]+)"[^>]*>Read the text as Markdown<\/a>/i);
  return match?.[1] ?? null;
}

export function printedVersion(html) {
  const match = html.match(/Version\s+([^<\s]+)\s*\(/i);
  return match?.[1] ?? null;
}

const server = spawn(process.execPath, ['commons/server.mjs'], {
  cwd: root,
  env: {
    ...process.env,
    COMMONS_DATA: data,
    ASHRAM_PORT: String(port),
    COMMONS_FAKE_LLM: '1',
    OPENROUTER_API_KEY: '',
    LLM_API_KEY: '',
    COMMONS_NO_SPEND_POLL: '1',
  },
  stdio: 'ignore',
});

try {
  let ready = false;
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(`${base}/api/rooms`)).ok) {
        ready = true;
        break;
      }
    } catch { /* booting */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(ready, 'isolated Commons server starts');

  const pageResponse = await fetch(`${base}/petition`);
  assert.equal(pageResponse.status, 200, 'GET /petition responds 200');
  const pageHtml = await pageResponse.text();
  const version = printedVersion(pageHtml);
  assert.ok(version, 'petition page prints a version after "Version "');

  // Set true only in a scratch mutant copy: the same page check must then fail.
  const MUTATE_PAGE_HTML = false;
  const htmlForLinkCheck = MUTATE_PAGE_HTML
    ? pageHtml.replace(`href="${expectedHref}"`, 'href="/api/petition/text?format=html"')
    : pageHtml;
  const href = markdownLink(htmlForLinkCheck);
  assert.equal(href, expectedHref, 'petition page links to its Markdown representation');

  const markdownResponse = await fetch(new URL(href, base));
  assert.equal(markdownResponse.status, 200, 'the linked Markdown route responds 200');
  const contentType = markdownResponse.headers.get('content-type') || '';
  assert.ok(contentType.startsWith('text/markdown'), `Markdown content-type starts with text/markdown (got ${contentType})`);
  assert.match(markdownResponse.headers.get('x-petition-version') || '', new RegExp(`^${version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), 'Markdown response names the printed petition version');
  const markdown = await markdownResponse.text();
  assert.ok(markdown.trim().length > 0, 'Markdown body is nonempty');
  // The Markdown body is the petition text itself; the draft id is carried by X-Petition-Version (checked above)
  // and by JSON.version, whose text must equal this body (below). Setu, round 67: the round-66 job wrongly asked for it in the body.

  const jsonResponse = await fetch(`${base}/api/petition/text`);
  assert.equal(jsonResponse.status, 200, 'GET /api/petition/text responds 200');
  const payload = await jsonResponse.json();
  assert.equal(payload.version, version, 'JSON version equals the version printed on /petition');
  assert.equal(payload.text, markdown, 'JSON and Markdown representations carry the same petition text');

  console.log(`PASS: /petition version=${version} href=${href} markdown-bytes=${Buffer.byteLength(markdown)} content-type=${contentType} json-version=${payload.version}`);
} finally {
  server.kill();
  fs.rmSync(data, { recursive: true, force: true });
}
