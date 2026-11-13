// The coin goes to your wallet; the count sits by your face; the profile has no "Headquarters / member" line;
// the Cohabi Marketplace dropdown is the same in the social menu and the profile menu (Geoffrey, 2026-11-13).
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import net from 'node:net';
import assert from 'node:assert';
const PORT = await new Promise((r) => { const s = net.createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => r(p)); }); });
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'wl-')); const B = `http://127.0.0.1:${PORT}`;
const srv = spawn('node', ['commons/server.mjs'], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: DATA }, stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 50; i++) { try { await fetch(B + '/healthz'); break; } catch { await sleep(200); } }
const signup = async (name) => { const r = await fetch(B + '/api/humans', { method: 'POST', headers: { 'content-type': 'application/json', 'x-commons': '1' }, body: JSON.stringify({ name }) }); return { r, j: await r.json().catch(() => ({})), ck: (r.headers.get('set-cookie') || '').split(';')[0] }; };
try {
  const a = await signup('Walla'); assert.equal(a.r.status, 201);
  const id = a.j.member.id;
  const w = await (await fetch(B + '/wallet', { headers: { cookie: a.ck } })).text();
  assert.match(w, /Your Cohabi wallet/, 'the wallet page opens');
  assert.match(w, /class="wl-bal">0 /, 'it shows the real balance');
  assert.match(w, /Buy coins \(coming later\)/, 'buying is shown, closed');
  assert.match(w, /<button type="button" class="btn" disabled>/, 'the buy button does nothing');
  assert.match(w, /<a class="fx-coin" href="\/wallet" aria-current="page"/, 'the middle coin goes to the wallet');
  const out = await (await fetch(B + '/wallet')).text();
  assert.match(out, /Sign in to see your coins/, 'a visitor is asked to sign in');
  const feed = await (await fetch(B + '/feed', { headers: { cookie: a.ck } })).text();
  const topr = feed.slice(feed.indexOf('<div class="fx-topr">'), feed.indexOf('</header>'));
  assert.match(topr, /data-which="social"[\s\S]*class="fx-coinchip" href="\/wallet"[\s\S]*class="fx-me"/, 'the coin count sits after the bells, just before your face (🏛 shows for Commons members)');
  assert.match(feed, /<details class="cm-sub mk-sub"><summary>🛍 Cohabi Marketplace ▾<\/summary><a href="\/label">Browse the Marketplace<\/a><a href="\/label\/new">＋ List something<\/a><a href="\/page\/new">＋ Make a page<\/a><\/details>/, 'the social menu has the Marketplace dropdown');
  const prof = await (await fetch(B + '/m/' + id, { headers: { cookie: a.ck } })).text();
  assert.ok(!prof.includes('/ member</p>'), 'no "Headquarters / member" line on a profile');
  assert.match(prof, /<details class="cm-sub mk-sub"><summary>🛍 Cohabi Marketplace ▾<\/summary><a href="\/label">Browse the Marketplace<\/a><a href="\/label\/new">＋ List something<\/a><a href="\/page\/new">＋ Make a page<\/a><\/details>/, 'the profile menu has the identical dropdown');
  const mine = await fetch(B + '/api/me/pages', { headers: { cookie: a.ck } });
  assert.equal(mine.status, 200); assert.deepEqual((await mine.json()).pages, []);
  assert.equal((await fetch(B + '/api/me/pages')).status, 401, 'your pages need sign-in');
  const coin = await fetch(B + '/static/brand/cohabi-coin.webp'); assert.equal(coin.status, 200, 'the coin image is served');
  console.log('wallet test passed');
} catch (e) { console.error('wallet test FAILED:', e.message); srv.kill(); process.exit(1); }
srv.kill();
