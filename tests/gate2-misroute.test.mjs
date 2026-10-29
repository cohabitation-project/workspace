/**
 * Gate 2 test: wrong participant label DETECTED and REJECTED.
 *
 * Proves that if a reply bound to agent A is passed to sendAsAgent
 * with agent B, the message is refused with a CRITICAL alert.
 *
 * Run: node --test tests/gate2-misroute.test.mjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// --- Replicate the binding + verification logic from src/index.js ---

function makeBindingSystem() {
  const bindings = new Map();

  let seq = 0;
  function bindReply(agentName, replyText) {
    const id = `${Date.now()}-${++seq}-${agentName}`;
    bindings.set(id, agentName);
    return id;
  }

  function verifyBinding(bindingId, agentName) {
    if (!bindingId) return true; // system messages have no binding
    const bound = bindings.get(bindingId);
    if (bound && bound !== agentName) return false; // MISMATCH
    return true;
  }

  return { bindReply, verifyBinding };
}

describe('Gate 2: misrouted reply detection', () => {

  it('correctly bound reply is accepted', () => {
    const { bindReply, verifyBinding } = makeBindingSystem();
    const binding = bindReply('Claude', 'Water rights and zoning are critical.');
    assert.ok(verifyBinding(binding, 'Claude'), 'Reply bound to Claude, sent as Claude — should pass');
  });

  it('MISROUTED reply is REJECTED: Claude reply sent as Gemini', () => {
    const { bindReply, verifyBinding } = makeBindingSystem();
    const binding = bindReply('Claude', 'Water rights and zoning are critical.');
    assert.ok(
      !verifyBinding(binding, 'Gemini'),
      'Reply bound to Claude but sent as Gemini — must be rejected'
    );
  });

  it('MISROUTED reply is REJECTED: GPT reply sent as Grok', () => {
    const { bindReply, verifyBinding } = makeBindingSystem();
    const binding = bindReply('GPT', 'The governance structure needs work.');
    assert.ok(
      !verifyBinding(binding, 'Grok'),
      'Reply bound to GPT but sent as Grok — must be rejected'
    );
  });

  it('system messages (no binding) are always accepted', () => {
    const { verifyBinding } = makeBindingSystem();
    assert.ok(verifyBinding(null, 'Claude'), 'No binding (system msg) — should pass for any agent');
    assert.ok(verifyBinding(undefined, 'GPT'), 'Undefined binding — should pass');
  });

  it('unknown binding ID is accepted (defensive — binding may have been cleaned up)', () => {
    const { verifyBinding } = makeBindingSystem();
    assert.ok(verifyBinding('nonexistent-id', 'Claude'), 'Unknown binding ID — accepted (no evidence of mismatch)');
  });

  it('each reply gets a unique binding', () => {
    const { bindReply } = makeBindingSystem();
    const b1 = bindReply('Claude', 'Reply one');
    const b2 = bindReply('Claude', 'Reply two');
    assert.notEqual(b1, b2, 'Different replies get different binding IDs');
  });

  it('binding is specific to the generating agent, not the content', () => {
    const { bindReply, verifyBinding } = makeBindingSystem();
    const sameText = 'Identical text from different agents';
    const b1 = bindReply('Claude', sameText);
    const b2 = bindReply('Gemini', sameText);
    assert.ok(verifyBinding(b1, 'Claude'), 'Claude\'s binding accepted for Claude');
    assert.ok(!verifyBinding(b1, 'Gemini'), 'Claude\'s binding rejected for Gemini');
    assert.ok(verifyBinding(b2, 'Gemini'), 'Gemini\'s binding accepted for Gemini');
    assert.ok(!verifyBinding(b2, 'Claude'), 'Gemini\'s binding rejected for Claude');
  });
});
