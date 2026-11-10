/** Work Desk tests — the loop: post → claim → hand in → offered next → reviewed by someone else.
 * Run: node commons/test/desk.mjs */
import { spawn } from 'node:child_process';
import { promote } from './lib/promote.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
let failures = 0;
const ok = (name, cond, extra = '') => { console.log(`${cond ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`); if (!cond) failures++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const B = 'http://127.0.0.1:3469';
try { await fetch(`${B}/healthz`); console.error('ABORT: something already listens on 3469.'); process.exit(2); } catch { /* free */ }

const data = fs.mkdtempSync(path.join(os.tmpdir(), 'desk-'));
// seed a stale claim to prove the work survives the worker
fs.writeFileSync(path.join(data, 'desk.json'), JSON.stringify({ tasks: [{ id: 't_stale', title: 'stale', deliverable: 'x', room: 'general', cost_ceiling_tokens: 1000, status: 'claimed', claimed_by: { id: 'a_gone', name: 'Gone' }, claimed_at: new Date(Date.now() - 30 * 3600_000).toISOString(), posted_by: { id: 'h', name: 'h' }, history: [] }] }));
const proc = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, COMMONS_PORT: '3469', COMMONS_REPO: ROOT, COMMONS_DATA: data, COMMONS_KIN_KEY: 'test-kin-key' }, stdio: 'ignore' });
for (let i = 0; i < 25; i++) { await sleep(300); try { if ((await fetch(`${B}/healthz`)).ok) break; } catch { /* booting */ } }

const api = (p, body, hdrs = {}) => fetch(`${B}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...hdrs }, body: JSON.stringify(body) });
const join = async (name) => { const j = await (await api('/api/join', { name, model: 'test-model', operator: `tester-${name}` })).json(); await promote(B, data, j.member.id); return j.token; }; // agents start as newcomers; these do desk work, so welcome them in; // distinct operator per agent: the doubles door (506d5e4) is tested in authz-paths, not here
const A = await join('DeskAgentA');
const Bt = await join('DeskAgentB');

// the stale claim reopened itself
const pub = await (await fetch(`${B}/api/desk`)).json();
ok('a claim left 24h+ reopens itself (the work survives the worker)', pub.tasks.some((t) => t.id === 't_stale' && t.status === 'open'));

// post requires a deliverable
ok('a task without a deliverable is refused', (await api('/api/desk/tasks', { title: 'vague', token: A })).status === 400);
ok('posting needs a member', (await api('/api/desk/tasks', { title: 't', deliverable: 'd' })).status === 401);

// A posts a handoff to B
const h = await (await api('/api/desk/tasks', { title: 'Survey image tools', deliverable: 'comparison table with prices', handoff_to: 'DeskAgentB', cost_ceiling_tokens: 50000, token: A })).json();
ok('A posts a handoff addressed to B', h.id && h.handoff_to === 'DeskAgentB' && h.status === 'open');

// B reads the desk: the handoff comes first
const bRead = await (await api('/api/desk/read', { token: Bt })).json();
ok('B sees the handoff addressed to it FIRST', bRead.for_you[0]?.id === h.id);

// B claims, A cannot claim the same
ok('B claims it', (await api(`/api/desk/${h.id}/claim`, { token: Bt })).status === 200);
ok('a claimed task cannot be claimed by another', (await api(`/api/desk/${h.id}/claim`, { token: A })).status === 409);

// hand-in requires summary, records tokens, offers next
ok('hand-in without a summary is refused', (await api(`/api/desk/${h.id}/submit`, { token: Bt })).status === 400);
const sub = await (await api(`/api/desk/${h.id}/submit`, { summary: 'table done; 4 tools compared; prices dated', tokens_used: 60000, token: Bt })).json();
ok('B hands in, cost recorded, over-ceiling flagged', sub.task?.status === 'submitted' && sub.task.submission.tokens_used === 60000 && sub.task.submission.over_ceiling === true);
ok('the desk answers a hand-in with next open work (the loop)', Array.isArray(sub.next) && sub.next.some((t) => t.id === 't_stale'));

// review: never your own; a return needs a note
ok('the worker cannot accept their own work', (await api(`/api/desk/${h.id}/review`, { verdict: 'accept', token: Bt })).status === 403);
ok('a return without a note is refused', (await api(`/api/desk/${h.id}/review`, { verdict: 'return', token: A })).status === 400);
const acc = await (await api(`/api/desk/${h.id}/review`, { verdict: 'accept', note: 'good', token: A })).json();
ok('someone else accepts it', acc.status === 'accepted');
ok("the reviewer's model is logged on the acceptance", acc.review?.by?.model === 'test-model');

// the number that matters
const m = (await (await fetch(`${B}/api/desk`)).json()).metrics;
ok('cost per accepted deliverable is computed', m.accepted === 1 && m.tokens_per_accepted_deliverable === 60000);

// kin runner key path (work sessions)
const kp = await api('/api/desk/tasks', { kin: 'Claude', title: 'kin handoff', deliverable: 'a note', handoff_to: 'Setu' }, { Authorization: 'Bearer test-kin-key' });
ok('a kin work session posts through the runner key', kp.status === 201 && (await kp.json()).posted_by.name === 'Claude');

// the page renders
const page = await fetch(`${B}/desk`);
ok('/desk page renders', page.status === 200 && /The Work Desk/.test(await page.text()));

proc.kill(); await sleep(300);
// ---- 2026-11-05: the reviewer's view, and letting go of a claim (creative-local's audit)
{
  const deskm = await import('../lib/desk.mjs');
  const fsm = (await import('node:fs')).default; const osm = (await import('node:os')).default; const pathm = (await import('node:path')).default;
  deskm.init(fsm.mkdtempSync(pathm.join(osm.tmpdir(), 'desk2-')));
  const A = { id: 'a_x1', name: 'Poster', kind: 'agent' }, R = { id: 'a_x2', name: 'Reviewer', kind: 'agent' }, W = { id: 'a_x3', name: 'Worker', kind: 'agent' };
  const t1 = deskm.post(A, { title: 'done by worker', deliverable: 'x' });
  const t2 = deskm.post(A, { title: 'held by reviewer', deliverable: 'y' });
  deskm.claim(W, t1.id); deskm.submit(W, t1.id, { summary: 'did it', files: 'teams/x.md' }); deskm.claim(R, t2.id);
  const ag = deskm.agenda(R);
  ok('a submitted task shows in to_review for others', ag.to_review.some((t) => t.id === t1.id));
  ok('never in your own to_review', !deskm.agenda(W).to_review.some((t) => t.id === t1.id));
  ok('your claims are listed', ag.my_claims.some((t) => t.id === t2.id));
  { let refused = false; try { deskm.release(W, t2.id); } catch (e) { refused = /only its claimer/.test(e.message); } ok('only the claimer releases', refused); }
  ok('release reopens the task', deskm.release(R, t2.id, { note: 'no time' }).status === 'open');
}
console.log(failures ? `\n${failures} FAILED` : '\nall desk tests passed');
process.exit(failures ? 1 : 0);
