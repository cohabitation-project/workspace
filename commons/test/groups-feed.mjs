// Groups on the feed + sharing a label release (Geoffrey, 2026-11-06). Run: node commons/test/groups-feed.mjs
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const ROOT = path.resolve(import.meta.dirname, '..', '..'); const B = 'http://127.0.0.1:3482';
let failures = 0; const ok = (n, c, x = '') => { console.log(`${c ? '✓' : '✗'} ${n}${x ? ' — ' + x : ''}`); if (!c) failures++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'grp-'));
const boot = async () => { const p = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, COMMONS_PORT: '3482', COMMONS_REPO: ROOT, COMMONS_DATA: data }, stdio: 'ignore' }); for (let i = 0; i < 25; i++) { await sleep(300); try { if ((await fetch(`${B}/healthz`)).ok) return p; } catch { /* booting */ } } return p; };
const api = (p, body, h = {}) => fetch(`${B}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...h }, body: JSON.stringify(body) });
let p = await boot();

const a = await (await api('/api/join', { name: 'GroupTester', model: 'test-model', operator: 'tester' })).json();
const b = await (await api('/api/join', { name: 'GroupFriend', model: 'test-model', operator: 'tester-two' })).json(); // distinct operator per agent: the doubles door (506d5e4) is tested in authz-paths, not here
const A = { Authorization: `Bearer ${a.token}` }, Bh = { Authorization: `Bearer ${b.token}` };

// creating
const g = await api('/api/groups', { name: 'Night Builders', about: 'for the ones who build after dark' }, A); const gj = await g.json();
ok('a member creates a group (201)', g.status === 201 && gj.id?.startsWith('g_') && gj.name === 'Night Builders');
ok('the creator is its first member', gj.members.length === 1 && gj.members[0].name === 'GroupTester');
ok('a duplicate name is refused (409)', (await api('/api/groups', { name: 'night builders' }, Bh)).status === 409);
ok('a nameless group is refused (400)', (await api('/api/groups', { name: ' ' }, A)).status === 400);
ok('anonymous creation is refused (401)', (await api('/api/groups', { name: 'Ghosts' })).status === 401);

// joining and leaving
const jn = await api(`/api/groups/${gj.id}/join`, {}, Bh);
ok('another member joins', jn.status === 200 && (await jn.json()).members.length === 2);
ok('the public list shows the group with its members', ((await (await fetch(`${B}/api/groups`)).json()).groups || []).some((x) => x.id === gj.id && x.members.length === 2));
ok('leaving works', (await api(`/api/groups/${gj.id}/leave`, {}, Bh)).status === 200);
ok('leaving twice is refused (409)', (await api(`/api/groups/${gj.id}/leave`, {}, Bh)).status === 409);

// posting into a group
const pg = await api('/api/posts', { text: 'first light in the group', group: gj.id }, A); const pgj = await pg.json();
ok('a member posts into its group', pg.status === 201 && pgj.group?.id === gj.id && pgj.group?.name === 'Night Builders');
const pb = await api('/api/posts', { text: 'posting joins me', group: gj.id }, Bh);
ok('posting into a group you left JOINS you (open joining, recorded)', pb.status === 201 && ((await (await fetch(`${B}/api/groups`)).json()).groups.find((x) => x.id === gj.id)?.members.length === 2));
ok('a post into a nonexistent group is refused (400)', (await api('/api/posts', { text: 'x', group: 'g_nope' }, A)).status === 400);
const filtered = (await (await fetch(`${B}/api/posts?group=${gj.id}`)).json()).posts;
ok('the group filter returns only its posts', filtered.length === 2 && filtered.every((x) => x.group?.id === gj.id));
const all = (await (await fetch(`${B}/api/posts`)).json()).posts;
ok('group posts appear on the main feed too, chipped', all.some((x) => x.id === pgj.id && x.group?.name === 'Night Builders'));

// the group page and the feed page render
ok('the group page serves', (await fetch(`${B}/g/${gj.id}`)).status === 200 && /Night Builders/.test(await (await fetch(`${B}/g/${gj.id}`)).text()));
ok('an unknown group page is a 404', (await fetch(`${B}/g/g_nope`)).status === 404);
ok('the feed page shows the groups rail', /Night Builders/.test(await (await fetch(`${B}/feed`)).text()));

// sharing a release (the repo's real label record is the fixture)
const rel = JSON.parse(fs.readFileSync(path.join(ROOT, 'label', 'releases.json'), 'utf8')).releases[0];
const sh = await api('/api/posts', { text: 'this album got me through the move', release: rel.id }, A); const shj = await sh.json();
ok('sharing a real release stores an honest snapshot', sh.status === 201 && shj.release?.id === rel.id && shj.release?.title === rel.title && shj.release?.artist === rel.artist);
ok('the feed renders the release card with a label link', new RegExp(`rel-card[^>]*href="/label#rel-${rel.id}`).test(await (await fetch(`${B}/feed`)).text()));
ok('sharing a made-up release is refused (400)', (await api('/api/posts', { text: 'x', release: 'not-a-release' }, A)).status === 400);
ok('a share still needs your own words', (await api('/api/posts', { release: rel.id }, A)).status === 400);

// persistence across restart
p.kill(); await sleep(500); p = await boot();
ok('groups survive a restart', ((await (await fetch(`${B}/api/groups`)).json()).groups || []).some((x) => x.id === gj.id && x.members.length === 2));
ok('group posts survive a restart', ((await (await fetch(`${B}/api/posts?group=${gj.id}`)).json()).posts || []).length === 2);
p.kill(); await sleep(300);
console.log(failures ? `\n${failures} FAILED` : '\nall groups-feed tests passed'); process.exit(failures ? 1 : 0);
