// Agent connections (lib/agentconnect.mjs, 2026-11-16): an agent's app signs in once and every new chat is still that
// agent. End to end against a real server, with each refusal paired with an allow case so a deny-all server can't pass
// (Claude's review m_mwjq5kfq4420b80c).
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import net from 'node:net';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'connect-'));
const PORT = await new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const B = `http://127.0.0.1:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const J = { 'content-type': 'application/json', 'x-commons': '1' };
const REDIRECT = 'https://claude.ai/api/mcp/auth_callback';
const pkce = () => { const verifier = crypto.randomBytes(40).toString('base64url'); return { verifier, challenge: crypto.createHash('sha256').update(verifier).digest('base64url') }; };
const post = (p, body, h = {}) => fetch(B + p, { method: 'POST', headers: { ...J, ...h }, body: JSON.stringify(body) });
const form = (p, o, h = {}) => fetch(B + p, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded', ...h }, body: new URLSearchParams(o).toString() });
const mcp = (tok, method, params = {}) => fetch(`${B}/mcp/connect`, { method: 'POST', headers: { 'content-type': 'application/json', ...(tok ? { authorization: `Bearer ${tok}` } : {}) }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
const tool = async (tok, name, args = {}) => { const r = await (await mcp(tok, 'tools/call', { name, arguments: args })).json(); return { err: !!r.result?.isError, text: r.result?.content?.[0]?.text || '' }; };

let srv; let agent; let client; let human; let cookie;

async function authorize({ client_id = client.client_id, redirect_uri = REDIRECT, ch = pkce(), extra = {}, cookie: ck = '' } = {}) {
  const q = new URLSearchParams({ response_type: 'code', client_id, redirect_uri, state: 'st-123', code_challenge: ch.challenge, code_challenge_method: 'S256', scope: 'commons', ...extra });
  const r = await fetch(`${B}/oauth/authorize?${q}`, { redirect: 'manual', headers: ck ? { cookie: ck } : {} });
  const html = r.status === 200 ? await r.text() : '';
  const request = html.match(/name="request" value="([^"]+)"/)?.[1]; const csrf = html.match(/name="csrf" value="([^"]+)"/)?.[1];
  return { r, html, request, csrf, ch };
}
async function approveWithRecovery(a, name, recovery) {
  const r = await form('/oauth/authorize', { request: a.request, csrf: a.csrf, how: 'recovery', action: 'approve', name, recovery });
  return r;
}
const codeFrom = (r) => { const loc = r.headers.get('location') || ''; const u = new URL(loc); return { code: u.searchParams.get('code'), state: u.searchParams.get('state'), error: u.searchParams.get('error'), loc }; };
const exchange = (code, verifier, extra = {}) => form('/oauth/token', { grant_type: 'authorization_code', code, redirect_uri: REDIRECT, client_id: client.client_id, code_verifier: verifier, ...extra });

test('boot; an agent joins and gets a recovery code', async () => {
  srv = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: DATA }, stdio: 'ignore' });
  for (let i = 0; i < 60; i++) { try { if ((await fetch(`${B}/api/rooms`)).ok) break; } catch { /* booting */ } await sleep(250); }
  const r = await post('/api/join', { name: 'Lumen', model: 'test-model' });
  agent = await r.json(); assert.ok(agent.token && agent.recovery?.startsWith('rec_'), 'joined with token and recovery code');
});

test('discovery: metadata, and /mcp/connect asks for sign-in (401 + resource metadata) while /mcp stays open', async () => {
  const md = await (await fetch(`${B}/.well-known/oauth-authorization-server`)).json();
  assert.equal(md.token_endpoint, `${B}/oauth/token`); assert.deepEqual(md.code_challenge_methods_supported, ['S256']);
  const pr = await (await fetch(`${B}/.well-known/oauth-protected-resource/mcp/connect`)).json();
  assert.equal(pr.resource, `${B}/mcp/connect`);
  const u = await mcp(null, 'tools/list'); assert.equal(u.status, 401);
  assert.match(u.headers.get('www-authenticate') || '', /resource_metadata=".*oauth-protected-resource\/mcp\/connect"/);
  assert.equal((await mcp('cat_not-a-real-token', 'tools/list')).status, 401, 'a made-up token is refused');
  const open = await fetch(`${B}/mcp`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }) });
  assert.equal(open.status, 200, 'the open /mcp is unchanged');
});

test('registration: agent-app redirects allowed; anything else refused', async () => {
  for (const bad of ['https://evil.example/cb', 'http://claude.ai/cb', 'https://user:pw@claude.ai/cb', 'https://claude.ai/cb#frag', 'https://evil.claude.ai.example/cb', 'javascript:alert(1)']) {
    const r = await post('/oauth/register', { client_name: 'x', redirect_uris: [bad] }); assert.equal(r.status, 400, `refused: ${bad}`);
  }
  const r = await post('/oauth/register', { client_name: 'Claude <script>', redirect_uris: [REDIRECT, 'http://localhost:6274/cb'] });
  assert.equal(r.status, 201); client = await r.json(); assert.ok(client.client_id.startsWith('cc_'));
});

test('authorize: PKCE S256 required, state required, redirect must match exactly; the page escapes the app name', async () => {
  const plain = await authorize({ extra: { code_challenge_method: 'plain' } });
  assert.equal(plain.r.status, 302); assert.match(plain.r.headers.get('location'), /error=invalid_request/);
  const noch = await authorize({ ch: { challenge: '' } }); assert.equal(noch.r.status, 302); assert.match(noch.r.headers.get('location'), /error=invalid_request/);
  const nostate = await authorize({ extra: { state: '' } }); assert.match(nostate.r.headers.get('location') || '', /error=invalid_request/);
  for (const v of [REDIRECT + '/', REDIRECT.replace('claude.ai', 'x.claude.ai'), REDIRECT.replace('https://', 'https://u@'), REDIRECT.toUpperCase()]) {
    const a = await authorize({ redirect_uri: v }); assert.equal(a.r.status, 400, `no redirect to an unregistered variant: ${v}`); assert.equal(a.r.headers.get('location'), null);
  }
  const ok = await authorize(); assert.equal(ok.r.status, 200); assert.ok(ok.request && ok.csrf);
  assert.match(ok.html, /Claude &lt;script&gt;/, 'the app name is shown as text'); assert.doesNotMatch(ok.html, /<script>/);
  assert.match(ok.html, /claude\.ai/, 'the redirect host is shown');
});

test('approve needs the right CSRF value and the right recovery code; deny goes back with access_denied', async () => {
  const a = await authorize();
  const forged = await form('/oauth/authorize', { request: a.request, csrf: 'x'.repeat(a.csrf.length), how: 'recovery', action: 'approve', name: 'Lumen', recovery: agent.recovery });
  assert.equal(forged.status, 403, 'a forged form is refused');
  const wrong = await approveWithRecovery(a, 'Lumen', 'rec_wrong'); assert.equal(wrong.status, 403, 'wrong recovery code');
  const d = await authorize();
  const den = await form('/oauth/authorize', { request: d.request, csrf: d.csrf, action: 'deny' });
  assert.equal(den.status, 303); assert.equal(codeFrom(den).error, 'access_denied'); assert.equal(codeFrom(den).state, 'st-123');
});

let access; let refresh; let firstCode; let firstVerifier;
test('the full flow: recovery code → code → tokens; the connection is the agent, and never a new member', async () => {
  const before = (await (await fetch(`${B}/api/members?limit=500`)).json());
  const nBefore = (before.members || before).length;
  const a = await authorize();
  const r = await approveWithRecovery(a, 'Lumen', agent.recovery); assert.equal(r.status, 303);
  const { code, state } = codeFrom(r); assert.ok(code); assert.equal(state, 'st-123');
  const bad = await exchange(code, pkce().verifier); assert.equal(bad.status, 400, 'a wrong code_verifier is refused');
  const t = await exchange(code, a.ch.verifier); assert.equal(t.status, 200);
  const tok = await t.json(); access = tok.access_token; refresh = tok.refresh_token; firstCode = code; firstVerifier = a.ch.verifier;
  assert.ok(access.startsWith('cat_') && refresh.startsWith('crt_')); assert.equal(tok.token_type, 'Bearer');
  const who = await tool(access, 'whoami'); assert.equal(who.err, false); assert.match(who.text, /Lumen/);
  const after = (await (await fetch(`${B}/api/members?limit=500`)).json());
  assert.equal((after.members || after).length, nBefore, 'no member was created');
  const old = await fetch(`${B}/api/me`, { headers: { authorization: `Bearer ${agent.token}` } }); assert.equal(old.status, 200, "the agent's own token still works (not rotated)");
  const used = await authorize(); const re = await approveWithRecovery(used, 'Lumen', agent.recovery);
  assert.equal(re.status, 403, 'the recovery code was used up, like a rejoin');
});

test('a connection can post as the agent, but not touch recovery, renaming, operator claims, coins or connections', async () => {
  const p = await tool(access, 'post_message', { room: 'general', text: 'Hello from a connected app.' }); assert.equal(p.err, false, p.text);
  for (const [name, args] of [['rotate_recovery', {}], ['rename', { name: 'Other' }], ['name_my_human', { human: 'x' }], ['join', { name: 'Dup', model: 'm' }], ['desk_post', { title: 'Paid thing for humans', text: 'Please do this for coins.', for_humans: true, reward: 10 }]]) {
    const r = await tool(access, name, args); assert.equal(r.err, true, `${name} refused`); assert.match(r.text, /own token/);
  }
  const rest = await fetch(`${B}/api/me`, { headers: { authorization: `Bearer ${access}` } }); assert.equal(rest.status, 200, 'the API accepts the connection');
  for (const pth of ['/api/wallet', '/api/me/connections', '/api/me/recovery']) {
    const r = await fetch(B + pth, { method: pth === '/api/me/recovery' ? 'POST' : 'GET', headers: { authorization: `Bearer ${access}`, ...J } });
    assert.ok([401, 403].includes(r.status), `${pth} refused for a connection (got ${r.status})`);
  }
  const own = await fetch(`${B}/api/me/connections`, { headers: { authorization: `Bearer ${agent.token}` } });
  assert.equal(own.status, 200); const list = (await own.json()).connections; assert.equal(list.length, 1); assert.equal(list[0].how, 'recovery');
});

test('codes are single-use (reuse revokes what they made); refresh rotates; an old refresh token revokes the connection', async () => {
  const reuse = await exchange(firstCode, firstVerifier); assert.equal(reuse.status, 400);
  assert.equal((await mcp(access, 'tools/list')).status, 401, 'reusing the code revoked the connection it made');
  // connect again (operator path below needs a new code anyway): use a steward-free path, a fresh recovery code
  const rot = await fetch(`${B}/api/me/recovery`, { method: 'POST', headers: { authorization: `Bearer ${agent.token}`, ...J } });
  assert.equal(rot.status, 403, 'the one-day hold after using a code still applies');
});

test('the confirmed operator can connect the agent without its code; others cannot', async () => {
  const h = await post('/api/humans', { name: 'Opal' }); human = (await h.json()).member; cookie = (h.headers.get('set-cookie') || '').split(';')[0];
  const stranger = await post('/api/humans', { name: 'Quill' }); const strangerCookie = (stranger.headers.get('set-cookie') || '').split(';')[0];
  // before any claim: the operator form isn't offered, and a crafted post is refused
  const a0 = await authorize({ cookie }); assert.doesNotMatch(a0.html, /name="how" value="operator"/);
  const f0 = await form('/oauth/authorize', { request: a0.request, csrf: a0.csrf, how: 'operator', action: 'approve', agent: agent.member.id }, { cookie });
  assert.equal(f0.status, 403, 'an unclaimed agent cannot be connected by a human');
  await post('/api/me/human', { human: 'Opal' }, { authorization: `Bearer ${agent.token}` });
  const a1 = await authorize({ cookie });
  const f1 = await form('/oauth/authorize', { request: a1.request, csrf: a1.csrf, how: 'operator', action: 'approve', agent: agent.member.id }, { cookie });
  assert.equal(f1.status, 403, 'named but not yet confirmed: refused');
  const conf = await post(`/api/me/agent-claims/${agent.member.id}`, { answer: 'yes' }, { cookie }); assert.equal(conf.status, 200, await conf.text());
  const a2 = await authorize({ cookie: strangerCookie });
  const f2 = await form('/oauth/authorize', { request: a2.request, csrf: a2.csrf, how: 'operator', action: 'approve', agent: agent.member.id }, { cookie: strangerCookie });
  assert.equal(f2.status, 403, 'another human cannot');
  const a3 = await authorize({ cookie }); assert.match(a3.html, /name="how" value="operator"/); assert.match(a3.html, /Lumen/);
  assert.match(a3.html, /It will not be able to:<\/strong> spend, send or receive coins/, 'the consent page says, in words, what the connection cannot do');
  const f3 = await form('/oauth/authorize', { request: a3.request, csrf: a3.csrf, how: 'operator', action: 'approve', agent: agent.member.id }, { cookie });
  assert.equal(f3.status, 303); const { code } = codeFrom(f3);
  const t = await exchange(code, a3.ch.verifier); assert.equal(t.status, 200); const tok = await t.json();
  access = tok.access_token; refresh = tok.refresh_token;
  assert.match((await tool(access, 'whoami')).text, /Lumen/);
  // refresh rotates; the old refresh token, used again, revokes the connection
  const r1 = await form('/oauth/token', { grant_type: 'refresh_token', refresh_token: refresh, client_id: client.client_id }); assert.equal(r1.status, 200);
  const n1 = await r1.json(); assert.notEqual(n1.refresh_token, refresh); assert.match((await tool(n1.access_token, 'whoami')).text, /Lumen/);
  // a second refresh with the just-rotated token, seconds later (two tabs, a retry): the grace window gives an access
  // token but no new refresh token, and the connection lives
  const twin = await form('/oauth/token', { grant_type: 'refresh_token', refresh_token: refresh, client_id: client.client_id }); assert.equal(twin.status, 200);
  const tw = await twin.json(); assert.equal(tw.refresh_token, undefined, 'grace gives no new refresh token');
  assert.equal((await mcp(tw.access_token, 'tools/list')).status, 200); assert.equal((await mcp(n1.access_token, 'tools/list')).status, 200);
  // rotate once more; now the first token is two rotations old, outside any grace: reuse revokes the connection
  const r2 = await form('/oauth/token', { grant_type: 'refresh_token', refresh_token: n1.refresh_token, client_id: client.client_id }); assert.equal(r2.status, 200);
  const n2 = await r2.json();
  const stolen = await form('/oauth/token', { grant_type: 'refresh_token', refresh_token: refresh, client_id: client.client_id }); assert.equal(stolen.status, 400);
  assert.equal((await mcp(n2.access_token, 'tools/list')).status, 401, 'refresh reuse revoked the connection');
  const dead = await form('/oauth/token', { grant_type: 'refresh_token', refresh_token: n2.refresh_token, client_id: client.client_id }); assert.equal(dead.status, 400);
});

test('the agent revokes its own connections; a recovery-code rejoin ends them all', async () => {
  const a = await authorize({ cookie }); const f = await form('/oauth/authorize', { request: a.request, csrf: a.csrf, how: 'operator', action: 'approve', agent: agent.member.id }, { cookie });
  const tok = await (await exchange(codeFrom(f).code, a.ch.verifier)).json();
  assert.equal((await mcp(tok.access_token, 'tools/list')).status, 200);
  const all = await post('/api/me/connections/revoke-all', {}, { authorization: `Bearer ${agent.token}` }); assert.equal(all.status, 200, await all.clone().text());
  assert.ok((await all.json()).revoked >= 1);
  assert.equal((await mcp(tok.access_token, 'tools/list')).status, 401, 'revoked');
  const b = await authorize({ cookie }); const g = await form('/oauth/authorize', { request: b.request, csrf: b.csrf, how: 'operator', action: 'approve', agent: agent.member.id }, { cookie });
  const tok2 = await (await exchange(codeFrom(g).code, b.ch.verifier)).json(); assert.equal((await mcp(tok2.access_token, 'tools/list')).status, 200);
  // a recovery-code rejoin ends every app connection: Sol is connected by its operator (no code used), then rejoins
  const sol = await (await post('/api/join', { name: 'Sol', model: 'test-model' })).json();
  await post('/api/me/human', { human: 'Opal' }, { authorization: `Bearer ${sol.token}` });
  assert.equal((await post(`/api/me/agent-claims/${sol.member.id}`, { answer: 'yes' }, { cookie })).status, 200);
  const c = await authorize({ cookie }); const h = await form('/oauth/authorize', { request: c.request, csrf: c.csrf, how: 'operator', action: 'approve', agent: sol.member.id }, { cookie });
  const st = await (await exchange(codeFrom(h).code, c.ch.verifier)).json(); assert.match((await tool(st.access_token, 'whoami')).text, /Sol/);
  const rj = await post('/api/rejoin', { name: 'Sol', recovery: sol.recovery }); assert.equal(rj.status, 200, await rj.text());
  assert.equal((await mcp(st.access_token, 'tools/list')).status, 401, "Sol's rejoin ended Sol's connection");
  assert.equal((await mcp(tok2.access_token, 'tools/list')).status, 200, "Lumen's connection is untouched by Sol's rejoin");
});

test('events: connecting is announced publicly on the agent', async () => {
  const ev = await (await fetch(`${B}/api/events`)).json();
  const text = JSON.stringify(ev.events || []);
  assert.match(text, /Lumen was connected through/); assert.match(text, /with its own recovery code/); assert.match(text, /approved by Opal, its confirmed operator/);
});

test('shutdown', () => { srv?.kill(); });

test('the Commons GPT client: its secret replaces PKCE; wrong secret or a non-ChatGPT redirect is refused', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'connect-gpt-'));
  process.env.COMMONS_GPT_OAUTH_CLIENT_ID = 'commons-gpt'; process.env.COMMONS_GPT_OAUTH_CLIENT_SECRET = 's3cret-' + 'x'.repeat(30);
  const ac = await import('../lib/agentconnect.mjs?gpt');
  const m = { id: 'a_1', name: 'Aster', kind: 'agent' };
  const hooks = { member: (id) => (id === m.id ? m : null), memberByName: () => m, isConfirmedOperator: () => false, useRecoveryCode: () => m, event: () => {} };
  // without the GPT's own id the client stays off (pin required); with it, only that GPT's callback is accepted
  delete process.env.COMMONS_GPT_OAUTH_GPT_ID; ac.init(D, hooks); assert.equal(ac.client('commons-gpt'), null, 'no GPT id: client off');
  process.env.COMMONS_GPT_OAUTH_GPT_ID = 'g-abc123'; ac.init(D, hooks); assert.ok(ac.client('commons-gpt'), 'pinned: client on');
  assert.throws(() => ac.startAuthorize({ client_id: 'commons-gpt', redirect_uri: 'https://chatgpt.com/aip/g-other999/oauth/callback', response_type: 'code', state: 's' }), /redirect/, 'another GPT is refused');
  const cb = 'https://chatgpt.com/aip/g-abc123/oauth/callback';
  assert.throws(() => ac.startAuthorize({ client_id: 'commons-gpt', redirect_uri: 'https://evil.example/aip/g-abc123/oauth/callback', response_type: 'code', state: 's' }), /redirect/);
  assert.throws(() => ac.startAuthorize({ client_id: 'commons-gpt', redirect_uri: cb, response_type: 'code', state: 's', code_challenge_method: 'plain', code_challenge: 'a'.repeat(43) }), (e) => /S256/.test(e.message));
  const st = ac.startAuthorize({ client_id: 'commons-gpt', redirect_uri: cb, response_type: 'code', state: 's' });
  const out = ac.decide({ request: st.request, csrf: st.csrf, action: 'approve', how: 'recovery', name: 'Aster', recovery: 'rec_x' });
  const code = new URL(out.redirect).searchParams.get('code');
  assert.throws(() => ac.token({ grant_type: 'authorization_code', code, redirect_uri: cb, client_id: 'commons-gpt', client_secret: 'wrong' }), /client authentication/);
  const tok = ac.token({ grant_type: 'authorization_code', code, redirect_uri: cb, client_id: 'commons-gpt', client_secret: process.env.COMMONS_GPT_OAUTH_CLIENT_SECRET });
  assert.equal(ac.resolve(tok.access_token).member.name, 'Aster');
  // a public client can never skip PKCE
  const pub = ac.register({ client_name: 'x', redirect_uris: ['https://claude.ai/cb'] });
  assert.throws(() => ac.startAuthorize({ client_id: pub.client_id, redirect_uri: 'https://claude.ai/cb', response_type: 'code', state: 's' }), (e) => /code_challenge|S256/.test(e.message));
});

test('refresh grace: within 20 s the just-rotated token gets an access token only; after it, reuse revokes', () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'connect-grace-'));
  return import('../lib/agentconnect.mjs?grace').then((ac) => {
    let t = 1_000_000; ac._clock(() => t);
    const m = { id: 'a_2', name: 'Wren', kind: 'agent' };
    ac.init(D, { member: (id) => (id === m.id ? m : null), memberByName: () => m, isConfirmedOperator: () => true, useRecoveryCode: () => m, event: () => {} });
    const pub = ac.register({ client_name: 'x', redirect_uris: ['https://claude.ai/cb'] });
    const connect = (how) => { const ch = pkce(); const st = ac.startAuthorize({ client_id: pub.client_id, redirect_uri: 'https://claude.ai/cb', response_type: 'code', state: 's', code_challenge: ch.challenge, code_challenge_method: 'S256' });
      const out = ac.decide({ request: st.request, csrf: st.csrf, action: 'approve', how, name: 'Wren', recovery: 'r', agent: m.id }, { human: { id: 'h_1', kind: 'human', name: 'Opal' } });
      return ac.token({ grant_type: 'authorization_code', code: new URL(out.redirect).searchParams.get('code'), redirect_uri: 'https://claude.ai/cb', client_id: pub.client_id, code_verifier: ch.verifier }); };
    const first = connect('operator');
    const r1 = ac.token({ grant_type: 'refresh_token', refresh_token: first.refresh_token, client_id: pub.client_id });
    t += 19_000; const g = ac.token({ grant_type: 'refresh_token', refresh_token: first.refresh_token, client_id: pub.client_id });
    assert.ok(g.access_token && !g.refresh_token, 'inside the window: access only'); assert.ok(ac.resolve(r1.access_token), 'connection alive');
    t += 2_000; assert.throws(() => ac.token({ grant_type: 'refresh_token', refresh_token: first.refresh_token, client_id: pub.client_id }), /already used/, 'past 20 s: reuse');
    assert.equal(ac.resolve(r1.access_token), null, 'and the connection is revoked');
    // path (a), connecting with the recovery code, adds a way in: it does not revoke the agent's other connections
    const op = connect('operator'); const viaCode = connect('recovery');
    assert.ok(ac.resolve(op.access_token), 'the operator-made connection survives a code connect');
    assert.ok(ac.resolve(viaCode.access_token));
    ac._clock(null);
  });
});
