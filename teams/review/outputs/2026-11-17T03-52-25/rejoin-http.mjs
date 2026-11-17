
// rejoin-http.mjs — HTTP-level test of GET /rejoin, /rejoin/confirm and POST /api/rejoin. Synthetic data only.
// Run: SERVER=commons/server.mjs PORT=3490 node rejoin-http.mjs   (from the repo root; assigns a throwaway data dir)
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const ROOT = process.cwd(); const PORT = process.env.PORT || '3490'; const B = `http://127.0.0.1:${PORT}`;
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'rj-')); const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0; const res = [];
const ok = (n, c, d = '') => { (c ? pass++ : fail++); res.push({ n, ok: !!c, d }); console.log(`${c ? '  ✓' : '  ✗'} ${n}${c ? '' : ' — ' + d}`); };
const child = spawn(process.execPath, [process.env.SERVER || 'commons/server.mjs'], { cwd: ROOT, stdio: 'ignore',
  env: { ...process.env, COMMONS_PORT: PORT, COMMONS_REPO: ROOT, COMMONS_DATA: data, COMMONS_FAKE_LLM: '1', COMMONS_NO_SPEND_POLL: '1', OPENROUTER_API_KEY: '', LLM_API_KEY: '', COMMONS_DISCORD_MIRROR: '0' } });
const J = { 'content-type': 'application/json', accept: 'application/json' };
const post = async (p, b) => { const r = await fetch(B + p, { method: 'POST', headers: J, body: JSON.stringify(b) }); let j = null; try { j = await r.json(); } catch {} return { s: r.status, j }; };
const get = async (p) => { const r = await fetch(B + p, { headers: { accept: 'application/json' } }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {} return { s: r.status, j, t }; };
const nonce = (g) => { const m = ((g.j && g.j.next) || g.t || '').match(/confirm\?n=([\w-]+)/); return m && m[1]; };
let n = 0; const mk = async (name) => { const r = await post('/api/join', { name, model: 'test-model-' + (n++), operator: 'op-' + name + '-' + n }); return r; };
try {
  for (let i = 0; i < 30; i++) { await sleep(300); try { if ((await fetch(B + '/healthz')).ok) break; } catch {} }
  const hz = await (await fetch(B + '/healthz')).text(); console.log('healthz', hz.slice(0, 200));
  const A = await mk('RjAlpha'); ok('join A 2xx with recovery code', A.s < 300 && A.j && A.j.recovery, JSON.stringify(A.s));
  const rec = A.j.recovery, name = 'RjAlpha';
  // preview does not spend the code
  const p1 = await get(`/rejoin?name=${name}&recovery=${rec}`); ok('H1 preview with right code = 200 + confirm link', p1.s === 200 && nonce(p1), p1.s + ' ' + p1.t.slice(0, 120));
  const p2 = await get(`/rejoin?name=${name}&recovery=${rec}`); ok('H2 second preview still works (code not spent)', p2.s === 200 && nonce(p2));
  // confirm is single-use, exactly 410 on replay
  const n1 = nonce(p1); const c1 = await get(`/rejoin/confirm?n=${n1}`); ok('H3a confirm = 201 with new token', c1.s === 201 && c1.j && c1.j.token, c1.s + '');
  const c1b = await get(`/rejoin/confirm?n=${n1}`); ok('H3b replay of the same confirm == 410', c1b.s === 410, 'got ' + c1b.s);
  // the old token should be dead after a rejoin
  if (c1.j && c1.j.token) { const me = await fetch(B + '/api/roster', { headers: { authorization: 'Bearer ' + c1.j.token } }); ok('H4 new token accepted on a read route', me.status === 200, me.status + ''); }
  // after confirm, does the recovery code still preview? (design says rotated/retired -> report)
  const p3 = await get(`/rejoin?name=${name}&recovery=${rec}`); console.log('INFO old code preview after confirm ->', p3.s); res.push({ n: 'INFO old-code preview after confirm', d: p3.s });
  // parallel confirms: exactly one 201
  const fresh = await mk('RjBeta'); const pr = await get(`/rejoin?name=RjBeta&recovery=${fresh.j.recovery}`); const nb = nonce(pr);
  const par = await Promise.all(Array.from({ length: 8 }, () => get(`/rejoin/confirm?n=${nb}`)));
  const codes = par.map(x => x.s).sort(); ok('P1 8 parallel confirms: exactly one 201, rest 410', codes.filter(c => c === 201).length === 1 && codes.filter(c => c === 410).length === 7, JSON.stringify(codes));
  // per-name hold cap = 3: 5 previews, then confirm all; only newest 3 land
  const g = await mk('RjGamma'); const ns = []; for (let i = 0; i < 5; i++) ns.push(nonce(await get(`/rejoin?name=RjGamma&recovery=${g.j.recovery}`)));
  const first = await get(`/rejoin/confirm?n=${ns[0]}`); const second = await get(`/rejoin/confirm?n=${ns[1]}`);
  ok('C1 oldest two holds were evicted (410 each)', first.s === 410 && second.s === 410, first.s + ',' + second.s);
  const last = await get(`/rejoin/confirm?n=${ns[4]}`); ok('C2 newest hold still lands (201)', last.s === 201, last.s + '');
  // wrong code: 403 / limit, then right code still works
  const d = await mk('RjDelta'); const sts = []; for (let i = 0; i < 12; i++) sts.push((await get(`/rejoin?name=RjDelta&recovery=rec_wrong${i}`)).s);
  console.log('wrong-code statuses', sts.join(','));
  ok('W1 wrong codes are refused (all non-200)', sts.every(s => s !== 200), sts.join(','));
  const dr = await get(`/rejoin?name=RjDelta&recovery=${d.j.recovery}`); ok('W2 right code after wrong-code budget is still accepted (200)', dr.s === 200, dr.s + '');
  // unknown name / look-alike join
  ok('U1 unknown name preview is not 200', (await get('/rejoin?name=NoSuchAgentX&recovery=rec_x')).s !== 200);
  ok('U2 exact-name rejoin join refused 409', (await mk('RjAlpha')).s === 409);
  ok('U3 look-alike join refused 409', (await mk('RjA1pha')).s === 409 || (await mk('rjalpha')).s === 409);
  // wrong name case: code for A used with B's name
  const x = await get(`/rejoin?name=RjBeta&recovery=${rec}`); ok('X1 code for A used on B is refused', x.s !== 200, x.s + '');
  // expiry (only meaningful if server built with a short window)
  if (process.env.EXPIRY_MS) { const e = await mk('RjEps'); const ne = nonce(await get(`/rejoin?name=RjEps&recovery=${e.j.recovery}`)); await sleep(+process.env.EXPIRY_MS + 500); const ce = await get(`/rejoin/confirm?n=${ne}`); ok('E1 expired hold confirm == 410', ce.s === 410, ce.s + ''); }
} catch (e) { fail++; console.log('HARNESS ERROR', e); } finally { child.kill(); console.log(`RESULT pass=${pass} fail=${fail}`); fs.writeFileSync(process.env.RESFILE || '/tmp/rj-result.json', JSON.stringify({ pass, fail, res }, null, 1)); process.exit(0); }
