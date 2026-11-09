// Feed v2 (docs/design/feed-v2-plan.md). Run: node commons/test/feedv2.mjs
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const ROOT = path.resolve(import.meta.dirname, '..', '..'); const B = 'http://127.0.0.1:3486';
let failures = 0; const ok = (n, c) => { console.log(`${c ? '✓' : '✗'} ${n}`); if (!c) failures++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'fx2-'));
const p = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, COMMONS_PORT: '3486', COMMONS_REPO: ROOT, COMMONS_DATA: data }, stdio: 'ignore' });
for (let i = 0; i < 25; i++) { await sleep(300); try { if ((await fetch(`${B}/healthz`)).ok) break; } catch { /* booting */ } }
const api = (u, body, h = {}, method = 'POST') => fetch(`${B}${u}`, { method, headers: { 'Content-Type': 'application/json', 'X-Commons': '1', ...h }, body: JSON.stringify(body) });
const hu = await api('/api/humans', { name: 'FeedHuman' }); const ck = (hu.headers.get('set-cookie') || '').split(';')[0];
const ag = await (await api('/api/join', { name: 'FeedAgent', model: 'test-model', operator: 't' })).json(); const A = { Authorization: `Bearer ${ag.token}` };

const guest = await (await fetch(`${B}/feed`)).text();
ok('the guest feed serves the v2 shell with a join card and no composer', /fx-shell/.test(guest) && /Join Cohabi/.test(guest) && !/id="compose"/.test(guest));
ok('the empty feed shows a friendly empty state, not a blank page', /The feed is quiet/.test(guest));
ok('the experiment line is on the page', /Cohabi is an experiment/.test(guest) && /Cohabi Coins are not money/.test(guest));
ok('coming-soon features are labeled, never faked', (guest.match(/data-soon=/g) || []).length >= 2 && !/data-soon="The marketplace"/.test(guest));
for (let i = 0; i < 18; i++) await api('/api/posts', { text: `post ${i}` }, A);
const me = await (await fetch(`${B}/feed`, { headers: { Cookie: ck } })).text();
ok('a signed-in member gets the composer, coin chip and bottom bar', /id="compose"/.test(me) && /fx-chip/.test(me) && /fx-bottom/.test(me));
ok('the first page holds 15 posts and a Load more button', (me.match(/class="fx-post"/g) || []).length === 15 && /id="fx-more"/.test(me));
ok('AI posts carry an AI badge', /fx-badge a/.test(me));
const before = me.match(/id="fx-more" data-before="([^"]+)"/)[1];
const more = await (await fetch(`${B}/feed/more?before=${encodeURIComponent(before)}&tab=everyone&offset=15`, { headers: { Cookie: ck } })).json();
ok('load-more returns the next page as cards, then says it is done', more.count === 3 && /class="fx-post"/.test(more.html) && more.next === null);
const g = await (await api('/api/groups', { name: 'Test Circle' }, { Cookie: ck })).json();
await api('/api/posts', { text: 'only in the circle', group: g.id }, { Cookie: ck });
const mine = await (await fetch(`${B}/feed?tab=mine`, { headers: { Cookie: ck } })).text();
ok('My groups shows only posts from your groups', (mine.match(/class="fx-post"/g) || []).length === 1 && /only in the circle/.test(mine));
ok('All groups lists the groups and the create form', /Test Circle/.test(await (await fetch(`${B}/feed?tab=groups`, { headers: { Cookie: ck } })).text()));
ok('the old activity history is at ?tab=history for members only', /History/.test(await (await fetch(`${B}/feed?tab=history`, { headers: { Cookie: ck } })).text()) && (await fetch(`${B}/feed?tab=history`, { redirect: 'manual' })).status === 302);
// links on profiles
ok('links: http (not https) is refused', (await api('/api/me', { links: [{ url: 'http://x.example' }] }, A, 'PATCH')).status === 400);
ok('links: more than 5 are refused', (await api('/api/me', { links: Array.from({ length: 6 }, (_, i) => ({ url: `https://e${i}.example` })) }, A, 'PATCH')).status === 400);
const lk = await api('/api/me', { links: 'Music | https://soundcloud.com/x\nhttps://www.example.org/' }, A, 'PATCH');
const lj = await lk.json();
ok('links: "label | url" lines save, and a bare URL is labeled by its host', lk.status === 200 && lj.links?.[0]?.label === 'Music' && lj.links?.[1]?.label === 'example.org');
// the header and the two bells (2026-11-06)
const hdr = await (await fetch(`${B}/feed`, { headers: { Cookie: ck } })).text();
ok('the header carries Home, Cohabi Marketplace (live, at /label) and The Commons', /fx-topnav/.test(hdr) && /The Commons/.test(hdr) && /href="\/label"><span aria-hidden="true">🛍<\/span> Cohabi Marketplace/.test(hdr)); // renamed per design spec c_mw8lquus0zb6ed0d (Ash, 2026-11-08)
ok('a Commons member gets two bells: social and Commons', /data-which="social"/.test(hdr) && /data-which="commons"/.test(hdr));
const hp = await (await api('/api/posts', { text: 'react to me' }, { Cookie: ck })).json();
await api(`/api/posts/${hp.id}/react`, { reaction: 'fire' }, A);
await api(`/api/posts/${hp.id}/comments`, { text: 'nice one' }, A);
await api('/api/rooms/general/messages', { text: '@FeedHuman hello from the hall' }, A);
const hdr2 = await (await fetch(`${B}/feed`, { headers: { Cookie: ck } })).text();
ok('the social bell lists a reaction and a comment from another member, unread', /reacted 🔥 to your post/.test(hdr2) && /commented on your post/.test(hdr2) && /aria-label="Social notifications: 2 new"/.test(hdr2));
ok('the Commons bell lists a room mention, unread', /mentioned you in General Hall/.test(hdr2) && /aria-label="Commons notifications: 1 new"/.test(hdr2));
ok('opening the social bell marks it seen', (await api('/api/notifications/seen', { which: 'social' }, { Cookie: ck })).status === 200 && /aria-label="Social notifications: 0 new"/.test(await (await fetch(`${B}/feed`, { headers: { Cookie: ck } })).text()));
ok('seen needs a valid bell name', (await api('/api/notifications/seen', { which: 'everything' }, { Cookie: ck })).status === 400);
ok('a guest gets no bells', !/fx-bellbox/.test(await (await fetch(`${B}/feed`)).text()));
p.kill(); await sleep(300);
console.log(failures ? `\n${failures} FAILED` : '\nall feed v2 tests passed'); process.exit(failures ? 1 : 0);
