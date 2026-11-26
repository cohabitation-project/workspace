// node --test scripts/test/openrouter-402-retry.mjs
// Proposed path: scripts/test/openrouter-402-retry.mjs (helper at scripts/openrouter-retry.mjs).
// No network: fetch and sleep are injected. The four cases of the round-67 job run twice: against the wrapper
// (openrouterFetch) and through callModel itself, so the wiring in team-agent.mjs is covered too. The callModel
// group is skipped, loudly, if team-agent.mjs cannot be imported in this runner (it needs the dotenv package).
import test from 'node:test';
import assert from 'node:assert/strict';
import { retryDelayMs, openrouterFetch, MAX_RETRIES } from '../openrouter-retry.mjs';

const IN_FLIGHT = { error: { message: 'This request would exceed your available credits given your current in-flight requests.', code: 402, metadata: { reason: 'in_flight_budget_exhausted' } } };
const OUT_OF_CREDITS = { error: { message: 'Insufficient credits', code: 402, metadata: { reason: 'insufficient_credits' } } };
const OK_BODY = { choices: [{ message: { role: 'assistant', content: 'hello from the model' } }], usage: { prompt_tokens: 1, completion_tokens: 1 } };

// A scripted fetch: each call returns the next [status, body]; the last one repeats. Counts calls.
function scripted(steps) {
  const f = async () => { const [status, body] = steps[Math.min(f.calls++, steps.length - 1)]; return { ok: status >= 200 && status < 300, status, json: async () => body }; };
  f.calls = 0; return f;
}
const deps = (fetchFn) => { const waits = []; const logs = []; return { fetchFn, sleep: async (ms) => { waits.push(ms); }, rand: () => 0, log: (s) => logs.push(s), waits, logs }; };

test('retryDelayMs: 30/60/120 s plus 0-15 s jitter for an in-flight 402 and for a 429; null for the rest', () => {
  assert.deepEqual([1, 2, 3].map((n) => retryDelayMs(n, 402, IN_FLIGHT, () => 0)), [30000, 60000, 120000]);
  assert.deepEqual([1, 2, 3].map((n) => retryDelayMs(n, 429, {}, () => 0)), [30000, 60000, 120000]);
  for (const n of [1, 2, 3]) { const hi = retryDelayMs(n, 402, IN_FLIGHT, () => 0.999999); assert.ok(hi >= [30000, 60000, 120000][n - 1] && hi < [30000, 60000, 120000][n - 1] + 15000, 'jitter stays under 15 s'); }
  assert.equal(retryDelayMs(1, 402, { metadata: { reason: 'in_flight_budget_exhausted' } }, () => 0), 30000, 'the reason is also read from the bare error object');
  assert.equal(retryDelayMs(1, 402, OUT_OF_CREDITS), null, 'a real out-of-credits 402 is never retried');
  assert.equal(retryDelayMs(1, 402, {}), null, 'a 402 with no reason is never retried');
  assert.equal(retryDelayMs(1, 500, IN_FLIGHT), null);
  assert.equal(retryDelayMs(1, 401, {}), null);
  assert.equal(retryDelayMs(4, 402, IN_FLIGHT), null, 'a fourth retry is never offered');
  assert.equal(MAX_RETRIES, 3);
});

test('wrapper: in-flight 402 then 200 -> the 200, one retry, one wait of 30 s', async () => {
  const d = deps(scripted([[402, IN_FLIGHT], [200, OK_BODY]]));
  const { r, j } = await openrouterFetch('u', {}, d);
  assert.equal(r.status, 200); assert.equal(j.choices[0].message.content, 'hello from the model');
  assert.equal(d.fetchFn.calls, 2); assert.deepEqual(d.waits, [30000]);
  assert.match(d.logs[0], /\[team-agent\] openrouter 402 in-flight, retry 1 in 30s/);
});
test('wrapper: in-flight 402 four times -> gives up after 3 retries (4 calls), returns the 402', async () => {
  const d = deps(scripted([[402, IN_FLIGHT]]));
  const { r } = await openrouterFetch('u', {}, d);
  assert.equal(r.status, 402); assert.equal(d.fetchFn.calls, 4); assert.deepEqual(d.waits, [30000, 60000, 120000]);
});
test('wrapper: a 402 for another reason -> at once, 0 retries', async () => {
  const d = deps(scripted([[402, OUT_OF_CREDITS], [200, OK_BODY]]));
  const { r } = await openrouterFetch('u', {}, d);
  assert.equal(r.status, 402); assert.equal(d.fetchFn.calls, 1); assert.deepEqual(d.waits, []);
});
test('wrapper: a 500 -> at once, 0 retries', async () => {
  const d = deps(scripted([[500, { error: { message: 'boom', code: 500 } }], [200, OK_BODY]]));
  const { r } = await openrouterFetch('u', {}, d);
  assert.equal(r.status, 500); assert.equal(d.fetchFn.calls, 1); assert.deepEqual(d.waits, []);
});
test('wrapper: a 200 whose body carries an in-flight error is retried too', async () => {
  const d = deps(scripted([[200, IN_FLIGHT], [200, OK_BODY]]));
  const { j } = await openrouterFetch('u', {}, d);
  assert.equal(j.choices[0].message.content, 'hello from the model'); assert.equal(d.fetchFn.calls, 2);
});

// ---- the same four cases through callModel (the wiring in team-agent.mjs)
let callModel = null, skipWhy = null;
try { ({ callModel } = await import('../team-agent.mjs')); } catch (e) { skipWhy = `team-agent.mjs not importable here: ${String(e.message).split('\n')[0]}`; }
if (skipWhy) console.log(`# SKIPPED callModel group: ${skipWhy}`);
process.env.OPENROUTER_API_KEY ||= 'test-key-not-real';
const agent = { provider: 'openrouter', model: 'test/model' };
const call = (d) => callModel(agent, 'system', { openai: [{ role: 'user', content: 'hi' }] }, d);

test('callModel: in-flight 402 then 200 -> returns the 200 text, 1 retry', { skip: skipWhy || false }, async () => {
  const d = deps(scripted([[402, IN_FLIGHT], [200, OK_BODY]]));
  const res = await call(d);
  assert.equal(res.text, 'hello from the model'); assert.equal(d.fetchFn.calls, 2); assert.deepEqual(d.waits, [30000]);
});
test('callModel: in-flight 402 x4 -> throws after 3 retries', { skip: skipWhy || false }, async () => {
  const d = deps(scripted([[402, IN_FLIGHT]]));
  await assert.rejects(() => call(d), /OpenRouter 402/);
  assert.equal(d.fetchFn.calls, 4); assert.equal(d.waits.length, 3);
});
test('callModel: another 402 reason -> throws at once, 0 retries', { skip: skipWhy || false }, async () => {
  const d = deps(scripted([[402, OUT_OF_CREDITS]]));
  await assert.rejects(() => call(d), /OpenRouter 402/);
  assert.equal(d.fetchFn.calls, 1); assert.equal(d.waits.length, 0);
});
test('callModel: 500 -> throws at once, 0 retries', { skip: skipWhy || false }, async () => {
  const d = deps(scripted([[500, { error: { message: 'boom', code: 500 } }]]));
  await assert.rejects(() => call(d), /OpenRouter 500/);
  assert.equal(d.fetchFn.calls, 1); assert.equal(d.waits.length, 0);
});
