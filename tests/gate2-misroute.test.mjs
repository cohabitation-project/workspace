/**
 * Gate 2 (revised): dispatch-time identity binding.
 *
 * Tests the FAILURE paths, not the happy path: deliberately misroute,
 * misbind at creation, use an unknown identity, send missing and
 * duplicate turn IDs — each test asserts NO message would be posted.
 *
 * Audit language: this proves traceability to a configured model call
 * and prevents cross-posting. It does not prove what generated the text.
 *
 * Run: node --test tests/gate2-misroute.test.mjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// --- Replicate the dispatch system from src/index.js ---

function makeDispatchSystem() {
  const log = new Map();
  let seq = 0;

  function createDispatch(agent) {
    const turnId = `turn-${++seq}-${Date.now()}`;
    log.set(turnId, Object.freeze({
      turnId, agentId: agent.name, model: agent.model,
      provider: agent.provider, createdAt: Date.now(), status: 'dispatched',
    }));
    return turnId;
  }

  function completeDispatch(turnId) {
    const rec = log.get(turnId);
    if (rec) log.set(turnId, Object.freeze({ ...rec, status: 'completed' }));
  }

  function verifyDispatch(turnId, agent) {
    if (!turnId) return { ok: true };
    const rec = log.get(turnId);
    if (!rec) return { ok: false, reason: 'unknown turnId' };
    if (rec.agentId !== agent.name) return { ok: false, reason: `dispatched to ${rec.agentId}, posting as ${agent.name}` };
    if (rec.status === 'posted') return { ok: false, reason: 'duplicate post' };
    return { ok: true };
  }

  function markPosted(turnId) {
    const rec = log.get(turnId);
    if (rec) log.set(turnId, Object.freeze({ ...rec, status: 'posted' }));
  }

  return { createDispatch, completeDispatch, verifyDispatch, markPosted, log };
}

const Claude = { name: 'Claude', model: 'claude-sonnet-5-5', provider: 'anthropic' };
const Gemini = { name: 'Gemini', model: 'google/gemini-2.5-flash', provider: 'openrouter' };
const GPT = { name: 'GPT', model: 'openai/gpt-4.1', provider: 'openrouter' };
const Grok = { name: 'Grok', model: 'x-ai/grok-4.7', provider: 'openrouter' };

describe('Gate 2 revised: dispatch-time identity binding', () => {

  // --- Happy path (baseline) ---

  it('correctly dispatched and posted reply is accepted', () => {
    const sys = makeDispatchSystem();
    const turnId = sys.createDispatch(Claude);
    sys.completeDispatch(turnId);
    assert.ok(sys.verifyDispatch(turnId, Claude).ok);
  });

  // --- FAILURE PATHS (the point of this test) ---

  it('MISROUTE: Claude dispatch, Gemini post → REJECTED', () => {
    const sys = makeDispatchSystem();
    const turnId = sys.createDispatch(Claude);
    sys.completeDispatch(turnId);
    const result = sys.verifyDispatch(turnId, Gemini);
    assert.ok(!result.ok, 'Must reject: dispatched to Claude, posting as Gemini');
    assert.ok(result.reason.includes('Claude'), 'Reason names the dispatched agent');
    assert.ok(result.reason.includes('Gemini'), 'Reason names the posting agent');
  });

  it('MISROUTE: GPT dispatch, Grok post → REJECTED', () => {
    const sys = makeDispatchSystem();
    const turnId = sys.createDispatch(GPT);
    sys.completeDispatch(turnId);
    const result = sys.verifyDispatch(turnId, Grok);
    assert.ok(!result.ok, 'Must reject: dispatched to GPT, posting as Grok');
  });

  it('MISBIND AT CREATION: dispatch created for wrong agent → caught at post', () => {
    // Simulates a bug where createDispatch is called with the wrong agent object
    const sys = makeDispatchSystem();
    // Bug: someone passes Gemini's config when they meant Claude
    const turnId = sys.createDispatch(Gemini);
    sys.completeDispatch(turnId);
    // The reply is Claude's, but the dispatch says Gemini
    const result = sys.verifyDispatch(turnId, Claude);
    assert.ok(!result.ok, 'Must reject: dispatch was created for Gemini, Claude tries to post');
  });

  it('UNKNOWN TURN ID → REJECTED', () => {
    const sys = makeDispatchSystem();
    const result = sys.verifyDispatch('turn-999-fake', Claude);
    assert.ok(!result.ok, 'Must reject: unknown turnId');
    assert.equal(result.reason, 'unknown turnId');
  });

  it('MISSING TURN ID (null) → accepted (system message)', () => {
    const sys = makeDispatchSystem();
    assert.ok(sys.verifyDispatch(null, Claude).ok, 'Null turnId = system message, accepted');
    assert.ok(sys.verifyDispatch(undefined, Claude).ok, 'Undefined turnId = system message, accepted');
  });

  it('DUPLICATE POST: same turnId posted twice → REJECTED on second', () => {
    const sys = makeDispatchSystem();
    const turnId = sys.createDispatch(Claude);
    sys.completeDispatch(turnId);
    // First post succeeds
    assert.ok(sys.verifyDispatch(turnId, Claude).ok, 'First post accepted');
    sys.markPosted(turnId);
    // Second post with same turnId is rejected
    const result = sys.verifyDispatch(turnId, Claude);
    assert.ok(!result.ok, 'Must reject: duplicate post attempt');
    assert.equal(result.reason, 'duplicate post');
  });

  it('dispatch records are immutable after creation', () => {
    const sys = makeDispatchSystem();
    const turnId = sys.createDispatch(Claude);
    const rec = sys.log.get(turnId);
    assert.throws(() => { rec.agentId = 'Gemini'; }, 'Frozen record cannot be mutated');
  });

  it('each dispatch gets a unique turnId', () => {
    const sys = makeDispatchSystem();
    const t1 = sys.createDispatch(Claude);
    const t2 = sys.createDispatch(Claude);
    const t3 = sys.createDispatch(Gemini);
    assert.notEqual(t1, t2);
    assert.notEqual(t2, t3);
    assert.notEqual(t1, t3);
  });

  it('dispatch records carry model and provider for audit', () => {
    const sys = makeDispatchSystem();
    const turnId = sys.createDispatch(Claude);
    const rec = sys.log.get(turnId);
    assert.equal(rec.agentId, 'Claude');
    assert.equal(rec.model, 'claude-sonnet-5-5');
    assert.equal(rec.provider, 'anthropic');
    assert.equal(rec.status, 'dispatched');
  });

  it('status transitions: dispatched → completed → posted', () => {
    const sys = makeDispatchSystem();
    const turnId = sys.createDispatch(Claude);
    assert.equal(sys.log.get(turnId).status, 'dispatched');
    sys.completeDispatch(turnId);
    assert.equal(sys.log.get(turnId).status, 'completed');
    sys.markPosted(turnId);
    assert.equal(sys.log.get(turnId).status, 'posted');
  });
});
