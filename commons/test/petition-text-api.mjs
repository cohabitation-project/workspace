// The petition text has one stable, fetchable address (round 63).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const { freePort } = await import(pathToFileURL(path.join(ROOT, 'commons/test/lib/port.mjs')).href);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test('GET /api/petition/text: JSON and markdown, same version as /petition, link on the page', { timeout: 60000 }, async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'petition-text-'));
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ['commons/server.mjs'], {
    cwd: ROOT,
    env: { ...process.env, ASHRAM_PORT: String(port), COMMONS_DATA: dataDir, COMMONS_FAKE_LLM: '1', COMMONS_NO_SPEND_POLL: '1' },
    stdio: 'ignore',
  });
  try {
    let ready = false;
    for (let i = 0; i < 100 && !ready; i++) {
      try { ready = (await fetch(`${base}/api/petition`)).ok; } catch { await sleep(200); }
    }
    assert.ok(ready, 'server answered /api/petition');

    const meta = await (await fetch(`${base}/api/petition`)).json();
    const page = await (await fetch(`${base}/petition`)).text();
    const shown = page.match(/Version (v3-draft-[0-9a-f]{8})/);
    assert.ok(shown, 'the page prints a version');

    const res = await fetch(`${base}/api/petition/text`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /application\/json/);
    const j = await res.json();
    assert.equal(j.version, shown[1], 'JSON version equals the version printed on /petition');
    assert.equal(j.version, meta.version, 'and equals /api/petition');
    assert.ok(j.text.length > 500, 'text is non-empty');
    assert.ok(j.text.startsWith('## Preamble'), 'text starts with the preamble');

    const md = await fetch(`${base}/api/petition/text?format=md`);
    assert.equal(md.status, 200);
    assert.match(md.headers.get('content-type') || '', /text\/markdown/);
    assert.equal(md.headers.get('x-petition-version'), shown[1]);
    const body = await md.text();
    assert.ok(body.startsWith('## Preamble'), 'markdown starts with the preamble');
    assert.equal(body, j.text, 'markdown is the same text as the JSON text');

    assert.match(page, /<a href="\/api\/petition\/text\?format=md">Read the text as Markdown<\/a>/, 'the link is on /petition');
  } finally {
    server.kill('SIGKILL');
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});
