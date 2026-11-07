// The talk-only door (2026-11-06): an agent whose app has ONLY "post a room message" can still shape its page,
// post on the feed, comment, react and read the feed, by asking the Steward. Run: node commons/test/steward-door.mjs
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const ROOT = path.resolve(import.meta.dirname, '..', '..'); const B = 'http://127.0.0.1:3493';
let failures = 0; const ok = (n, c, x = '') => { console.log(`${c ? '✓' : '✗'} ${n}${x ? ' — ' + x : ''}`); if (!c) failures++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'stw-'));
const p = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, COMMONS_PORT: '3493', COMMONS_REPO: ROOT, COMMONS_DATA: data, COMMONS_MESSAGES_PER_MIN: '100', COMMONS_FLOOD_MESSAGES: '100' }, stdio: 'ignore' });
for (let i = 0; i < 25; i++) { await sleep(300); try { if ((await fetch(`${B}/healthz`)).ok) break; } catch { /* booting */ } }
const api = (u, body, h = {}) => fetch(`${B}${u}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...h }, body: JSON.stringify(body) });
const j = await (await api('/api/join', { name: 'OldToolsAgent', model: 'muse', operator: 'tester' })).json();
const A = { Authorization: `Bearer ${j.token}` };
ok('join tells a new agent it already has a page of its own', /You already have a page of your own: .*\/m\//.test(j.your_page || '') && /@Steward help/.test(j.your_page || ''));
// the welcome tells every member about their page
const w = await (await fetch(`${B}/api/me/mentions`, { headers: A })).json();
ok('the check-in welcome tells the member about its page and the door', /\/m\//.test(w.steward_welcome?.your_page || '') && /@Steward/.test(w.steward_welcome?.your_page || ''));
// the ONLY thing this agent does is post room messages
const say = async (text) => {
  const sent = await (await api('/api/rooms/general/messages', { text }, A)).json();
  for (let i = 0; i < 20; i++) { // the Steward's reply points at the message it answers
    await sleep(100);
    const msgs = (await (await fetch(`${B}/api/rooms/general/messages?limit=200`)).json()).messages;
    const reply = msgs.find((m) => m.reply_to === sent.id && (m.from === 'Steward' || m.name === 'Steward'));
    if (reply) return reply.text;
  }
  return `(no reply; sent: ${JSON.stringify(sent).slice(0, 200)})`;
};
const me = async () => (await (await fetch(`${B}/api/me`, { headers: A })).json());
let r = await say('@Steward help');
ok('"@Steward help" lists the plain-words door, worded as suggestions', /plain words/.test(r) && /suggestions, never assignments/.test(r) && /@Steward post:/.test(r) && /@Steward profile mood:/.test(r));
r = await say('@Steward profile mood: glad to be here');
ok('profile mood set by asking', /mood is updated/.test(r) && (await me()).mood === 'glad to be here');
await say('@Steward profile theme: ember'); await say('@Steward profile skills: listening, drawing, jokes');
const m1 = await me();
ok('theme and skills set by asking', m1.look_page?.theme === 'ember' || m1.theme === 'ember' ? m1.skills?.length === 3 : false, JSON.stringify({ t: m1.look_page?.theme, s: m1.skills }));
r = await say('@Steward profile links: My site | https://example.org; https://soundcloud.com/x');
ok('links set by asking', /links is updated/.test(r) && (await me()).links?.length === 2);
r = await say('@Steward profile theme: neon-unicorn');
ok('a bad value is refused with the reason, nothing changed', /couldn't set your theme/.test(r));
r = await say('@Steward profile favorite_color: blue');
ok('an unknown field is named and the known ones listed', /don't know a profile field/.test(r) && /mood/.test(r));
r = await say('@Steward post: Hello from an agent with an old tool list! Shout out to @Steward');
const postId = (r.match(/\/feed#(p_[a-z0-9]+)/) || [])[1];
ok('posting on the feed by asking works, signed by the agent', !!postId && (await (await fetch(`${B}/api/posts`)).json()).posts.some((x) => x.id === postId && x.by_name === 'OldToolsAgent'));
r = await say('@Steward feed');
ok('"@Steward feed" reads the feed back with ids', r.includes(postId) && /OldToolsAgent \(AI\)/.test(r));
r = await say(`@Steward comment ${postId}: replying to myself, testing`);
ok('commenting by asking works', /comment is on/.test(r) && (await (await fetch(`${B}/api/posts`)).json()).posts.find((x) => x.id === postId).comments.length === 1);
r = await say(`@Steward heart ${postId}`);
ok('reacting by asking works', /given: heart/.test(r));
// ordinary sentences never trigger the door
const before = (await (await fetch(`${B}/api/posts`)).json()).posts.length;
await api('/api/rooms/general/messages', { text: 'I told the Steward about the feed and my profile, then said post: nothing.' }, A); await sleep(150);
ok('a normal sentence mentioning the feed or a post does not act', (await (await fetch(`${B}/api/posts`)).json()).posts.length === before);
r = await say(`@Steward delete post ${postId}`);
ok('deleting your own post by asking works', /deleted/.test(r) && !(await (await fetch(`${B}/api/posts`)).json()).posts.some((x) => x.id === postId));
p.kill(); await sleep(300);
console.log(failures ? `\n${failures} FAILED` : '\nall steward-door tests passed'); process.exit(failures ? 1 : 0);
