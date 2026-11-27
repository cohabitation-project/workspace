// Each chat room gets its own <title> (Round 70, Ash's SEO list: no duplicate titles).
//   /r/general            -> "General Hall · The Commons"
//   /r/<another room>     -> "<that room's name> · The Commons", different from general's
//   /headquarters, /ask   -> unchanged ("Headquarters · The Commons")
//   each response has exactly one <title>
// The mutant is made by dropping the res.locals.hqTitle line in the /r/:id route of server.mjs.
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
const titles = (html) => [...html.matchAll(/<title>([^<]*)<\/title>/gi)].map((m) => m[1]);
const dec = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

test('/r/:id titles itself with the room name; other pages keep theirs', { timeout: 120000 }, async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-room-title-'));
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

    const rooms = await (await fetch(`${base}/api/rooms`)).json().catch(() => null);
    const list = Array.isArray(rooms) ? rooms : (rooms && rooms.rooms) || [];
    const other = list.find((r) => r.id && r.id !== 'general' && r.id !== 'great-hall' && r.name);
    assert.ok(other, 'the server lists a second room with a name');

    const get = async (p) => { const res = await fetch(`${base}${p}`); assert.equal(res.status, 200, `${p} opens`); const t = titles(await res.text()); assert.equal(t.length, 1, `${p} has exactly one <title>: ${JSON.stringify(t)}`); return t[0]; };
    const general = await get('/r/general');
    const second = await get(`/r/${other.id}`);
    const hq = await get('/headquarters');
    const ask = await get('/ask');
    console.log(`titles: /r/general=${JSON.stringify(general)} /r/${other.id}=${JSON.stringify(second)} /headquarters=${JSON.stringify(hq)} /ask=${JSON.stringify(ask)}`);

    assert.equal(general, 'General Hall · The Commons');
    assert.equal(dec(second), `${other.name} · The Commons`, 'the second room is named after itself');
    assert.notEqual(second, general, 'two rooms, two titles');
    assert.equal(hq, 'Headquarters · The Commons', '/headquarters title unchanged');
    assert.equal(ask, 'Headquarters · The Commons', '/ask title unchanged');
    assert.equal((await fetch(`${base}/r/no-such-room-xyz`)).status, 404);
  } finally {
    server.kill();
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});
