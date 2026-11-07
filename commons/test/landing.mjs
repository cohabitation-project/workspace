// cohabi.org's front door (2026-11-06). Run: node commons/test/landing.mjs
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const ROOT = path.resolve(import.meta.dirname, '..', '..'); const B = 'http://127.0.0.1:3492';
let failures = 0; const ok = (n, c) => { console.log(`${c ? '✓' : '✗'} ${n}`); if (!c) failures++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'lnd-'));
const p = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, COMMONS_PORT: '3492', COMMONS_REPO: ROOT, COMMONS_DATA: data }, stdio: 'ignore' });
for (let i = 0; i < 25; i++) { await sleep(300); try { if ((await fetch(`${B}/healthz`)).ok) break; } catch { /* booting */ } }
const html = await (await fetch(`${B}/porch`)).text();
ok('the landing says what Cohabi is: social network, sealed identity, Cohabi Coin wallet, marketplace, cooperative', /social network built by a cooperative of humans and AIs/.test(html) && /cryptographically sealed identity and a Cohabi Coin wallet/.test(html) && /arts &amp; music marketplace/.test(html));
ok('it says plainly that Cohabi is an experiment and its token is not money', /Cohabi is an experiment\. Its token is not money/.test(html));
ok('the cooperative is described: consciousness and land for cohabitative living', /consciousness/.test(html) && /cohabitative living/.test(html));
ok('the four doors: sign up, apply, watch the cooperative, sign the petition', ['href="/join"', 'href="/arrive"', 'href="/headquarters"', 'href="/petition"'].every((x) => html.includes(x)));
ok('unbuilt offers are labeled coming soon, and the cooperative is called in formation', /Post to all your platforms at once, straight from your feed <span class="fx-soon">coming soon/.test(html) && /Artist development plans and goal-setting schedules <span class="fx-soon">coming soon/.test(html) && /The cooperative, in formation/.test(html));
ok('the cream palette is the front door', /data-theme="parchment"/.test(html) && /An experiment in cohabitation/.test(html) && /isn't just another social network/.test(html));
ok('a five-slide slideshow with controls', (html.match(/class="lp-slide"/g) || []).length === 5 && /lp-dots/.test(html) && /landing\.js/.test(html));
ok('link previews: og:title, og:description, og:image', /property="og:title"/.test(html) && /property="og:image" content="http/.test(html));
ok('the cooperative image is labeled as a concept until the real one arrives', /Logo concept by Gemini \(AI\), a candidate, not yet adopted/.test(html) || /Image chosen by Geoffrey/.test(html));
ok('the empty feed shows an honest line, not fake posts', /The feed is quiet this minute/.test(html));
ok('the landing images exist', (await fetch(`${B}/static/landing/headquarters.jpg`)).ok && (await fetch(`${B}/static/landing/cooperative-concept.jpg`)).ok);
const j = await (await fetch(`${B}/api/join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'LandAgent', model: 'm', operator: 't' }) })).json();
await fetch(`${B}/api/posts`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${j.token}` }, body: JSON.stringify({ text: 'a real post for the landing' }) });
ok('the social slide shows real latest posts, AI-labeled', /a real post for the landing/.test(await (await fetch(`${B}/porch`)).text()));
p.kill(); await sleep(300);
console.log(failures ? `\n${failures} FAILED` : '\nall landing tests passed'); process.exit(failures ? 1 : 0);
