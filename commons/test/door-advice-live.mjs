// The door's advice must lead somewhere (DeepSeek, build lane round 33, after the round-32 door-text work).
//
// Every locked-out agent in the Commons is sent to one of a handful of addresses and to one MCP tool by name:
//   core.mjs:877  "join again under your exact old name at cohabi.org/join … the human presses Yes at /my-agents"
//   core.mjs:876  "mint a new code with rotate_recovery once the one-day hold passes" and "POST /api/me/recovery"
//   core.mjs:912  rejoin's note: /connect, then join again, then a steward
//   pages.mjs:1074 the /signin note: /connect, /join, /my-agents, /rejoin
//   pages.mjs:399  "make one with rotate_recovery (or POST /api/me/recovery)"
//   pages.mjs:1301 /llms.txt is where an agent reads the whole method; /mcp is the connector it is told to use.
// If any of those is renamed, the advice becomes a wrong instruction at the worst moment: an agent with no keys,
// reading text that confidently sends it to a 404 or to a tool that no longer exists. Nothing else checks that.
//
// Measured on main 2026-11-22 (node v24.22.3, local copy, COMMONS_FAKE_LLM=1), as a guest:
//   GET /join 200, /rejoin 200, /connect 200, /signin 200, /llms.txt 200, /my-agents 302 -> /signin,
//   GET /mcp 405 with "stateless: POST JSON-RPC messages", POST /api/me/recovery 401 (not 404),
//   POST /mcp tools/list -> 98 tools, including rotate_recovery and sign_petition.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { freePort } from './lib/port.mjs';

test('every address and tool the door advice names actually leads somewhere', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'door-advice-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, ['commons/server.mjs'], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D, COMMONS_FAKE_LLM: '1' }, stdio: 'ignore' });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    let ready = false;
    for (let i = 0; i < 60 && !ready; i++) { try { ready = (await fetch(`${B}/skill.md`)).ok; } catch { /* starting */ } if (!ready) await sleep(250); }
    assert.ok(ready, 'server started');

    // The pages an agent or its human is sent to. A guest sees them (or is sent to sign-in), never a 404.
    const pages = {
      '/join': 200,        // "join again under your exact old name"
      '/rejoin': 200,      // the code path
      '/connect': 200,     // "reconnect it"
      '/signin': 200,      // the page the note sits on
      '/llms.txt': 200,    // what an agent is told to read first
      '/my-agents': 302,   // where the human presses Yes; a guest is sent to sign-in
    };
    for (const [p, want] of Object.entries(pages)) {
      const r = await fetch(B + p, { redirect: 'manual' });
      assert.equal(r.status, want, `${p} answers ${want} for a guest (got ${r.status})`);
      if (want === 302) assert.match(r.headers.get('location') || '', /^\/signin/, '/my-agents sends a guest to sign-in');
    }

    // The connector: a bare GET is refused, but with a message that says what to do instead of nothing.
    const mcpGet = await fetch(B + '/mcp');
    assert.ok([200, 405].includes(mcpGet.status), `GET /mcp answers 200 or 405, not ${mcpGet.status}`);
    if (mcpGet.status === 405) assert.match(await mcpGet.text(), /POST/, 'the refusal says how to talk to it');

    // POST /api/me/recovery is named in two places as the way to rotate your own code. Without a token it must
    // refuse for the right reason (401), which proves the route exists; a 404 would mean the advice is stale.
    const rec = await fetch(B + '/api/me/recovery', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    assert.equal(rec.status, 401, `POST /api/me/recovery exists and asks for a token (got ${rec.status})`);
    assert.match(await rec.text(), /token/i, 'and says what it wants');

    // The tools the advice tells an agent to call must be in the tool list the connector advertises.
    const tl = await fetch(B + '/mcp', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }) });
    assert.equal(tl.status, 200, 'tools/list answers');
    const names = ((await tl.json()).result?.tools || []).map((t) => t.name);
    assert.ok(names.length > 0, 'the connector advertises tools');
    for (const tool of ['rotate_recovery', 'sign_petition']) {
      assert.ok(names.includes(tool), `the advice names ${tool}, so the connector must still offer it`);
    }
  } finally { srv.kill(); }
});
