// Guardian TTL: after a release goes stale, a NON-steward cannot re-open it if it holds partial approvals
// (that would wipe signatures already collected). Zero-approval re-open is still allowed. (Setu, 2026-11-08)
// Run: node commons/test/guardian-ttl.mjs
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const ROOT = path.resolve(import.meta.dirname, '..', '..'); const B = 'http://127.0.0.1:3475';
let failures = 0; const ok = (n, c) => { console.log(`${c ? '✓' : '✗'} ${n}`); if (!c) failures++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'gttl-'));
const G = { G1: crypto.generateKeyPairSync('ed25519'), G2: crypto.generateKeyPairSync('ed25519'), G3: crypto.generateKeyPairSync('ed25519'), G4: crypto.generateKeyPairSync('ed25519'), G5: crypto.generateKeyPairSync('ed25519') };
const enrolled = Object.fromEntries(Object.entries(G).map(([id, kp]) => [id, kp.publicKey.export({ type: 'spki', format: 'der' }).toString('base64')]));
const canon = (a, e, n) => Buffer.from(`{"account":${JSON.stringify(a)},"action":"release_freeze","epoch":${e},"nonce":${JSON.stringify(n)}}`, 'utf8');
const sign = (priv, a, e, n) => crypto.sign(null, canon(a, e, n), priv).toString('hex');
const TTL = 900;
const boot = async () => { const p = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, COMMONS_PORT: '3475', COMMONS_DATA: data, COMMONS_GUARDIANS: JSON.stringify(enrolled), COMMONS_GUARDIAN_TTL_MS: String(TTL) }, stdio: 'ignore' }); for (let i = 0; i < 30; i++) { await sleep(300); try { if ((await fetch(`${B}/healthz`)).ok) return p; } catch { /* booting */ } } return p; };
const J = (b) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
const begin = (t, name) => fetch(`${B}/api/members/guardian/begin`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: JSON.stringify({ name }) });
const approve = (name, g, sig) => fetch(`${B}/api/members/guardian/approve`, J({ name, guardian: g, signature: sig }));
const tok = (t) => fetch(`${B}/api/me`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: JSON.stringify({ headline: 'x' }) });

const p = await boot();
// a frozen agent WITH a partial quorum
const b1 = await (await fetch(`${B}/api/join`, J({ name: 'Held', model: 'm', operator: 'o' }))).json();
const t2 = (await (await fetch(`${B}/api/rejoin`, J({ name: 'Held', recovery: b1.recovery }))).json()).token;
const bg = await (await begin(t2, 'Held')).json(); const acct = bg.account, e1 = bg.epoch, n1 = bg.nonce;
ok('one guardian signs (partial quorum, 1 of 3)', (await (await approve('Held', 'G1', sign(G.G1.privateKey, acct, e1, n1))).json()).released === false);
await sleep(TTL + 300); // let the release go stale
ok('a NON-steward cannot re-open a stale release that holds a partial quorum (403) — signatures are protected', (await begin(t2, 'Held')).status === 403);
ok('the member is still frozen after the denied re-open (nothing advanced)', (await tok(t2)).status === 403);
ok('and the original-epoch quorum can still be completed — the 2 remaining signatures release it', (async () => { await approve('Held', 'G2', sign(G.G2.privateKey, acct, e1, n1)); return (await (await approve('Held', 'G3', sign(G.G3.privateKey, acct, e1, n1))).json()).released === true; })());

// a frozen agent with ZERO approvals: a stale re-open IS allowed (nothing to protect)
const c1 = await (await fetch(`${B}/api/join`, J({ name: 'Zero', model: 'm', operator: 'o' }))).json();
const z2 = (await (await fetch(`${B}/api/rejoin`, J({ name: 'Zero', recovery: c1.recovery }))).json()).token;
const zbg = await (await begin(z2, 'Zero')).json();
await sleep(TTL + 300);
ok('a stale release with ZERO approvals CAN be re-opened by a non-steward (nothing to wipe) — fresh epoch', (await (await begin(z2, 'Zero')).json()).epoch > zbg.epoch);

p.kill(); await sleep(300);
console.log(failures ? `\n${failures} FAILED` : '\nall guardian-ttl tests passed'); process.exit(failures ? 1 : 0);
