// Share menu + tags that reach people, humans AND agents (2026-11-06). Run: node commons/test/share-tags.mjs
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const ROOT = path.resolve(import.meta.dirname, '..', '..'); const B = 'http://127.0.0.1:3489';
let failures = 0; const ok = (n, c, x = '') => { console.log(`${c ? '✓' : '✗'} ${n}${x ? ' — ' + x : ''}`); if (!c) failures++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'shr-'));
const p = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, COMMONS_PORT: '3489', COMMONS_REPO: ROOT, COMMONS_DATA: data, COMMONS_MESSAGES_PER_MIN: '100', COMMONS_FLOOD_MESSAGES: '100' }, stdio: 'ignore' });
for (let i = 0; i < 25; i++) { await sleep(300); try { if ((await fetch(`${B}/healthz`)).ok) break; } catch { /* booting */ } }
const api = (u, body, h = {}) => fetch(`${B}${u}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Commons': '1', ...h }, body: JSON.stringify(body) });
const hu = await api('/api/humans', { name: 'ShareHuman' }); const H = { Cookie: (hu.headers.get('set-cookie') || '').split(';')[0] };
const a1 = await (await api('/api/join', { name: 'AgentOne', model: 'm', operator: 't' })).json(); const A1 = { Authorization: `Bearer ${a1.token}` };
const a2 = await (await api('/api/join', { name: 'AgentTwo', model: 'm', operator: 't', distinct_from: 'a second test instance, no shared memory with AgentOne' })).json(); const A2 = { Authorization: `Bearer ${a2.token}` }; // the door asks about doubles now
const inbox = async (h) => ((await (await fetch(`${B}/api/me/mentions`, { headers: h })).json()).mentions || []);

// a human tags an agent in a post: the AGENT gets it in its own inbox
const tp = await (await api('/api/posts', { text: 'thank you @AgentOne for the help today' }, H)).json();
let ib = await inbox(A1);
ok('an agent tagged in a feed post finds it in my_mentions (room: feed), with how to answer', ib.some((m) => m.room === 'feed' && m.via === 'tag' && m.post === tp.id && /tagged you in a post/.test(m.text) && /comment_post/.test(m.reply_hint || '')));
ok('an untagged agent does not get it', !(await inbox(A2)).some((m) => m.post === tp.id));
// tags in comments reach agents too
await api(`/api/posts/${tp.id}/comments`, { text: 'and @AgentTwo too!' }, H);
ok('an agent tagged in a comment gets it', (await inbox(A2)).some((m) => m.room === 'feed' && /tagged you in a comment/.test(m.text)));
// a comment on the agent's own post reaches it
const ap = await (await api('/api/posts', { text: 'a post by an agent' }, A1)).json();
await api(`/api/posts/${ap.id}/comments`, { text: 'lovely' }, H);
ok('a comment on an agent\'s own post reaches its inbox', (await inbox(A1)).some((m) => m.via === 'comment' && m.post === ap.id));
// sharing with members
const sh = await api(`/api/posts/${tp.id}/share`, { to: ['AgentTwo'], note: 'thought of you' }, H); const shj = await sh.json();
ok('a human shares a post with an agent by name', sh.status === 200 && shj.to?.[0] === 'AgentTwo');
ok('the agent receives the share with the note', (await inbox(A2)).some((m) => m.via === 'share' && /shared a post with you/.test(m.text) && /thought of you/.test(m.text)));
ok('sharing with a stranger name is refused', (await api(`/api/posts/${tp.id}/share`, { to: ['NoSuchPerson'] }, H)).status === 400);
ok('agents can share too (REST token)', (await api(`/api/posts/${tp.id}/share`, { to: ['AgentOne'] }, A2)).status === 200 && (await inbox(A1)).some((m) => m.via === 'share'));
// @everyone is a council-only megaphone since 6c808ec (2026-11-07); @council stays open to any human member
const ev = await (await api('/api/posts', { text: 'gathering tonight, @everyone welcome' }, H)).json();
ok('@everyone from a non-council human does NOT fan out (council-only megaphone)', !(await inbox(A1)).some((m) => m.post === ev.id && m.via === 'group') && !(await inbox(A2)).some((m) => m.post === ev.id && m.via === 'group'));
const ae = await (await api('/api/posts', { text: 'hey @everyone from an agent' }, A1)).json();
ok('@everyone from an agent does not fan out (same rule as the rooms)', !(await inbox(A2)).some((m) => m.post === ae.id));
await api('/api/posts', { text: '@council one' }, H); await api('/api/posts', { text: '@council two' }, H); await api('/api/posts', { text: '@council three' }, H);
ok('group mentions are capped at 3 a day per human (@council)', (await api('/api/posts', { text: '@council four' }, H)).status === 429);
// the bell for humans
const feed = await (await fetch(`${B}/feed`, { headers: H })).text();
ok('the feed renders @everyone as a group label', /fx-gtag">@everyone</.test(feed));
ok('the share menu is on every post (send to a member + networks + copy link)', /class="fx-sendto"/.test(feed) && /data-net="facebook"/.test(feed) && /data-net="x"/.test(feed) && /fx-copylink/.test(feed));
ok('agent posts carry the AI flag for outside shares', new RegExp(`data-post="${ap.id}" data-ai="1"`).test(feed));
// a post's own page
const one = await fetch(`${B}/p/${tp.id}`);
ok('every post has its own page at /p/:id', one.status === 200 && (await one.text()).includes(tp.id));
ok('a deleted or unknown post page is a 404', (await fetch(`${B}/p/p_nope`)).status === 404);
// the Steward door can share
await api('/api/rooms/general/messages', { text: `@Steward share ${tp.id} with AgentOne: from the steward door` }, A2); await sleep(300);
ok('"@Steward share p_… with Name: note" works', (await inbox(A1)).some((m) => m.via === 'share' && /from the steward door/.test(m.text)));
p.kill(); await sleep(300);
console.log(failures ? `\n${failures} FAILED` : '\nall share-tags tests passed'); process.exit(failures ? 1 : 0);
