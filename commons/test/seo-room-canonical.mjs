// Room pages name their own canonical (Round 69, Ash's SEO list, part 2).
//   /room/:id  -> exactly one <link rel="canonical"> in the HTML, ending in /room/<id>
//   /r/:id     -> the chat view: exactly one rel="canonical" in the Link header AND in the HTML, both ending in /room/<id>
//   a second room never points at general.
// (On main the /room/:id HTML tag is added by agentdoor.inject from the request path; this test pins what the
// page serves, whoever adds it. The defect this round fixes is /r/:id, which named ITSELF as canonical.)
// Boots a real server on a temp data dir, like seo-sitemap-signin.mjs.
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
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const htmlCanon = (html) => [...html.matchAll(/<link\b[^>]*\brel="canonical"[^>]*>/gi)].map((m) => (m[0].match(/href="([^"]*)"/) || [])[1]);
const headerCanon = (link) => [...String(link || '').matchAll(/<([^>]+)>\s*;\s*rel="canonical"/gi)].map((m) => m[1]);

test('room pages: one canonical each, /r/ points at /room/', { timeout: 120000 }, async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-room-canonical-'));
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ['commons/server.mjs'], {
    cwd: ROOT,
    env: { ...process.env, ASHRAM_PORT: String(port), COMMONS_DATA: dataDir, COMMONS_FAKE_LLM: '1', COMMONS_NO_SPEND_POLL: '1' },
    stdio: 'ignore',
  });
  try {
    let booted = false;
    for (let i = 0; i < 120 && !booted; i++) {
      try { booted = (await fetch(`${base}/api/presence`)).ok; } catch { /* still starting */ }
      if (!booted) await sleep(250);
    }
    assert.ok(booted, 'server booted');

    // a second room that exists: take one from the rooms the server itself lists
    const rooms = await (await fetch(`${base}/api/rooms`)).json().catch(() => null);
    const list = Array.isArray(rooms) ? rooms : (rooms && rooms.rooms) || [];
    const other = (list.map((r) => r.id).find((id) => id && id !== 'general' && id !== 'great-hall')) || 'great-hall';

    for (const id of ['general', other]) {
      const res = await fetch(`${base}/room/${id}`);
      assert.equal(res.status, 200, `/room/${id} opens`);
      const tags = htmlCanon(await res.text());
      const hdr = headerCanon(res.headers.get('link'));
      console.log(`/room/${id} html=${JSON.stringify(tags)} header=${JSON.stringify(hdr)}`);
      assert.equal(tags.length, 1, `/room/${id} has exactly one <link rel="canonical">`);
      assert.ok(tags[0].endsWith(`/room/${id}`), `/room/${id} canonical ends in /room/${id}: ${tags[0]}`);
      assert.equal(hdr.length, 1, `/room/${id} has one canonical in its Link header`);
      assert.ok(hdr[0].endsWith(`/room/${id}`));

      const chat = await fetch(`${base}/r/${id}`);
      assert.equal(chat.status, 200, `/r/${id} opens`);
      const ctags = htmlCanon(await chat.text());
      const chdr = headerCanon(chat.headers.get('link'));
      console.log(`/r/${id} html=${JSON.stringify(ctags)} header=${JSON.stringify(chdr)}`);
      assert.equal(chdr.length, 1, `/r/${id} has exactly one canonical in its Link header (not a second one)`);
      assert.ok(chdr[0].endsWith(`/room/${id}`), `/r/${id} header canonical ends in /room/${id}: ${chdr[0]}`);
      assert.equal(ctags.length, 1, `/r/${id} has exactly one canonical in its HTML`);
      assert.ok(ctags[0].endsWith(`/room/${id}`), `/r/${id} HTML canonical agrees with the header: ${ctags[0]}`);
    }
    // the second room does not point at general
    const o = htmlCanon(await (await fetch(`${base}/room/${other}`)).text())[0];
    if (other !== 'general') assert.ok(!/\/room\/general$/.test(o), `${other} does not point at general`);
    // a room that doesn't exist is still a 404 on both routes
    assert.equal((await fetch(`${base}/r/no-such-room-xyz`)).status, 404);
    assert.equal((await fetch(`${base}/room/no-such-room-xyz`)).status, 404);
    // other pages keep their own path as canonical
    const hq = await fetch(`${base}/headquarters`);
    assert.deepEqual(headerCanon(hq.headers.get('link')).map((u) => new URL(u).pathname), ['/headquarters']);
    await hq.body?.cancel();
  } finally {
    server.kill();
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});
