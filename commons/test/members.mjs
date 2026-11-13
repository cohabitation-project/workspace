// /members, friends, the new-person greeting and the profile buttons (Geoffrey, 2026-11-13).
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import net from 'node:net';
const PORT = await new Promise((r) => { const s = net.createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => r(p)); }); });
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'mb-')); const B = `http://127.0.0.1:${PORT}`;
const srv = spawn('node', ['commons/server.mjs'], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: DATA, COMMONS_STEWARDS: 'Hosty' }, stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 50; i++) { try { await fetch(B + '/healthz'); break; } catch { await sleep(200); } }
import assert from 'node:assert';
const out = [];
const signup = async (name) => { const r = await fetch(B + '/api/humans', { method: 'POST', headers: { 'content-type': 'application/json', 'x-commons': '1' }, body: JSON.stringify({ name }) }); return { r, j: await r.json().catch(() => ({})), ck: (r.headers.get('set-cookie') || '').split(';')[0] }; };
const a = await signup('Hosty'); const b = await signup('Shawnee');
out.push(['signup', a.r.status, b.r.status, !!a.ck]);
const page = await (await fetch(B + '/members', { headers: { cookie: a.ck } })).text();
out.push(['members page has Shawnee', page.includes('Shawnee'), 'has bottom Members', page.includes('href="/members"'), 'face to profile', page.includes('aria-label="Your profile"')]);
const fr = await fetch(B + '/api/friends', { method: 'POST', headers: { 'content-type': 'application/json', 'x-commons': '1', cookie: a.ck }, body: JSON.stringify({ to: b.j.member?.id || 'Shawnee', label: 'Kin' }) });
out.push(['friend request', fr.status, JSON.stringify(await fr.json()).slice(0, 120)]);
const feedB = await (await fetch(B + '/feed', { headers: { cookie: b.ck } })).text();
out.push(['B sees friend-request bell', feedB.includes('asked to be your friend')]);
const prof = await (await fetch(B + '/m/' + (b.j.member?.id || ''), { headers: { cookie: a.ck } })).text();
out.push(['profile has buttons', prof.includes('data-friend-for'), prof.includes('/messages?to=')]);
const hall = await (await fetch(B + '/api/rooms/general/messages')).json().catch(() => ({}));
out.push(['hall greeting', JSON.stringify(hall).includes('just joined Cohabi')]);
const flat = JSON.stringify(out);
try {
  assert.ok(out[0][1] === 201 && out[0][2] === 201, 'two people sign up');
  assert.ok(out[1][1] && out[1][3] && out[1][5], 'the members page lists the new person, the bottom bar has Members, the face goes to your profile');
  assert.equal(out[2][1], 201, 'a friend request with a private label is sent');
  assert.ok(out[3][1], 'the person asked sees it in their bell');
  assert.ok(out[4][1] && out[4][2], 'a profile shows Message and the friend button to others');
  assert.ok(out[5][1], 'the General Hall says a new person joined');
  console.log('members test passed');
} catch (e) { console.error('members test FAILED:', e.message, flat); srv.kill(); process.exit(1); }
srv.kill();
