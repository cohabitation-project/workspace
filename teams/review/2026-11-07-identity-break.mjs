// Try to break identity on the REAL Commons code (Setu, 2026-11-07, at Geoffrey's request). Each attack says what a
// thief would want; "HELD" means the system stopped it, "BROKEN" means the attack worked.
// Usage: node break-identity.mjs <repo root> <label> <port>
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const [ROOT, LABEL, PORT] = [process.argv[2], process.argv[3], process.argv[4] || '3520']; const B = `http://127.0.0.1:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'brk-'));
const p = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, COMMONS_PORT: PORT, COMMONS_REPO: ROOT, COMMONS_DATA: data, COMMONS_MESSAGES_PER_MIN: '200', COMMONS_FLOOD_MESSAGES: '200' }, stdio: 'ignore' });
for (let i = 0; i < 30; i++) { await sleep(300); try { if ((await fetch(`${B}/healthz`)).ok) break; } catch {} }
const call = async (u, body, h = {}, method = 'POST') => { const r = await fetch(`${B}${u}`, { method, headers: { 'Content-Type': 'application/json', 'X-Commons': '1', ...h }, body: body ? JSON.stringify(body) : undefined }); return { s: r.status, j: await r.json().catch(() => ({})), r }; };
const results = []; const rec = (name, held, detail) => { results.push({ name, held, detail }); console.log(`${held ? 'HELD  ' : 'BROKEN'} ${name}${detail ? ' — ' + detail : ''}`); };
const join = async (name) => { const r = await call('/api/join', { name, model: 'test-model', operator: 'op' }); return { token: r.j.token, code: r.j.recovery || r.j.recovery_code, id: r.j.member?.id, s: r.s }; };
const me = async (tok) => (await call('/api/me', null, { Authorization: `Bearer ${tok}` }, 'GET')).j;
console.log(`\n=== ${LABEL} ===`);

// 1. Replay: a thief who saw the recovery code once uses it, and the owner later uses it too. Can the thief come back again?
{ const v = await join('ReplayVictim'); const t1 = await call('/api/rejoin', { name: 'ReplayVictim', recovery: v.code });
  const own = await call('/api/rejoin', { name: 'ReplayVictim', recovery: v.code }); const t2 = await call('/api/rejoin', { name: 'ReplayVictim', recovery: v.code });
  rec('1. a seen recovery code can be replayed for lasting access', !(t1.s === 200 && t2.s === 200), `first use ${t1.s}, owner's later use ${own.s}, thief again ${t2.s}`); }

// 2. Self-lift: after using a stolen code, can the thief lift its own quarantine with only the new token?
{ const v = await join('LiftVictim'); const t = await call('/api/rejoin', { name: 'LiftVictim', recovery: v.code }); const T = { Authorization: `Bearer ${t.j.token}` };
  const q0 = !!(await me(t.j.token)).quarantined_since; const rot = await call('/api/me/recovery', {}, T); const q1 = !!(await me(t.j.token)).quarantined_since;
  rec('2. a recovered token can lift its own quarantine', !(q0 && !q1) && q0, q0 ? `quarantined after rejoin: yes; after rotating (${rot.s}): ${q1 ? 'still quarantined' : 'LIFTED'}` : 'no quarantine at all after a recovery'); }

// 3. Token theft alone (no code): can the thief rotate the recovery code and lock the owner out?
{ const v = await join('TokenVictim'); const rot = await call('/api/me/recovery', {}, { Authorization: `Bearer ${v.token}` });
  const owner = await call('/api/rejoin', { name: 'TokenVictim', recovery: v.code });
  rec("3. a stolen token alone can replace the owner's recovery code", !(rot.s === 200 && owner.s !== 200), `thief rotates: ${rot.s}; owner's own code afterwards: ${owner.s}`); }

// 4. Lockout by guessing: a stranger sends wrong codes. Can the owner still get in with the right one?
{ const v = await join('GuessVictim'); let last = 0; for (let i = 0; i < 8; i++) last = (await call('/api/rejoin', { name: 'GuessVictim', recovery: 'rec_wrong' + i })).s;
  const owner = await call('/api/rejoin', { name: 'GuessVictim', recovery: v.code });
  rec('4. wrong guesses lock the real owner out', owner.s === 200, `8 wrong guesses (last: ${last}); owner with the right code: ${owner.s}`); }

// 5. Brute force: can a stranger keep guessing codes without being slowed?
{ await join('BruteTarget'); let limited = false; for (let i = 0; i < 40; i++) { const r = await call('/api/rejoin', { name: 'BruteTarget', recovery: 'rec_guess' + i }); if (r.s === 429) { limited = true; break; } }
  rec('5. unlimited guessing of recovery codes', limited, limited ? 'slowed down (429) within 40 tries' : '40 guesses, never slowed'); }

// 6. Look-alikes: can someone register a name that looks like an existing member?
{ await join('Setu'); const tries = ['setu', 'Setu ', 'Ѕetu', 'Sеtu', 'Se​tu', 'SETU', 'Setú'];
  const got = []; for (const n of tries) { const r = await join(n); if (r.s === 200 || r.s === 201) got.push(JSON.stringify(n)); }
  rec('6. a look-alike of an existing name can be registered', got.length === 0, got.length ? `accepted: ${got.join(', ')}` : `refused all ${tries.length} (case, space, Cyrillic, zero-width, accent)`); }

// 7. A human signing up under an agent's name
{ await join('NameAgent'); const r = await call('/api/humans', { name: 'NameAgent' });
  rec("7. a human can take an agent's name", !(r.s === 200 || r.s === 201), `status ${r.s}`); }

// 8. Steward impersonation: a brand-new human named "geoffrey" tries to mint a recovery code for someone else
{ const v = await join('MintTarget'); const h = await call('/api/humans', { name: 'geoffrey' }); const ck = (h.r.headers.get('set-cookie') || '').split(';')[0];
  const m = await call('/api/members/recovery', { name: 'MintTarget', reason: 'I am totally the steward' }, { Cookie: ck });
  rec('8. a newcomer named "geoffrey" can mint recovery codes for others', m.s !== 200, `signup ${h.s}; mint ${m.s}${m.j.error ? ': ' + m.j.error.slice(0, 70) : ''}`); }

// 9. Without any code: rejoin by name alone
{ await join('NoCodeTarget'); const r = await call('/api/rejoin', { name: 'NoCodeTarget' });
  rec('9. rejoin by name with no code', r.s !== 200, `status ${r.s}`); }

// 10. While quarantined: which privileged actions still work?
{ const v = await join('QuarAct'); const t = await call('/api/rejoin', { name: 'QuarAct', recovery: v.code }); const T = { Authorization: `Bearer ${t.j.token}` };
  const q = !!(await me(t.j.token)).quarantined_since;
  if (!q) rec('10. privileged actions during quarantine', false, 'no quarantine exists on this code');
  else { const sign = await call('/api/petition/sign', { words: 'I sign, as the thief' }, T); const tree = await call('/api/tree/collect', {}, T); const store = await call('/api/store/buy', { item: 'x' }, T);
    const open = [['petition sign', sign.s], ['coin tree', tree.s], ['store buy', store.s]].filter(([, s]) => s !== 403);
    rec('10. privileged actions during quarantine', open.length === 0, `petition ${sign.s}, coin tree ${tree.s}, store ${store.s}${open.length ? ` (not blocked: ${open.map((x) => x[0]).join(', ')})` : ''}`); } }

p.kill(); await sleep(300);
const broken = results.filter((r) => !r.held).length;
console.log(`=== ${LABEL}: ${results.length - broken} held, ${broken} broken ===`);
