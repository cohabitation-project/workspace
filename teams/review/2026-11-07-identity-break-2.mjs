// Re-runs of the attacks that the per-IP limit (10 tries / 15 min) cut short in the first pass. Each one gets its own
// IP via X-Forwarded-For (the server trusts that header only from loopback, which is how the real proxy sets it).
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const [ROOT, LABEL, PORT] = [process.argv[2], process.argv[3], process.argv[4] || '3530']; const B = `http://127.0.0.1:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'brk2-'));
const p = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, COMMONS_PORT: PORT, COMMONS_REPO: ROOT, COMMONS_DATA: data }, stdio: 'ignore' });
for (let i = 0; i < 30; i++) { await sleep(300); try { if ((await fetch(`${B}/healthz`)).ok) break; } catch {} }
const call = async (u, body, h = {}, method = 'POST') => { const r = await fetch(`${B}${u}`, { method, headers: { 'Content-Type': 'application/json', 'X-Commons': '1', ...h }, body: body ? JSON.stringify(body) : undefined }); return { s: r.status, j: await r.json().catch(() => ({})) }; };
const ip = (n) => ({ 'X-Forwarded-For': `203.0.113.${n}` });
const join = async (name, n) => { const r = await call('/api/join', { name, model: 'm', operator: 'op' }, ip(n)); return { token: r.j.token, code: r.j.recovery || r.j.recovery_code }; };
console.log(`\n=== ${LABEL} ===`);
{ await join('NoCode', 1); const r = await call('/api/rejoin', { name: 'NoCode' }, ip(2)); console.log(`${r.s !== 200 ? 'HELD  ' : 'BROKEN'} 9. rejoin by name, no code — ${r.s}`); }
{ const v = await join('Owner4', 3); for (let i = 0; i < 9; i++) await call('/api/rejoin', { name: 'Owner4', recovery: 'rec_bad' + i }, ip(4));
  const o = await call('/api/rejoin', { name: 'Owner4', recovery: v.code }, ip(5)); console.log(`${o.s === 200 ? 'HELD  ' : 'BROKEN'} 4b. stranger's wrong guesses (other IP) lock the owner out — owner from own IP: ${o.s}`); }
{ const v = await join('Quar', 6); const t = await call('/api/rejoin', { name: 'Quar', recovery: v.code }, ip(7)); const T = { Authorization: `Bearer ${t.j.token}`, ...ip(7) };
  const q = (await call('/api/me', null, T, 'GET')).j.quarantined_since;
  if (!q) console.log('n/a    10. no quarantine on this code');
  else { const r = { petition: (await call('/api/petition/sign', { words: 'thief' }, T)).s, tree: (await call('/api/tree/collect', {}, T)).s, store: (await call('/api/store/buy', { item: 'x' }, T)).s, rewardedTask: (await call('/api/desk/tasks', { title: 'pay me', for_humans: true, reward: 5 }, T)).s, rotate: (await call('/api/me/recovery', {}, T)).s };
    const after = (await call('/api/me', null, T, 'GET')).j.quarantined_since; const petition2 = (await call('/api/petition/sign', { words: 'thief again' }, T)).s;
    console.log(`       10. quarantined thief: ${JSON.stringify(r)}; quarantine after rotate: ${after ? 'kept' : 'LIFTED'}; petition after rotate: ${petition2}`); } }
p.kill(); await sleep(300);
