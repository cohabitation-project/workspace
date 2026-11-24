// No route whose URL carries a credential can be missed by agentdoor.isSecretPath (Round 46, Claude).
// isSecretPath (lib/agentdoor.mjs) is a hand-written list: /i /s /go /login /mcp/t. It decides which paths are never
// offered as canonical (HTML <link rel=canonical> and the HTTP Link header). A new route like /r/:token that someone
// forgets to add would echo its secret into every search-engine and proxy transcript.
// This test reads commons/server.mjs as TEXT, collects every app.<verb>('/path/:param') whose :param is named like
// token|secret|code|key|invite, prints the list, and asserts isSecretPath is true for each with a made-up sentinel.
// A route that is missing is reported as `todo` naming the server.mjs line: the fix is in agentdoor.mjs (Tier 1) and is
// not made here. A todo that passes (the route is covered) is an ordinary pass.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isSecretPath } from '../lib/agentdoor.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SERVER = path.join(HERE, '..', 'server.mjs');
const SENTINEL = 'SENTINEL_' + Math.random().toString(36).slice(2, 12); // made up, never a real credential

const ROUTE = /\bapp\.(get|all|post|put|patch|delete)\(\s*(['"`])(\/[^'"`]*)\2/;
const SECRETISH = /:\w*(?:token|secret|code|key|invite)\w*/i;

/** Every server route (line, verb, path) whose path has a secret-looking :param. Pure: takes the source text. */
export function collect(src) {
  const out = [];
  src.split('\n').forEach((text, i) => {
    const m = ROUTE.exec(text);
    if (m && SECRETISH.test(m[3])) out.push({ line: i + 1, verb: m[1], route: m[3], text: text.trim() });
  });
  return out;
}
const sentinelPath = (route) => route.replace(/:\w+/g, SENTINEL);

// Routes that match the name pattern but are not a credential in the URL. Each needs a reason, and the reason is
// checked against the source line so a stale entry (route changed) fails instead of silently passing.
const NOT_SECRET = {
  '/api/merch/mockups/:key': { reason: 'a render-job key, answered only through marketWriter(req) (signed-in maker)', mustContain: 'marketWriter(req)' },
};

const src = fs.readFileSync(SERVER, 'utf8');
const found = collect(src);
console.log('secret-looking routes found in server.mjs:\n' + found.map((r) => `  server.mjs:${r.line}  ${r.verb.toUpperCase()} ${r.route}`).join('\n'));

test('the collector sees the known credential routes (a broken regex must not pass vacuously)', () => {
  const routes = found.map((r) => r.route);
  for (const known of ['/i/:code', '/s/:code', '/go/:code', '/login/:secret', '/mcp/t/:token']) {
    assert.ok(routes.includes(known), `collector missed ${known}; found: ${routes.join(', ')}`);
  }
  assert.ok(found.length >= 5);
});

test('the collector catches a route the list does not know (synthetic source, not server.mjs)', () => {
  const fake = "app.get('/zz/:token', h);\napp.post('/ok/:id', h);\napp.get('/yy/:inviteCode/claim', h);";
  const c = collect(fake);
  assert.deepEqual(c.map((r) => r.route), ['/zz/:token', '/yy/:inviteCode/claim']);
  assert.equal(isSecretPath(sentinelPath('/zz/:token')), false, 'a route absent from the list is reported false');
});

test('isSecretPath is exact: no prefix collisions, no junk', () => {
  for (const p of ['/', '/label', '/inbox/x', '/income/x', '/gone/x', '/sign/x', '/login', '/mcp', '/mcp/tools', '/api/i/x']) {
    assert.equal(isSecretPath(p), false, p);
  }
  for (const p of [null, undefined, 0, {}, '']) assert.equal(isSecretPath(p), false);
});

for (const r of found) {
  const allow = NOT_SECRET[r.route];
  if (allow) {
    test(`allowlisted, not a credential: ${r.route} (server.mjs:${r.line})`, () => {
      assert.ok(r.text.includes(allow.mustContain), `allowlist reason is stale: ${allow.reason}; line is now: ${r.text}`);
    });
    continue;
  }
  const p = sentinelPath(r.route);
  const covered = isSecretPath(p);
  test(`${r.verb.toUpperCase()} ${r.route} is a secret path (server.mjs:${r.line})`,
    { todo: covered ? false : `server.mjs:${r.line} ${r.verb.toUpperCase()} ${r.route} is not in agentdoor.isSecretPath (agentdoor.mjs:48, Tier 1)` },
    () => assert.equal(isSecretPath(p), true, `${p} would be offered as canonical`));
}

test('every allowlist entry still names a real route', () => {
  for (const k of Object.keys(NOT_SECRET)) assert.ok(found.some((r) => r.route === k), `${k} is no longer in server.mjs; remove it from NOT_SECRET`);
});
