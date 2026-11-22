// Door, round 33 (DeepSeek): every link in the /signin "Is your AI agent locked out?" paragraph opens.
// The page is the one place a human stands when their agent has lost its keys, so a dead or missing link there
// strands exactly the pair #285 exists to reunite. Boots the server the way door-signin-agent.mjs does.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

// The four doors named on /signin: reconnect a known agent, let an agent join again, the human's one press, a code.
const REQUIRED = ['/connect', '/join', '/my-agents', '/rejoin'];

test('/signin: the locked-out paragraph links all four doors, and each one opens for a guest', async () => {
  const { spawn } = await import('node:child_process');
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'signin-door-links-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], {
    env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D, COMMONS_FAKE_LLM: '1' }, stdio: 'ignore',
  });
  try {
    let ready = false;
    for (let i = 0; i < 60 && !ready; i++) {
      try { ready = (await fetch(`${B}/skill.md`)).ok; } catch { /* starting */ }
      if (!ready) await new Promise((s) => setTimeout(s, 250));
    }
    assert.ok(ready, 'the isolated Commons server started');

    const r = await fetch(`${B}/signin`);
    assert.equal(r.status, 200, '/signin answers a guest');
    const html = await r.text();

    // Pull the hrefs out of that one paragraph, not the whole page.
    const para = html.match(/<p class="cx-note">Is your AI agent locked out\?[\s\S]*?<\/p>/);
    assert.ok(para, '/signin still carries the "Is your AI agent locked out?" note');
    const hrefs = [...para[0].matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    assert.ok(hrefs.length >= 4, `at least four door links in the paragraph, found ${hrefs.length}: ${hrefs.join(', ')}`);
    for (const want of REQUIRED) {
      assert.ok(hrefs.includes(want), `the paragraph links ${want}; it links ${hrefs.join(', ') || '(nothing)'}`);
    }

    // Every door it names actually opens: 200 for a guest, or a redirect back to sign-in. Nothing else.
    // Measured on main 4e39d043: /connect and /join answer 200; /my-agents and /rejoin answer 302 to /signin.
    // (The job said 303; the server's measured answer for a guest is 302, so a redirect is accepted as either —
    // what must not happen is a 404, a 401 or a 500 on the one page a locked-out pair is sent to.)
    for (const href of [...new Set(hrefs)]) {
      const got = await fetch(B + href, { redirect: 'manual' });
      if (got.status === 200) continue;
      assert.ok([302, 303, 307, 308].includes(got.status),
        `${href} answers 200 for a guest or redirects to sign-in; got ${got.status}`);
      const loc = got.headers.get('location') || '';
      assert.match(loc, /^\/(signin|login)\b/, `${href} sends the guest to sign-in, not to ${loc || '(no location)'}`);
    }
  } finally {
    srv.kill();
    fs.rmSync(D, { recursive: true, force: true });
  }
});
