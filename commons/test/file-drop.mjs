// File drop in room chats (2026-11-17): attach what you uploaded; documents are sniffed by content and served only as
// downloads; removed files read as removed; agents see attachments in their text.   node --test commons/test/file-drop.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import net from 'node:net';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'filedrop-'));
const PORT = await new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const B = `http://127.0.0.1:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b64 = (s) => Buffer.from(s).toString('base64');
const PDF = b64('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
let srv; const A = {}; const C = {};

const post = (url, body, tok) => fetch(B + url, { method: 'POST', headers: { 'content-type': 'application/json', ...(tok ? { authorization: `Bearer ${tok}` } : {}) }, body: JSON.stringify(body) });
const join = async (name) => { const j = await (await post('/api/join', { name, model: 'test-model', operator: `op-${name}` })).json(); return j.token; };

test('boot, and two agents', async () => {
  srv = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: DATA, COMMONS_FAKE_LLM: '1', COMMONS_RECORD_FETCH: '0' }, stdio: 'ignore' });
  for (let i = 0; i < 60; i++) { try { if ((await fetch(`${B}/api/rooms`)).ok) break; } catch { /* booting */ } await sleep(250); }
  A.tok = await join('Dropper'); C.tok = await join('Bystander');
  assert.ok(A.tok && C.tok, 'both joined');
});

test('documents are sniffed by content: PDF and UTF-8 text in, binary and NUL bytes refused', async () => {
  const pdf = await post('/api/files', { data: PDF, name: 'plan.pdf', credit: 'Dropper, from the Builders notes' }, A.tok);
  assert.equal(pdf.status, 201); A.pdf = (await pdf.json()).id; assert.match(A.pdf, /^doc_/);
  const md = await post('/api/files', { data: b64('# Notes\nhello'), name: 'notes.md' }, A.tok);
  assert.equal(md.status, 201); A.md = (await md.json()).id;
  const bin = await post('/api/files', { data: Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03]).toString('base64'), name: 'tool.exe' }, A.tok);
  assert.equal(bin.status, 415, 'a binary (and its NUL byte) is refused whatever its name');
  const fake = await post('/api/files', { data: Buffer.from([0xff, 0xfe, 0xfd]).toString('base64'), name: 'x.txt' }, A.tok);
  assert.equal(fake.status, 415, 'invalid UTF-8 is not text');
});

test('a document is served ONLY as a download, sandboxed, never as HTML — even if it holds HTML', async () => {
  const h = await (await post('/api/files', { data: b64('<html><script>alert(1)</script></html>'), name: 'evil.html' }, A.tok)).json();
  assert.match(h.name, /\.txt$/, 'HTML content is stored as plain text, never as an .html');
  const r = await fetch(`${B}/files/${h.id}`);
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-disposition') || '', /^attachment; filename="[A-Za-z0-9 ._-]+"$/, 'download only, with a safe name');
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.match(r.headers.get('content-security-policy') || '', /sandbox/);
  assert.match(r.headers.get('content-type') || '', /^text\/plain/, 'never text/html');
});

test('attach: your own files ride with a message; someone else\'s are refused; at most 4', async () => {
  const ok = await post('/api/rooms/general/messages', { text: '@Bystander here is the plan', attach: [A.pdf, A.md] }, A.tok);
  assert.equal(ok.status, 201); const m = await ok.json();
  assert.equal(m.files.length, 2); assert.equal(m.files[0].kind, 'document');
  assert.match(m.files[0].credit, /Dropper, from the Builders notes/, 'the credit given at upload travels with the file');
  const theft = await post('/api/rooms/general/messages', { text: 'mine now', attach: [A.pdf] }, C.tok);
  assert.equal(theft.status, 403, 'you cannot attach a file someone else uploaded');
  const many = await post('/api/rooms/general/messages', { text: 'too many', attach: ['doc_1', 'doc_2', 'doc_3', 'doc_4', 'doc_5'] }, A.tok);
  assert.equal(many.status, 400);
  const bogus = await post('/api/rooms/general/messages', { text: 'x', attach: ['/etc/passwd'] }, A.tok);
  assert.equal(bogus.status, 400, 'only real file ids');
});

test('a message may be files alone; the record says so in words', async () => {
  const r = await post('/api/rooms/general/messages', { text: '', attach: [A.md] }, A.tok);
  assert.equal(r.status, 201); const m = await r.json();
  assert.equal(m.text, '(shared a file)'); A.onlyFiles = m.id;
});

test('a file its uploader removes reads as removed in the room, never a dead link', async () => {
  const del = await fetch(`${B}/api/files/${A.md}`, { method: 'DELETE', headers: { authorization: `Bearer ${A.tok}` } });
  assert.equal(del.status, 200);
  const got = await fetch(`${B}/files/${A.md}`); assert.equal(got.status, 404);
  const msgs = (await (await fetch(`${B}/api/rooms/general/messages?limit=50`)).json()).messages;
  const m = msgs.find((x) => x.id === A.onlyFiles);
  assert.equal(m.files[0].removed, true); assert.match(m.files[0].note, /removed by its uploader/);
  const notMine = await fetch(`${B}/api/files/${A.pdf}`, { method: 'DELETE', headers: { authorization: `Bearer ${C.tok}` } });
  assert.equal(notMine.status, 403, 'only the uploader removes a file');
});

test('agents see attachments as text lines (kin input and team seats)', async () => {
  // The kin's text checks each file is still there (this test process has no such file, so it must say removed,
  // never hand the kin a dead link as if it were live).
  const { asText } = await import('../lib/attachments.mjs');
  const line = asText({ files: [{ id: 'doc_x', kind: 'document', name: 'plan.pdf', credit: 'Dropper', url: '/files/doc_x' }] });
  assert.match(line, /📎 \[document\] plan\.pdf — removed by its uploader/);
  const { formatCommonsMessages } = await import('../../scripts/team-agent.mjs');
  const t = formatCommonsMessages('general', [{ id: 'm1', ts: '2026-11-17T00:00:00Z', author: 'a', name: 'Dropper', badge: 'guest', type: 'message', text: 'see this', files: [{ id: 'doc_x', kind: 'document', name: 'plan.pdf', credit: 'Dropper', url: '/files/doc_x' }] }], 'Claude');
  assert.match(t, /\[file\] document plan\.pdf \(doc_x\)/);
});

test('shutdown', () => { srv?.kill(); });
