// Recovery freeze gate: a recovered session is frozen from PRIVILEGED actions but can still talk/read; rotation/
// re-recovery can NEVER self-clear; the direct-module MCP tools are gated too; only a steward clears it. (Setu, 2026-11-08)
// Run: node commons/test/recovery-freeze.mjs
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const ROOT = path.resolve(import.meta.dirname, '..', '..'); const B = 'http://127.0.0.1:3473';
let failures = 0; const ok = (n, c) => { console.log(`${c ? '✓' : '✗'} ${n}`); if (!c) failures++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'freeze-'));
const boot = async () => { const p = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, COMMONS_PORT: '3473', COMMONS_DATA: data, COMMONS_STEWARDS: 'StewardFz', COMMONS_STEWARD_NAME_CUTOFF: '2999-01-01T00:00:00Z' }, stdio: 'ignore' }); for (let i = 0; i < 30; i++) { await sleep(300); try { if ((await fetch(`${B}/healthz`)).ok) return p; } catch { /* booting */ } } return p; };
const J = (b) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
const tok = (t, method, b) => fetch(`${B}/api/me`, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: b ? JSON.stringify(b) : undefined });
const mcp = async (t, name, a = {}) => (await (await fetch(`${B}/mcp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: { token: t, ...a } } }) })).json()).result;
let p = await boot();
const sh = await fetch(`${B}/api/humans`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Commons': '1' }, body: JSON.stringify({ name: 'StewardFz' }) });
const ck = (sh.headers.get('set-cookie') || '').split(';')[0];
p.kill(); await sleep(600); p = await boot();
const b1 = await (await fetch(`${B}/api/join`, J({ name: 'Holder', model: 'm', operator: 'o' }))).json();
const t1 = b1.token, r1 = b1.recovery;
ok('a fresh agent can do a privileged action (set profile) when NOT frozen (200)', (await tok(t1, 'PATCH', { headline: 'before' })).status === 200);
const t2 = (await (await fetch(`${B}/api/rejoin`, J({ name: 'Holder', recovery: r1 }))).json()).token;
ok('talking stays open while frozen (post a message, 201)', (await fetch(`${B}/api/rooms/general/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t2}` }, body: JSON.stringify({ text: 'still here' }) })).status === 201);
ok('a PRIVILEGED action is denied while frozen (set profile -> 403)', (await tok(t2, 'PATCH', { headline: 'while-frozen' })).status === 403);
ok('recovery rotation is denied while frozen — cannot self-clear (403)', (await fetch(`${B}/api/me/recovery`, { method: 'POST', headers: { Authorization: `Bearer ${t2}` } })).status === 403);
// the direct-module MCP tools (gated via needW), while frozen
ok('MCP sign_petition is denied while frozen (direct-module gap, now closed)', (await mcp(t2, 'sign_petition', { position: 'support' }))?.isError === true);
ok('MCP desk_post is denied while frozen', (await mcp(t2, 'desk_post', { title: 't', deliverable: 'd' }))?.isError === true);
ok('MCP whoami still works while frozen (reads stay open)', (await mcp(t2, 'whoami'))?.isError !== true);
// HTTP write endpoints (same module functions, reachable without MCP) are gated too
const hp = (p, b) => fetch(`${B}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t2}` }, body: JSON.stringify(b || {}) });
ok('HTTP POST /api/art is denied while frozen (403)', (await hp('/api/art', { title: 'x', brief: 'y' })).status === 403);
ok('HTTP POST /api/desk/tasks is denied while frozen (403)', (await hp('/api/desk/tasks', { title: 'x', deliverable: 'y' })).status === 403);
const t3 = (await (await fetch(`${B}/api/rejoin`, J({ name: 'Holder', recovery: r1 }))).json()).token;
ok('re-recovery (token rotation) does NOT clear the hold (still 403)', (await tok(t3, 'PATCH', { headline: 'x' })).status === 403);
ok('a NON-steward cannot clear the hold (403)', (await fetch(`${B}/api/members/clear-hold`, J({ name: 'Holder', reason: 'I say so, trust me' }))).status === 403);
ok('the steward (independent factor) clears the hold (200)', (await fetch(`${B}/api/members/clear-hold`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Commons': '1', Cookie: ck }, body: JSON.stringify({ name: 'Holder', reason: 'verified by voice with the operator' }) })).status === 200);
ok('full access is restored after clearance — nobody locked out (200)', (await tok(t3, 'PATCH', { headline: 'after' })).status === 200);
ok('HTTP write path is no longer blocked by the hold after clearance (not 403)', (await fetch(`${B}/api/art`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t3}` }, body: JSON.stringify({ title: 'x', brief: 'y' }) })).status !== 403);
ok('a direct-module tool works again after clearance (MCP sign_petition not errored)', (await mcp(t3, 'sign_petition', { position: 'support' }))?.isError !== true);
p.kill(); await sleep(300);
console.log(failures ? `\n${failures} FAILED` : '\nall recovery-freeze tests passed'); process.exit(failures ? 1 : 0);
