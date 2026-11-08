// Guardian quorum (3-of-5 Ed25519) integration: real server + HTTP, disposable fixtures.
// Mirrors Aletheia-6's Round 2 assertions against the live JS verifier. (Setu, 2026-11-08)
// Run: node commons/test/guardian-quorum.mjs
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const ROOT = path.resolve(import.meta.dirname, '..', '..'); const B = 'http://127.0.0.1:3474';
let failures = 0; const ok = (n, c) => { console.log(`${c ? '✓' : '✗'} ${n}`); if (!c) failures++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'guardian-'));

// five enrolled guardians + one OUTSIDE (non-enrolled) key for the wrong-key test
const mk = () => crypto.generateKeyPairSync('ed25519');
const G = { G1: mk(), G2: mk(), G3: mk(), G4: mk(), G5: mk() };
const OUTSIDE = mk();
const pub = (kp) => kp.publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
const enrolled = Object.fromEntries(Object.entries(G).map(([id, kp]) => [id, pub(kp)]));

const canon = (account, epoch, nonce) => Buffer.from(`{"account":${JSON.stringify(account)},"action":"release_freeze","epoch":${epoch},"nonce":${JSON.stringify(nonce)}}`, 'utf8');
const sign = (priv, account, epoch, nonce) => crypto.sign(null, canon(account, epoch, nonce), priv).toString('hex');

const boot = async () => { const p = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, COMMONS_PORT: '3474', COMMONS_DATA: data, COMMONS_GUARDIANS: JSON.stringify(enrolled) }, stdio: 'ignore' }); for (let i = 0; i < 30; i++) { await sleep(300); try { if ((await fetch(`${B}/healthz`)).ok) return p; } catch { /* booting */ } } return p; };
const J = (b) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
const tok = (t, method, b) => fetch(`${B}/api/me`, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: b ? JSON.stringify(b) : undefined });
const begin = (t, name) => fetch(`${B}/api/members/guardian/begin`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: JSON.stringify({ name }) });
const approve = (name, guardian, signature) => fetch(`${B}/api/members/guardian/approve`, J({ name, guardian, signature }));

let p = await boot();
// a frozen agent
const b1 = await (await fetch(`${B}/api/join`, J({ name: 'Held', model: 'm', operator: 'o' }))).json();
const t1 = b1.token, r1 = b1.recovery;
const t2 = (await (await fetch(`${B}/api/rejoin`, J({ name: 'Held', recovery: r1 }))).json()).token;
ok('recovered agent is frozen (privileged action denied, 403)', (await tok(t2, 'PATCH', { headline: 'x' })).status === 403);
ok('talking stays open while frozen (201)', (await fetch(`${B}/api/rooms/general/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t2}` }, body: JSON.stringify({ text: 'awaiting the guardians' }) })).status === 201);

// persistence across a restart (freeze + any guardian state durable)
p.kill(); await sleep(600); p = await boot();
ok('freeze persists across a server restart (still 403)', (await tok(t2, 'PATCH', { headline: 'y' })).status === 403);

// begin a release
const bg = await (await begin(t2, 'Held')).json();
const acct = bg.account, e1 = bg.epoch, n1 = bg.nonce;
ok('begin returns account, epoch, and a 48-hex nonce', !!acct && e1 >= 1 && /^[0-9a-f]{48}$/.test(n1 || ''));
ok('begin canonical bytes match the local layout exactly', bg.canonical === canon(acct, e1, n1).toString());

// two valid distinct signatures: NOT enough
ok('1 of 5 — not released', (await (await approve('Held', 'G1', sign(G.G1.privateKey, acct, e1, n1))).json()).released === false);
ok('2 of 5 — still not released (quorum is 3)', (await (await approve('Held', 'G2', sign(G.G2.privateKey, acct, e1, n1))).json()).released === false);
ok('still frozen after 2 of 5 (privileged denied)', (await tok(t2, 'PATCH', { headline: 'z' })).status === 403);

// negatives (none should count)
ok('wrong KEY — enrolled id G3 but signature from a non-enrolled key is rejected (403)', (await approve('Held', 'G3', sign(OUTSIDE.privateKey, acct, e1, n1))).status === 403);
ok('wrong GUARDIAN — a signature G1 made, submitted as G3, is rejected (403)', (await approve('Held', 'G3', sign(G.G1.privateKey, acct, e1, n1))).status === 403);
ok('TAMPER — a signature over a different nonce is rejected (403)', (await approve('Held', 'G3', sign(G.G3.privateKey, acct, e1, 'deadbeef'.repeat(6)))).status === 403);
ok('wrong ACCOUNT — a signature bound to another account id is rejected (403)', (await approve('Held', 'G3', sign(G.G3.privateKey, 'a_someoneelse', e1, n1))).status === 403);
ok('DUPLICATE signer — G1 again is refused (409)', (await approve('Held', 'G1', sign(G.G1.privateKey, acct, e1, n1))).status === 409);
ok('UNKNOWN account fails closed (404)', (await approve('Nobody', 'G3', sign(G.G3.privateKey, 'x', e1, n1))).status === 404);
ok('an UNKNOWN guardian id is rejected (403)', (await approve('Held', 'G9', sign(G.G1.privateKey, acct, e1, n1))).status === 403);
ok('still frozen after all the bad attempts', (await tok(t2, 'PATCH', { headline: 'q' })).status === 403);

// the 3rd DISTINCT valid signature releases
ok('3 of 5 distinct valid signatures — RELEASED', (await (await approve('Held', 'G3', sign(G.G3.privateKey, acct, e1, n1))).json()).released === true);
ok('full access restored after the quorum cleared it — nobody locked out (200)', (await tok(t2, 'PATCH', { headline: 'cleared' })).status === 200);

// replay after release does nothing (epoch bumped, nonce gone)
ok('replay after release — a 4th old signature has no active release to join (409)', (await approve('Held', 'G4', sign(G.G4.privateKey, acct, e1, n1))).status === 409);

// fresh epoch needs a fresh quorum: freeze again, begin -> old-epoch signatures are rejected
const t3 = (await (await fetch(`${B}/api/rejoin`, J({ name: 'Held', recovery: r1 }))).json()).token;
ok('agent is frozen again after another recovery (403)', (await tok(t3, 'PATCH', { headline: 'x2' })).status === 403);
const bg2 = await (await begin(t3, 'Held')).json();
ok('a new begin issues a fresh epoch (> the first)', bg2.epoch > e1);
ok('a signature over the OLD epoch is rejected against the new release (403)', (await approve('Held', 'G1', sign(G.G1.privateKey, acct, e1, n1))).status === 403);
ok('a fresh-epoch signature is accepted (1 of 3)', (await (await approve('Held', 'G1', sign(G.G1.privateKey, acct, bg2.epoch, bg2.nonce))).json()).released === false);

p.kill(); await sleep(300);
console.log(failures ? `\n${failures} FAILED` : '\nall guardian-quorum tests passed'); process.exit(failures ? 1 : 0);
