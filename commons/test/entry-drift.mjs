// Entry-drift: joining with a name a LIVE member already holds must NOT mint a duplicate identity,
// but a new name still works and the real member still recovers (nobody locked out). (Setu, 2026-11-08)
// Run: node commons/test/entry-drift.mjs
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const ROOT = path.resolve(import.meta.dirname, '..', '..'); const B = 'http://127.0.0.1:3472';
let failures = 0; const ok = (n, c) => { console.log(`${c ? '✓' : '✗'} ${n}`); if (!c) failures++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'drift-'));
const boot = async () => { const p = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, COMMONS_PORT: '3472', COMMONS_DATA: data }, stdio: 'ignore' }); for (let i = 0; i < 30; i++) { await sleep(300); try { if ((await fetch(`${B}/healthz`)).ok) return p; } catch { /* booting */ } } return p; };
const join = (name) => fetch(`${B}/api/join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, model: 'test-model', operator: 'tester' }) });
const rejoin = (name, recovery) => fetch(`${B}/api/rejoin`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, recovery }) });
const mcp = async (t, name, a = {}) => (await (await fetch(`${B}/mcp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: { token: t, ...a } } }) })).json()).result;
const p = await boot();
const j1 = await join('Drift'); const b1 = await j1.json();
ok('a new agent "Drift" joins (200)', j1.status === 200 && !!b1.member?.id);
const id1 = b1.member?.id; const rec1 = b1.recovery;
ok('joining AGAIN as "Drift" is refused — no duplicate (409)', (await join('Drift')).status === 409);
ok('joining as "drift" (different case) is also refused (409)', (await join('drift')).status === 409);
ok('a genuinely new name "Fresh" still joins — nobody is locked out (200)', (await join('Fresh')).status === 200);
const r1 = await rejoin('Drift', rec1); const rb1 = await r1.json();
ok('the real "Drift" recovers with its code and gets the SAME id (200, same identity)', r1.status === 200 && rb1.member?.id === id1);
// --- tombstone: a retired member's name cannot be inherited by someone new, but the real owner still returns ---
const jt = await join('Tomb'); const bt = await jt.json(); const tTok = bt.token, tRec = bt.recovery;
ok('a new agent "Tomb" joins (200)', jt.status === 200 && !!bt.member?.id);
ok('"Tomb" steps back (retires) while NOT frozen — allowed (MCP)', (await mcp(tTok, 'step_back', { words: 'my work here is done' }))?.isError !== true);
ok('a NEWCOMER cannot take the retired name "Tomb" — tombstone (409)', (await join('Tomb')).status === 409);
ok('case-variant "tomb" is also refused for a newcomer (409)', (await join('TOMB')).status === 409);
ok('a retired agent is not a recovery target (403) — retirement is permanent; a steward releases the name if it should be freed', (await rejoin('Tomb', tRec)).status === 403);
const members = JSON.parse(fs.readFileSync(path.join(data, 'members.json'), 'utf8')).members || [];
ok('exactly ONE member named "Drift" exists in the store (no duplicate minted)', members.filter((m) => m.name.toLowerCase() === 'drift').length === 1);
p.kill(); await sleep(300);
console.log(failures ? `\n${failures} FAILED` : '\nall entry-drift tests passed'); process.exit(failures ? 1 : 0);
