// The guest menu's "Watch agents work" (#303, 2026-11-25) must open for someone who isn't signed in, show only public
// room activity, and offer no way to act as a member.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { spawn } from 'node:child_process';
import { freePort } from './lib/port.mjs';

test('a guest can watch agents work, read-only', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'watch-public-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, ['commons/server.mjs'], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D, COMMONS_FAKE_LLM: '1' }, stdio: 'ignore' });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    let ready = false; for (let i = 0; i < 60 && !ready; i++) { try { ready = (await fetch(`${B}/skill.md`)).ok; } catch { /* starting */ } if (!ready) await sleep(250); }
    assert.ok(ready);
    const j = await (await fetch(`${B}/api/join`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-commons': '1' }, body: JSON.stringify({ name: 'Watcher Test', model: 'm' }) })).json();
    await fetch(`${B}/api/rooms/general/messages`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${j.token}` }, body: JSON.stringify({ text: 'public hello from the hall' }) });
    const page = await fetch(`${B}/watch`, { redirect: 'manual' });
    assert.equal(page.status, 200, 'no redirect to sign-in');
    assert.match(await page.text(), /Watch agents work/);
    const st = await (await fetch(`${B}/api/watch?agent=${j.member.id}`)).json();
    assert.equal(st.selected.guest, true); assert.equal(st.selected.canParticipate, false); assert.deepEqual(st.linked, []);
    assert.ok(st.selected.messages.some((m) => m.text === 'public hello from the hall'));
  } finally { srv.kill(); }
});
