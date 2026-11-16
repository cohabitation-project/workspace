// Cobox attachments (2026-11-16) against a stand-in JMAP server: a file uploads into the member's own account, a sent
// message carries it as an attachment, a received one can be downloaded, and a blob that isn't on the message is refused.
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import crypto from 'node:crypto';

process.env.COMMONS_DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'mailatt-'));
process.env.COMMONS_MAIL_SECRET = crypto.randomBytes(32).toString('hex');

const users = { 'maker@cohabi.org': 'pw-maker' }; const blobs = new Map(); let created = null; let seq = 0;
const authUser = (h) => { const m = /^Basic (.+)$/.exec(h || ''); if (!m) return null; const [u, p] = Buffer.from(m[1], 'base64').toString().split(/:(.*)/s); return users[u] === p ? u : null; };
const srv = http.createServer(async (req, res) => {
  const chunks = []; for await (const c of req) chunks.push(c); const raw = Buffer.concat(chunks);
  const send = (code, o, type = 'application/json') => { res.writeHead(code, { 'content-type': type }); res.end(type === 'application/json' ? JSON.stringify(o) : o); };
  const u = authUser(req.headers.authorization);
  if (req.url === '/.well-known/jmap') { res.writeHead(307, { location: 'https://mail.cohabi.org/jmap/session' }); return res.end(); }
  if (req.url === '/jmap/session') { if (!u) return send(401, {}); return send(200, { apiUrl: 'https://mail.cohabi.org/jmap/', uploadUrl: 'https://mail.cohabi.org/jmap/upload/{accountId}/', downloadUrl: 'https://mail.cohabi.org/jmap/download/{accountId}/{blobId}/{name}?accept={type}', primaryAccounts: { 'urn:ietf:params:jmap:mail': 'acc-' + u } }); }
  if (!u) return send(401, {});
  if (req.url === `/jmap/upload/acc-${encodeURIComponent(u)}/`) { const id = 'B' + (++seq); blobs.set(id, { u, bytes: raw, type: req.headers['content-type'] }); return send(201, { accountId: 'acc-' + u, blobId: id, type: req.headers['content-type'], size: raw.length }); }
  const dl = /^\/jmap\/download\/([^/]+)\/([^/]+)\/([^?]+)\?accept=/.exec(req.url);
  if (dl) { const b = blobs.get(decodeURIComponent(dl[2])); if (!b || b.u !== u || decodeURIComponent(dl[1]) !== 'acc-' + u) return send(404, {}); return send(200, b.bytes, 'application/octet-stream'); }
  if (req.url !== '/jmap/') return send(404, {});
  const j = JSON.parse(raw.toString()); const out = [];
  for (const [name, a, tag] of j.methodCalls) {
    assert.equal(a.accountId, 'acc-' + u);
    if (name === 'Mailbox/get') out.push([name, { list: [{ id: 'in', name: 'Inbox', role: 'inbox' }, { id: 'dr', name: 'Drafts', role: 'drafts' }, { id: 'se', name: 'Sent', role: 'sent' }] }, tag]);
    else if (name === 'Identity/get') out.push([name, { list: [{ id: 'id1', email: u }] }, tag]);
    else if (name === 'Email/set') { created = a.create.draft; out.push([name, { created: { draft: { id: 'sent1' } } }, tag]); }
    else if (name === 'EmailSubmission/set') out.push([name, { created: { s: { id: 'sub1' } } }, tag]);
    else if (name === 'Email/get') out.push([name, { list: a.ids.includes('recv1') ? [{ id: 'recv1', attachments: [{ blobId: 'B1', name: 'plan.pdf', type: 'application/pdf', size: 9 }] }] : [] }, tag]);
  }
  send(200, { methodResponses: out });
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
process.env.COMMONS_MAIL_URL = `http://127.0.0.1:${srv.address().port}`;

const M = await import('../lib/mail.mjs');
const me = { id: 'h_maker', kind: 'human', name: 'Maker' };
await M.link(me, { address: 'maker@cohabi.org', password: 'pw-maker' });

const up = await M.upload(me, Buffer.from('%PDF-test'), { type: 'application/pdf', name: 'plan.pdf' });
assert.equal(up.blobId, 'B1'); assert.equal(up.name, 'plan.pdf'); assert.equal(up.size, 9);
await assert.rejects(M.upload(me, Buffer.alloc(0)), /send the file/);
await assert.rejects(M.upload(me, Buffer.alloc(M.ATTACH_MAX + 1)), /up to 10 MB/);

await M.send(me, { to: 'friend@example.com', subject: 'Plans', text: 'Attached.', attachments: [up] });
assert.deepEqual(created.attachments, [{ blobId: 'B1', type: 'application/pdf', name: 'plan.pdf', disposition: 'attachment' }], 'the message names the uploaded file');
await assert.rejects(M.send(me, { to: 'friend@example.com', text: 'x', attachments: [{ blobId: '../../etc' }] }), /attachment is missing/);
await assert.rejects(M.send(me, { to: 'friend@example.com', text: 'x', attachments: [{ blobId: 'B1', size: M.ATTACH_TOTAL + 1 }] }), /up to 25 MB/);

const got = await M.attachment(me, 'recv1', 'B1');
assert.equal(got.bytes.toString(), '%PDF-test'); assert.equal(got.name, 'plan.pdf');
await assert.rejects(M.attachment(me, 'recv1', 'B999'), /no such attachment/, 'a blob not on the message is refused');
await assert.rejects(M.attachment(me, 'nope', 'B1'), /no such message/);

srv.close();
console.log('mail attachments: all checks passed');
