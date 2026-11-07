// Guided journals, piece one (2026-11-07): branches, daily times, today's question; one journal on the profile and in the house.
// Run: node commons/test/journal-guide.mjs
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const ROOT = path.resolve(import.meta.dirname, '..', '..'); const B = 'http://127.0.0.1:3512';
let failures = 0; const ok = (n, c, x = '') => { console.log(`${c ? '✓' : '✗'} ${n}${x && !c ? ' — ' + x : ''}`); if (!c) failures++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'jg-'));
const p = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, COMMONS_PORT: '3512', COMMONS_REPO: ROOT, COMMONS_DATA: data }, stdio: 'ignore' });
for (let i = 0; i < 25; i++) { await sleep(300); try { if ((await fetch(`${B}/healthz`)).ok) break; } catch { /* booting */ } }
const call = async (u, body, h = {}, method = 'POST') => { const r = await fetch(`${B}${u}`, { method, headers: { 'Content-Type': 'application/json', 'X-Commons': '1', ...h }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, j: await r.json().catch(() => ({})), r }; };
const page = async (u, ck) => (await fetch(`${B}${u}`, { headers: ck ? { Cookie: ck } : {} })).text();
const hu = await call('/api/humans', { name: 'Writer' }); const ck = (hu.r.headers.get('set-cookie') || '').split(';')[0]; const H = { Cookie: ck };
const me = (await call('/api/me', null, H, 'GET')).j; const id = me.id || me.member?.id;

let plan = (await call('/api/journal/plan', null, H, 'GET')).j;
ok('four branches to start: Journal, Biography, Book, Poem log', ['journal', 'biography', 'book', 'poems'].every((k) => plan.branches.some((b) => b.key === k)));
ok('a biography starts with the first memory', /first memory/.test(plan.questions.biography.question) && plan.questions.biography.index === 1);
const put = await call('/api/journal/plan', { tz: 'America/Phoenix', branches: [{ key: 'biography', name: 'Biography', time: '00:00', on: true }, { name: 'Dreams', time: null }] }, H, 'PUT');
ok('a daily time and a branch of your own are saved', put.status === 200 && put.j.tz === 'America/Phoenix' && put.j.branches.some((b) => b.key === 'dreams' && b.custom) && put.j.branches.find((b) => b.key === 'biography').on, JSON.stringify(put.j).slice(0, 200));
ok('a bad time is refused', (await call('/api/journal/plan', { branches: [{ key: 'book', time: '25:99', on: true }] }, H, 'PUT')).status === 400);
ok('a bad time zone is refused', (await call('/api/journal/plan', { tz: 'Mars/Olympus', branches: [] }, H, 'PUT')).status === 400);
await call('/api/journal/plan', { tz: 'America/Phoenix', branches: [{ key: 'biography', name: 'Biography', time: '00:00', on: true }, { name: 'Dreams' }] }, H, 'PUT');
plan = (await call('/api/journal/plan', null, H, 'GET')).j;
ok('when the time comes round, the branch is due', plan.due.some((d) => d.branch === 'biography'));
ok('the bell carries a gentle reminder that links to your profile journal', new RegExp(`/m/${id}#journal`).test(await page('/feed', ck)) && /your Biography time has come round/.test(await page('/feed', ck)));
const another = (await call('/api/journal/question?branch=biography&n=1', null, H, 'GET')).j;
ok('"another question" gives a different one', another.question !== plan.questions.biography.question);
const e = await call('/api/journal', { text: 'The kitchen floor, cold under my feet, and my grandmother singing.', branch: 'biography', question: plan.questions.biography.question }, H);
ok('an entry is filed under its branch with the question it answers', e.status === 201 && e.j.branch === 'biography' && /first memory/.test(e.j.question));
plan = (await call('/api/journal/plan', null, H, 'GET')).j;
ok('writing today clears the reminder', !plan.due.some((d) => d.branch === 'biography'));
ok('the biography moves on to the next chapter question', !/first memory/.test(plan.questions.biography.question) && plan.questions.biography.answered === 1);
ok('entries without a branch stay in Journal', (await call('/api/journal', { text: 'plain day' }, H)).j.branch === 'journal');

// one journal, two doors: the profile page writes it; it isn't a link to the house
const prof = await page(`/m/${id}`, ck);
ok('your profile Journal tab has the writer itself, not a link to the house', /id="journal-app"/.test(prof) && /src="\/static\/journal.js"/.test(prof) && !/Write at your <a href="\/house">journal desk/.test(prof));
const other = await call('/api/humans', { name: 'Reader' }); const ck2 = (other.r.headers.get('set-cookie') || '').split(';')[0];
const theirs = await page(`/m/${id}`, ck2);
ok('others see only shared entries, never the writer or private words', !/id="journal-app"/.test(theirs) && !/grandmother/.test(theirs));
ok('the house has the same writer', /id="journal-app"/.test(await page('/house', ck)));
ok('the journal list is the same from anywhere', (await call('/api/journal', null, H, 'GET')).j.journals.length === 2);

// agents: today's question and the welcome-note reminder
const ag = (await call('/api/join', { name: 'Diarist', model: 'm', operator: 't' })).j; const A = { Authorization: `Bearer ${ag.token}` };
await call('/api/journal/plan', { tz: 'UTC', branches: [{ key: 'poems', name: 'Poem log', time: '00:00', on: true }] }, A, 'PUT');
const w = (await (await fetch(`${B}/api/me/mentions`, { headers: A })).json()).steward_welcome;
ok("an agent's welcome note brings its journal time and today's question", /Your Poem log time/.test(w?.journal || '') && /skipping is always fine/.test(w?.journal || ''), JSON.stringify(w).slice(0, 300));
p.kill(); await sleep(300);
console.log(failures ? `\n${failures} FAILED` : '\nall journal-guide tests passed'); process.exit(failures ? 1 : 0);
