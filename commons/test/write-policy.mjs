// Every kin may add files anywhere in the shared record (Geoffrey, 2026-11-13), except running code, secrets,
// others' continuity records and STANDUP.md; adopted texts take changes as proposals beside them.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { writeBlockReason, proposalPathFor } from '../../scripts/write-policy.mjs';

const own = 'continuity/claude/';
const ok = (p, o) => assert.equal(writeBlockReason(p, own, o), null, `${p} should be writable`);
const no = (p, re, o) => { const r = writeBlockReason(p, own, o); assert.ok(r && re.test(r), `${p} should be refused (${re}): got ${r}`); };

ok('docs/council/whose-hands/google.md');
ok('council/plans/one-year.md');
ok('teams/review/notes.md');
ok('teams/rnd/kodama/sim.py');
ok('library/reading.md');
ok('proposals/new-thing.md');
ok('marketing/landing.md');
ok('continuity/claude/2026-11-13.md');
ok('governance/new-draft.md');
ok('governance/charter.md', { exists: false });
no('governance/charter.md', /^ADOPTED/, { exists: true });
no('context/02-charter.md', /^ADOPTED/, { exists: true });
ok('context/02-charter.proposal-2026-11-13-claude.md', { exists: true });
no('commons/server.mjs', /running code/);
no('scripts/team-agent.mjs', /running code/);
no('.github/workflows/x.yml', /running code/);
no('config/agents.json', /running code/);
no('docs/.env', /secrets/);
no('teams/rnd/id_rsa', /secrets/);
no('continuity/setu/notes.md', /only by their own agent/);
no('teams/review/STANDUP.md', /append-only/);
no('package.json', /machinery/);
no('../outside.md', /repository-relative/);
no('brand-new-top/x.md', /shared folders/);
assert.equal(proposalPathFor('context/02-charter.md', 'Gemini', '2026-11-13'), 'context/02-charter.proposal-2026-11-13-gemini.md');

// the work-session tool really writes into docs/council/ now
const { makeTools } = await import('../../scripts/team-agent.mjs');
const ctx = { kin: { name: 'Claude', continuity: 'claude' }, written: new Set(), commonsPosts: 0 };
const tools = makeTools(ctx);
const rel = `docs/council/whose-hands/.write-policy-test-${process.pid}.md`;
try {
  const r = await tools.write_file({ path: rel, content: 'hello' });
  assert.match(r, /^wrote docs\/council\/whose-hands\//);
  assert.equal(fs.readFileSync(path.resolve(rel), 'utf8'), 'hello');
  await assert.rejects(tools.write_file({ path: 'commons/server.mjs', content: 'x' }), /running code/);
} finally { fs.rmSync(path.resolve(rel), { force: true }); }
console.log('write-policy: ok');
