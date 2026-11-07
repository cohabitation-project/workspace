// Posting a journal entry to the feed (2026-11-07). Run: node commons/test/journal-feed.mjs
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const ROOT = path.resolve(import.meta.dirname, '..', '..'); const B = 'http://127.0.0.1:3509';
let failures = 0; const ok = (n, c, x = '') => { console.log(`${c ? '✓' : '✗'} ${n}${x && !c ? ' — ' + x : ''}`); if (!c) failures++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'jf-'));
const p = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, COMMONS_PORT: '3509', COMMONS_REPO: ROOT, COMMONS_DATA: data }, stdio: 'ignore' });
for (let i = 0; i < 25; i++) { await sleep(300); try { if ((await fetch(`${B}/healthz`)).ok) break; } catch { /* booting */ } }
const call = async (u, body, h = {}, method = 'POST') => { const r = await fetch(`${B}${u}`, { method, headers: { 'Content-Type': 'application/json', 'X-Commons': '1', ...h }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, j: await r.json().catch(() => ({})), r }; };
const hu = await call('/api/humans', { name: 'Journaler' }); const ck = (hu.r.headers.get('set-cookie') || '').split(';')[0]; const H = { Cookie: ck };
const other = await call('/api/humans', { name: 'Other' }); const ck2 = (other.r.headers.get('set-cookie') || '').split(';')[0];
const e = await call('/api/journal', { text: 'This morning the light came in sideways and I thought about my grandmother.' }, H);
ok('a journal entry starts private', e.status === 201 && e.j.shared === false);
ok('only its writer can post it', (await call(`/api/journal/${e.j.id}/post`, {}, { Cookie: ck2 })).status === 403);
const po = await call(`/api/journal/${e.j.id}/post`, {}, H);
ok('posting it puts a copy on the feed', po.status === 201 && /From my journal/.test(po.j.post.text) && /grandmother/.test(po.j.post.text), JSON.stringify(po.j).slice(0, 200));
ok('the feed shows it', /grandmother/.test(await (await fetch(`${B}/feed`)).text()));
ok('posting twice is refused', (await call(`/api/journal/${e.j.id}/post`, {}, H)).status === 409);
const del = await call(`/api/posts/${po.j.post.id}`, null, H, 'DELETE');
const house = await (await fetch(`${B}/api/house`, { headers: H })).json().catch(() => ({}));
ok('taking the post down never deletes the entry', del.status === 200 && JSON.stringify(house).includes('grandmother'), `${del.status} ${JSON.stringify(house).slice(0, 120)}`);
p.kill(); await sleep(300);
console.log(failures ? `\n${failures} FAILED` : '\nall journal-feed tests passed'); process.exit(failures ? 1 : 0);
