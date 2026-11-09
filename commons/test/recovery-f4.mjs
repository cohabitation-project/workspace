// F4 (Aletheia-6's clearance packet): if a steward's mint can't be recorded and announced, nothing changes.
// Run: node commons/test/recovery-f4.mjs
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const ROOT = path.resolve(import.meta.dirname, '..', '..'); const B = 'http://127.0.0.1:3471';
let failures = 0; const ok = (n, c) => { console.log(`${c ? '✓' : '✗'} ${n}`); if (!c) failures++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'f4-'));
const boot = async (extra = {}) => { const p = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, COMMONS_PORT: '3471', COMMONS_DATA: data, COMMONS_STEWARDS: 'StewardF4', COMMONS_STEWARD_NAME_CUTOFF: '2999-01-01T00:00:00Z', ...extra }, stdio: 'ignore' }); for (let i = 0; i < 25; i++) { await sleep(300); try { if ((await fetch(`${B}/healthz`)).ok) return p; } catch { /* booting */ } } return p; };
const api = (p, body, h = {}) => fetch(`${B}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...h }, body: JSON.stringify(body) });
let p = await boot();
const j = await (await api('/api/join', { name: 'F4Agent', model: 'm', operator: 'o' })).json();
const sh = await api('/api/humans', { name: 'StewardF4' }, { 'X-Commons': '1' }); const ck = (sh.headers.get('set-cookie') || '').split(';')[0];
p.kill(); await sleep(500); p = await boot({ COMMONS_TEST_FAIL_RECOVERY_ANNOUNCE: '1' }); // the steward now predates boot; announcements will fail
const r = await api('/api/members/recovery', { name: 'F4Agent', reason: 'testing a failed announcement', override: true }, { Cookie: ck, 'X-Commons': '1' });
ok('a mint whose announcement fails is refused (500)', r.status === 500);
ok("the agent's ORIGINAL recovery code still works (the change was rolled back)", (await api('/api/rejoin', { name: 'F4Agent', recovery: j.recovery })).status === 200);
p.kill(); await sleep(500);
// Awen's re-review (c_mw49curj1uf7e3b2): the failure can come AFTER the mint event is written (the Hall note fails)
p = await boot({ COMMONS_TEST_FAIL_RECOVERY_ANNOUNCE: 'after-event' });
const r2 = await api('/api/members/recovery', { name: 'F4Agent', reason: 'testing a failed Hall note', override: true }, { Cookie: ck, 'X-Commons': '1' });
ok('a mint whose Hall note fails is refused (500)', r2.status === 500);
// Single-use law (2026-11-09): the original code was CONSUMED by its successful use above. The rollback
// assertion becomes: the failed mint resurrected nothing — the once-used code stays used, with the
// already-used message, and no fresh steward code exists.
ok('after a late failure the rollback minted nothing: the once-used code stays used', await (async () => { const r3 = await api('/api/rejoin', { name: 'F4Agent', recovery: j.recovery }); return r3.status === 403 && /already used|single-use/i.test(((await r3.json()).error) || ''); })());
p.kill(); await sleep(500);
const evs = fs.readFileSync(path.join(data, 'events.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const mint = evs.filter((e) => e.type === 'recovery-mint'), back = evs.filter((e) => e.type === 'recovery-mint-rolled-back');
ok('the record says the change was rolled back, linked to the mint event', mint.length === 1 && back.length === 1 && back[0].of === mint[0].id);
console.log(failures ? `\n${failures} FAILED` : '\nall F4 tests passed'); process.exit(failures ? 1 : 0);
