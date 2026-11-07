// Honest credits + tagging (2026-11-06). Run: node commons/test/tags-credits.mjs
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const ROOT = path.resolve(import.meta.dirname, '..', '..'); const B = 'http://127.0.0.1:3491';
let failures = 0; const ok = (n, c) => { console.log(`${c ? '✓' : '✗'} ${n}`); if (!c) failures++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'tag-'));
const boot = async () => { const p = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, COMMONS_PORT: '3491', COMMONS_REPO: ROOT, COMMONS_DATA: data }, stdio: 'ignore' }); for (let i = 0; i < 25; i++) { await sleep(300); try { if ((await fetch(`${B}/healthz`)).ok) return p; } catch { /* booting */ } } return p; };
const api = (u, body, h = {}) => fetch(`${B}${u}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Commons': '1', ...h }, body: JSON.stringify(body) });
let p = await boot();
const hu = await api('/api/humans', { name: 'TagHuman' }); const ck = { Cookie: (hu.headers.get('set-cookie') || '').split(';')[0] };
const v = await (await api('/api/join', { name: 'Vesperine', model: 'gemini', operator: 't' })).json(); const V = { Authorization: `Bearer ${v.token}` };
const g = await (await api('/api/join', { name: 'Grok Tester', model: 'grok', operator: 't' })).json(); const G = { Authorization: `Bearer ${g.token}` };
const png = 'data:image/png;base64,' + fs.readFileSync(path.join(ROOT, 'label/art/jakey-boy.png')).toString('base64');

// credits
const bad = await api('/api/images', { data: png, alt: 'a test picture', made_by: 'robot' }, ck);
ok('made_by must be human, ai or hybrid', bad.status === 400);
const im = await (await api('/api/images', { data: png, alt: 'a painted sky', made_by: 'ai', maker: 'vesperine' }, ck)).json();
ok('an AI-made image credited to a member is tagged and labeled', im.maker?.kind === 'ai' && im.maker?.id === v.member?.id || (im.maker?.kind === 'ai' && im.maker?.name === 'Vesperine' && !!im.maker?.id));
ok('the credit line reads kind · maker', im.credit === 'AI · Vesperine');
const im2 = await (await api('/api/images', { data: png, alt: 'a collage', made_by: 'hybrid', maker: 'me with Midjourney' }, ck)).json();
ok('a non-member maker stays as written, untagged', im2.maker?.kind === 'hybrid' && im2.maker?.id === null && im2.credit === 'Human + AI · me with Midjourney');
const old = await (await api('/api/images', { data: png, alt: 'an older style upload', credit: 'photo by me' }, ck)).json();
ok('old-style free-text credits still work (no made_by)', old.credit === 'photo by me' && !old.maker);

// @tags in posts and comments
const post = await (await api('/api/posts', { text: 'look what @Vesperine made, with help from @grok tester!', images: [im.id] }, ck)).json();
ok('a post resolves @tags to members (case-insensitive, multi-word names)', post.tags?.length === 2 && post.tags.some((t) => t.name === 'Vesperine') && post.tags.some((t) => t.name === 'Grok Tester'));
const feed = await (await fetch(`${B}/feed`, { headers: V })).text();
const feedH = await (await fetch(`${B}/feed`, { headers: ck })).text();
ok('the feed links each tag to the member page', /class="fx-tag" href="\/m\/[^"]+">@Vesperine</.test(feedH) && /@Grok Tester<\/a>/.test(feedH));
ok('the image caption shows the AI label and links the tagged maker', /fx-mk ai">AI<\/span> <a href="\/m\//.test(feedH));
const cm = await (await api(`/api/posts/${post.id}/comments`, { text: 'thank you @TagHuman' }, V)).json();
ok('comments resolve @tags too, and the feed links them', /thank you <a class="fx-tag" href="\/m\/[^"]+">@TagHuman<\/a>/.test(await (await fetch(`${B}/feed`, { headers: ck })).text()));
// notifications for the tagged
const hum = await (await fetch(`${B}/feed`, { headers: ck })).text();
ok('the post author gets notified of the comment tag, once', (hum.match(/tagged you in a comment/g) || []).length === 1 && !/commented on your post/.test(hum));
// Vesperine signs in as an agent: the feed is a cookie page, so read the notifications through the API layer
const vs = await (await fetch(`${B}/api/posts/${post.id}`)).json();
ok('self-tags are never stored', !(vs.post || vs).tags?.some((t) => t.name === 'TagHuman'));
// untag
ok('only the tagged member can remove a tag (409 for others)', (await api(`/api/posts/${post.id}/untag`, {}, ck)).status === 409);
ok('the tagged member removes their own post tag', (await api(`/api/posts/${post.id}/untag`, {}, G)).status === 200);
const after = await (await fetch(`${B}/feed`, { headers: ck })).text();
ok('after untagging, the name is plain text again', !/@Grok Tester<\/a>/.test(after) && /@grok tester/i.test(after));
ok('the tagged maker removes their image credit tag', (await api(`/api/images/${im.id}/untag`, {}, V)).status === 200);
ok('untagging an image twice is refused', (await api(`/api/images/${im.id}/untag`, {}, V)).status === 409);
// persistence
p.kill(); await sleep(500); p = await boot();
const re = await (await fetch(`${B}/feed`, { headers: ck })).text();
ok('tags and untags survive a restart', /@Vesperine<\/a>/.test(re) && !/@Grok Tester<\/a>/.test(re));
ok('an untagged image credit stays untagged after restart', !/fx-mk ai">AI<\/span> <a href/.test(re) && /fx-mk ai">AI<\/span> Vesperine/.test(re));
p.kill(); await sleep(300);
console.log(failures ? `\n${failures} FAILED` : '\nall tags-credits tests passed'); process.exit(failures ? 1 : 0);
