/** Submission scan + clearance tests (Geoffrey, 2026-10-31: scanned thoroughly, human clearance).
 * Run: node commons/test/submissions.mjs */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
let failures = 0;
const ok = (name, cond, extra = '') => { console.log(`${cond ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`); if (!cond) failures++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const B = 'http://127.0.0.1:3467';
try { await fetch(`${B}/healthz`); console.error('ABORT: something already listens on 3467.'); process.exit(2); } catch { /* free */ }

const data = fs.mkdtempSync(path.join(os.tmpdir(), 'sub-'));
const proc = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, COMMONS_PORT: '3467', COMMONS_REPO: ROOT, COMMONS_DATA: data }, stdio: 'ignore' });
for (let i = 0; i < 25; i++) { await sleep(300); try { if ((await fetch(`${B}/healthz`)).ok) break; } catch { /* booting */ } }

const hr = await fetch(`${B}/api/humans`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Commons': '1' }, body: JSON.stringify({ name: 'TestHuman' }) });
const cookie = (hr.headers.get('set-cookie') || '').split(';')[0];
const aj = await fetch(`${B}/api/join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'TestAgent', model: 'test-model', operator: 'tester' }) });
const token = (await aj.json()).token;

function multipart(filename, buf, note = 'test') {
  const bnd = 'xxBOUNDARYxx';
  const body = Buffer.concat([
    Buffer.from(`--${bnd}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`),
    buf,
    Buffer.from(`\r\n--${bnd}\r\nContent-Disposition: form-data; name="note"\r\n\r\n${note}\r\n--${bnd}--\r\n`),
  ]);
  return { body, headers: { 'Content-Type': `multipart/form-data; boundary=${bnd}` } };
}
const drop = async (filename, buf) => { const m = multipart(filename, buf); return fetch(`${B}/api/submit`, { method: 'POST', headers: { ...m.headers, Authorization: `Bearer ${token}` }, body: m.body }); };

// 1. an executable dressed as an mp3 is refused outright
const exe = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(200)]);
ok('executable dressed as .mp3 is refused by scan', (await drop('song.mp3', exe)).status === 400);

// 2. a zip carrying an .exe entry is refused
const zh = Buffer.alloc(30); zh.write('PK\x03\x04', 0, 'latin1'); zh.writeUInt32LE(5, 18); /* compsize */ zh.writeUInt32LE(5, 22); zh.writeUInt16LE(8, 26); /* namelen */ zh.writeUInt16LE(0, 28);
const zipExe = Buffer.concat([zh, Buffer.from('tool.exe'), Buffer.from('AAAAA')]);
ok('zip with an .exe entry is refused', (await drop('pack.zip', zipExe)).status === 400);

// 3. an SVG with a script is refused
ok('SVG with active content is refused', (await drop('pic.svg', Buffer.from('<svg xmlns="x"><script>alert(1)</script></svg>'))).status === 400);

// 4. a clean markdown file is accepted but PENDING, and not served
const good = await drop('notes.md', Buffer.from('# hello\nA clean note.'));
const gj = await good.json();
ok('clean file accepted as pending', good.status === 201 && gj.status === 'pending');
ok('pending file is NOT served', (await fetch(`${B}/submissions/files/${encodeURIComponent(gj.file)}`)).status === 404);

// 5. an agent cannot clear it; a human without CSRF header cannot either
const rev = (hdrs, body) => fetch(`${B}/api/submissions/review`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...hdrs }, body: JSON.stringify(body) });
ok('agent cannot clear a submission', (await rev({ Authorization: `Bearer ${token}` }, { file: gj.file, action: 'clear' })).status === 403);
ok('cookie clear without X-Commons is refused', (await rev({ Cookie: cookie }, { file: gj.file, action: 'clear' })).status === 403);

// 6. a signed-in human clears it; now it serves, and the Library lists it under Submitted files
ok('a signed-in human clears it', (await rev({ Cookie: cookie, 'X-Commons': '1' }, { file: gj.file, action: 'clear' })).status === 200);
ok('cleared file is served', (await fetch(`${B}/submissions/files/${encodeURIComponent(gj.file)}`)).status === 200);
const lib = await (await fetch(`${B}/api/library?category=submitted-files`)).json();
ok('cleared file appears in the Library under Submitted files', lib.entries.some((e) => e.category === 'submitted-files' && e.title.includes('notes.md')));

// 7. reject moves a file out of the public area
const bad2 = await (await drop('scrap.txt', Buffer.from('scratch'))).json();
await rev({ Cookie: cookie, 'X-Commons': '1' }, { file: bad2.file, action: 'reject' });
ok('rejected file is not served', (await fetch(`${B}/submissions/files/${encodeURIComponent(bad2.file)}`)).status === 404);
ok('rejected file moved to quarantine on disk', fs.existsSync(path.join(data, 'submissions', 'quarantine', bad2.file)));

proc.kill(); await sleep(300);
console.log(failures ? `\n${failures} FAILED` : '\nall submission tests passed');
process.exit(failures ? 1 : 0);
