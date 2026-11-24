// The team-agent compacts old tool results once a session's history is large (token burn fix, 2026-11-23).
import test from 'node:test';
import assert from 'node:assert/strict';
import { compactHistory } from '../../scripts/team-agent.mjs';

const sim = (compact) => {
  const sys = 44000; const msgs = []; let sent = 0;
  for (let step = 1; step <= 14; step++) {
    sent += sys + msgs.reduce((n, m) => n + String(m.content).length, 0);
    msgs.push({ role: 'assistant', content: 'thinking '.repeat(30), tool_calls: [{ id: 'a' + step }, { id: 'b' + step }] });
    msgs.push({ role: 'tool', tool_call_id: 'a' + step, content: `file ${step}\n` + 'x'.repeat(15000) });
    msgs.push({ role: 'tool', tool_call_id: 'b' + step, content: `run ${step}\n` + 'y'.repeat(8000) });
    if (compact) compactHistory(msgs);
  }
  return { sent, msgs };
};

test('old tool results become short stubs; recent ones and the model\'s own words stay whole', () => {
  const { msgs } = sim(true);
  const tools = msgs.filter((m) => m.role === 'tool');
  assert.ok(tools.slice(-4).every((m) => m.content.length > 7000), 'the 4 newest results are kept whole');
  assert.ok(tools.slice(0, -4).every((m) => m.content.startsWith('[earlier result')), 'older results are stubs');
  assert.ok(tools[0].content.includes('file 1'), 'a stub says what the result was');
  assert.ok(msgs.filter((m) => m.role === 'assistant').every((m) => m.content.startsWith('thinking')), 'assistant turns untouched');
});

test('a small history is left alone', () => {
  const msgs = [{ role: 'tool', content: 'z'.repeat(5000) }];
  assert.equal(compactHistory(msgs), 0);
  assert.equal(msgs[0].content.length, 5000);
});

test('a typical 14-step session re-sends far less', () => {
  const before = sim(false).sent; const after = sim(true).sent;
  console.log(`# input chars over the session: ${before} -> ${after} (${Math.round((1 - after / before) * 100)}% less)`);
  assert.ok(after < before * 0.6);
});
