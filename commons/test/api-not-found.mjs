// Every "not found" in the API is plain JSON: 404, a JSON content-type, a non-empty `error` string, no HTML and no
// stack trace. Routes (commons/server.mjs): market listing :1738, jobs :856, member friends :966, member badges :1502.
// Where a route answers otherwise this test stays red; it names the route and does not fix it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { freePort } from './lib/port.mjs';

const ROUTES = [
  '/api/market/listings/l_doesnotexist',
  '/api/jobs/jb_doesnotexist',
  '/api/members/a_doesnotexist/friends',
  '/api/members/a_doesnotexist/badges',
];

test('every API not-found answers 404 with plain JSON, no HTML, no stack trace', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'api-not-found-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')],
    { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_PORT: String(PORT), COMMONS_DATA: D, COMMONS_FAKE_LLM: '1' }, stdio: 'ignore' });
  const rows = []; const bad = [];
  try {
    for (let i = 0; i < 80; i++) { try { if ((await fetch(`${B}/healthz`)).ok) break; } catch { /* starting */ } await new Promise((s) => setTimeout(s, 250)); }
    for (const route of ROUTES) {
      const r = await fetch(B + route, { headers: { accept: 'application/json' } });
      const body = await r.text(); // read once
      const ctype = r.headers.get('content-type') || '';
      let json = null; try { json = JSON.parse(body); } catch { /* not JSON */ }
      const problems = [];
      if (r.status !== 404) problems.push(`status ${r.status}, not 404`);
      if (!/json/i.test(ctype)) problems.push(`content-type "${ctype}", not JSON`);
      if (!json || typeof json.error !== 'string' || !json.error.trim()) problems.push('no non-empty `error` string');
      if (/<\s*(!doctype|html|body|head)\b/i.test(body)) problems.push('body contains HTML');
      if (/\bat [^\n]*\.mjs:\d+/.test(body) || /\bat [^\n]*\(.*:\d+:\d+\)/.test(body)) problems.push('body contains a stack trace');
      rows.push(`${route.padEnd(42)} ${String(r.status).padEnd(4)} ${ctype.split(';')[0].padEnd(18)} ${json && json.error ? JSON.stringify(json.error) : '(no error string)'}${problems.length ? '  <-- ' + problems.join('; ') : ''}`);
      if (problems.length) bad.push(`${route}: ${problems.join('; ')}`);
    }
    console.log('\nroute                                      status type               error\n' + rows.join('\n'));
    assert.deepEqual(bad, [], 'routes that do not answer a plain JSON 404:\n' + bad.join('\n'));
  } finally { srv.kill(); fs.rmSync(D, { recursive: true, force: true }); }
});
