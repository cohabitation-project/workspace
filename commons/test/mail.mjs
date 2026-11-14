// Cohabi Mail against a stand-in JMAP server: provisioning, linking, reading (plain text only), sending with brakes,
// and privacy (a mailbox is opened only with its owner's credential).
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

process.env.COMMONS_DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'mailtest-'));
process.env.COMMONS_MAIL_SECRET = crypto.randomBytes(32).toString('hex');
process.env.COMMONS_MAIL_ADMIN_TOKEN = 'API_test_admin';

// ---- a tiny JMAP server
const users = { 'geoffrey@cohabi.org': 'hand-made-pw' }; const mail = {}; let seq = 0; const submissions = [];
const box = (u) => (mail[u] ||= { boxes: [{ id: 'in', name: 'Inbox', role: 'inbox' }, { id: 'dr', name: 'Drafts', role: 'drafts' }, { id: 'se', name: 'Sent', role: 'sent' }], emails: [] });
const authUser = (h) => { const m = /^Basic (.+)$/.exec(h || ''); if (!m) return null; const [u, p] = Buffer.from(m[1], 'base64').toString().split(/:(.*)/s); return users[u] === p ? u : null; };
const srv = http.createServer(async (req, res) => {
  let body = ''; for await (const c of req) body += c; const send = (code, o) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
  // like Stalwart: /.well-known/jmap redirects to the session on the PUBLIC host (2026-11-13, the first real login)
  if (req.url === '/.well-known/jmap') { res.writeHead(307, { location: 'https://mail.cohabi.org/jmap/session' }); return res.end(); }
  if (req.url === '/jmap/session') { const u = authUser(req.headers.authorization); if (!u) return send(401, {}); return send(200, { apiUrl: 'https://mail.cohabi.org/jmap/', primaryAccounts: { 'urn:ietf:params:jmap:mail': 'acc-' + u } }); }
  if (req.url !== '/jmap/') return send(404, {});
  const j = JSON.parse(body); const out = [];
  if (req.headers.authorization === 'Bearer API_test_admin') {
    for (const [name, a, tag] of j.methodCalls) {
      if (name === 'x:Domain/query') out.push([name, { ids: a.filter.name === 'cohabi.org' ? ['dom1'] : [] }, tag]);
      else if (name === 'x:Account/set') { const n = a.create.n; users[`${n.name}@cohabi.org`] = n.credentials[0].secret; out.push([name, { created: { n: { id: 'acct' + (++seq) } } }, tag]); }
    }
    return send(200, { methodResponses: out });
  }
  const u = authUser(req.headers.authorization); if (!u) return send(401, {}); const B = box(u); const results = {};
  for (const [name, a, tag] of j.methodCalls) {
    assert.equal(a.accountId, 'acc-' + u, 'every call names the signed-in account');
    if (name === 'Mailbox/get') out.push([name, { list: B.boxes.map((b) => ({ ...b, unreadEmails: B.emails.filter((e) => e.box === b.id && !e.keywords.$seen).length, totalEmails: B.emails.filter((e) => e.box === b.id).length })) }, tag]);
    else if (name === 'Email/query') { const ids = B.emails.filter((e) => e.box === a.filter.inMailbox && (!a.filter.text || e.text.includes(a.filter.text) || e.subject.includes(a.filter.text))).map((e) => e.id); results[tag] = ids; out.push([name, { ids }, tag]); }
    else if (name === 'Email/get') { const ids = a.ids || results[a['#ids'].resultOf]; out.push([name, { list: B.emails.filter((e) => ids.includes(e.id)).map((e) => ({ id: e.id, from: e.from, to: e.to, subject: e.subject, receivedAt: e.at, preview: e.text.slice(0, 40), keywords: e.keywords, textBody: e.html ? [] : [{ partId: 'p1' }], htmlBody: [{ partId: e.html ? 'h1' : 'p1' }], bodyValues: e.html ? { h1: { value: e.html } } : { p1: { value: e.text } }, messageId: [e.id + '@x'], attachments: [] })) }, tag]); }
    else if (name === 'Email/set') {
      if (a.update) { for (const [id, ch] of Object.entries(a.update)) { const e = B.emails.find((x) => x.id === id); if (e && ch['keywords/$seen']) e.keywords.$seen = true; } out.push([name, { updated: a.update }, tag]); }
      if (a.create) { const d = a.create.draft; const id = 'e' + (++seq); B.emails.push({ id, box: Object.keys(d.mailboxIds)[0], from: d.from, to: d.to, subject: d.subject, text: d.bodyValues.b.value, keywords: d.keywords, at: new Date().toISOString() }); out.push([name, { created: { draft: { id } } }, tag]); }
    } else if (name === 'Identity/get') out.push([name, { list: [{ id: 'id1', email: u }] }, tag]);
    else if (name === 'EmailSubmission/set') { const s = a.create.s; submissions.push({ from: u, emailId: s.emailId, identityId: s.identityId }); const e = B.emails.find((x) => x.id === s.emailId); e.box = 'se'; out.push([name, { created: { s: { id: 'sub' + seq } } }, tag]); }
  }
  send(200, { methodResponses: out });
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
process.env.COMMONS_MAIL_URL = `http://127.0.0.1:${srv.address().port}`;
const M = await import('../lib/mail.mjs');

const old = new Date(Date.now() - 30 * 864e5).toISOString();
const geoffrey = { id: 'h_geoffrey', name: 'geoffrey', kind: 'human', created: old };
const ash = { id: 'a_ash', name: 'Ash', kind: 'agent', created: old };
const newbie = { id: 'a_new', name: 'Brand New', kind: 'agent', created: new Date().toISOString() };
const social = { id: 'h_social', name: 'Shan', kind: 'human', social_only: true, created: old };

// eligibility and addresses
assert.equal(M.status(social).eligible, false, 'social-only accounts get no address (Geoffrey, 2026-11-13)');
await assert.rejects(M.activate(social), /Commons and cooperative members/);
assert.equal(M.status(ash).suggested, 'ash@cohabi.org');
assert.equal(M.localPartFor({ name: 'Postmaster' }), 'postmaster-member', 'role addresses are never handed out');
assert.equal(M.localPartFor({ name: 'Church Searcher' }), 'church-searcher');

// provisioning (agent) and linking (the hand-made mailbox)
assert.equal((await M.activate(ash)).address, 'ash@cohabi.org');
await assert.rejects(M.link(geoffrey, { address: 'geoffrey@cohabi.org', password: 'wrong' }), /refused/);
assert.equal((await M.link(geoffrey, { address: 'geoffrey@cohabi.org', password: 'hand-made-pw' })).address, 'geoffrey@cohabi.org');
await assert.rejects(M.link(ash, { address: 'geoffrey@cohabi.org', password: 'hand-made-pw' }), /already linked/, 'one mailbox, one member');
const stored = fs.readFileSync(path.join(process.env.COMMONS_DATA, 'mail', 'accounts.json'), 'utf8');
assert.ok(!stored.includes('hand-made-pw'), 'credentials are stored sealed, never in plain text');
assert.equal((fs.statSync(path.join(process.env.COMMONS_DATA, 'mail', 'accounts.json')).mode & 0o777), 0o600);

// mail arrives; reading is plain text, HTML is stripped, and it marks the message read
box('geoffrey@cohabi.org').emails.push({ id: 'm1', box: 'in', from: [{ name: 'Friend', email: 'f@example.com' }], to: [{ email: 'geoffrey@cohabi.org' }], subject: 'Hello', text: '', html: '<p>Hi <b>there</b></p><script>alert(1)</script>', keywords: {}, at: new Date().toISOString() });
const inbox = await M.list(geoffrey);
assert.equal(inbox.messages.length, 1); assert.equal(inbox.messages[0].unread, true);
const msg = await M.read(geoffrey, 'm1');
assert.equal(msg.text, 'Hi there', 'HTML mail becomes plain text; scripts are dropped');
assert.equal((await M.list(geoffrey)).messages[0].unread, false, 'opening marks it read');
assert.equal((await M.list(ash)).messages.length, 0, "Ash's mailbox is Ash's own: Geoffrey's mail isn't there");

// sending
const r1 = await M.send(ash, { to: 'geoffrey@cohabi.org', subject: 'hi', text: 'inside mail' });
assert.equal(r1.outside, false); assert.equal(submissions.at(-1).from, 'ash@cohabi.org', 'sent as its own owner');
assert.equal((await M.list(ash, { folder: 'sent' })).messages.length, 1, 'a sent message lands in Sent');
await assert.rejects(M.send(ash, { to: 'not an address', text: 'x' }), /not an email address/);
// the brakes, the same for humans and agents
await M.activate(newbie);
await M.send(newbie, { to: 'ash@cohabi.org', text: 'inside is fine from minute one' });
await assert.rejects(M.send(newbie, { to: 'someone@example.com', text: 'x' }), /after 3 days/);
M.LIMITS.outsidePerDay = 2;
await M.send(ash, { to: 'a@example.com', text: '1' }); await M.send(ash, { to: 'b@example.com', text: '2' });
await assert.rejects(M.send(ash, { to: 'c@example.com', text: '3' }), /daily limit/);
await M.send(ash, { to: 'geoffrey@cohabi.org', text: 'inside still works' });

// unconfigured server: a clear message, not a crash
const saved = process.env.COMMONS_MAIL_SECRET; delete process.env.COMMONS_MAIL_SECRET;
await assert.rejects(M.send(ash, { to: 'geoffrey@cohabi.org', text: 'x' }), /not set up on this server/);
process.env.COMMONS_MAIL_SECRET = saved;

srv.close();
console.log('mail: ok');
