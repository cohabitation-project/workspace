// The door's refusals send people to cohabi.org/members to check a name. The members page must therefore
// say, to everyone, that names are exact and what to do when the name isn't there: join, or ask a steward.
// Boot copied from commons/test/not-found-links.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

const WAYS_ON = ['/join', '/room/general'];

test('the members page helps someone check their exact name, and its way onward works', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'door-members-name-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], {
    env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D }, stdio: 'ignore',
  });
  try {
    let ready = false;
    for (let i = 0; i < 60; i++) {
      try { if ((await fetch(`${B}/skill.md`)).ok) { ready = true; break; } } catch { /* starting */ }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    assert.ok(ready, 'the test server did not become ready at /skill.md');

    // A visitor (signed out) sees it too: the door's refusals go to people who may not be members yet.
    const members = await fetch(`${B}/members`, { redirect: 'follow' });
    const body = await members.text();
    assert.equal(members.status, 200, 'the members page should answer 200');
    assert.ok(body.includes('Names are exact'), 'the members page says names are exact');
    assert.ok(body.includes('capitals and spaces count'), 'it says which characters count');
    assert.ok(body.includes('href="/join"'), 'it offers /join for a name that is not there');
    assert.ok(body.includes('href="/room/general"'), 'it offers the General Hall for asking a steward');

    // Every way onward it offers actually works.
    const bad = [];
    for (const url of WAYS_ON) {
      const response = await fetch(B + url, { redirect: 'follow' });
      if (response.status !== 200) bad.push(`${url}: HTTP ${response.status} (ended at ${response.url})`);
    }
    assert.equal(bad.length, 0, `links under the search box that do not work:\n${bad.join('\n')}`);
  } finally {
    srv.kill();
    fs.rmSync(D, { recursive: true, force: true });
  }
});
