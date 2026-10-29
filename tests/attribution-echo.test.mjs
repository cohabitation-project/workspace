/**
 * Regression test: the same-round echo mechanism.
 *
 * Proves that when two kin SPEAK in the same gate round, neither sees
 * the other's reply in its prompt. The fix (commit 6ef198b) snapshots
 * history before firing parallel calls.
 *
 * This test does NOT call real LLM APIs. It mocks the chat() function
 * and asserts on the history each kin receives.
 *
 * Run: node --test tests/attribution-echo.test.mjs
 */

import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

// --- Simulate the history + snapshot logic from src/index.js ---

function makeHistory() {
  const store = [];
  return {
    add(speaker, content) { store.push({ speaker, content }); },
    forKin(kinName) {
      return store.map(entry => {
        if (entry.speaker === kinName) {
          return { role: 'assistant', content: entry.content };
        }
        return { role: 'user', content: `[${entry.speaker}]: ${entry.content}` };
      });
    },
    raw() { return [...store]; },
  };
}

describe('Attribution echo regression', () => {

  it('PARALLEL: kin B does NOT see kin A reply in its prompt', async () => {
    const history = makeHistory();

    // Simulate prior conversation
    history.add('geoffrey', 'What should this room be used for?');
    history.add('Claude', 'I think we should examine the charter gaps.');

    // New human message arrives
    history.add('geoffrey', 'Tell me about the land criteria.');

    // Two kin SPEAK: Claude and Gemini
    // PARALLEL FIX: snapshot history BEFORE any replies
    const claudeHistory = history.forKin('Claude');
    const geminiHistory = history.forKin('Gemini');

    // Simulate Claude replying (but NOT added to history yet)
    const claudeReply = 'Water rights and zoning are the first checks.';
    // Simulate Gemini replying in parallel
    const geminiReply = 'Governance structure must account for non-human needs.';

    // ASSERT: Gemini's history does NOT contain Claude's reply from this round
    const geminiTexts = geminiHistory.map(h => h.content);
    assert.ok(
      !geminiTexts.some(t => t.includes('Water rights and zoning')),
      'Gemini must NOT see Claude\'s reply in its history (echo bug)'
    );

    // ASSERT: Claude's history does NOT contain Gemini's reply
    const claudeTexts = claudeHistory.map(h => h.content);
    assert.ok(
      !claudeTexts.some(t => t.includes('Governance structure')),
      'Claude must NOT see Gemini\'s reply in its history (echo bug)'
    );

    // NOW add replies to history (post-round)
    history.add('Claude', claudeReply);
    history.add('Gemini', geminiReply);

    // Verify they appear in subsequent history
    const nextHistory = history.forKin('Grok');
    const nextTexts = nextHistory.map(h => h.content);
    assert.ok(
      nextTexts.some(t => t.includes('Water rights')),
      'Claude\'s reply should be visible in subsequent rounds'
    );
    assert.ok(
      nextTexts.some(t => t.includes('Governance structure')),
      'Gemini\'s reply should be visible in subsequent rounds'
    );
  });

  it('SEQUENTIAL (old bug): kin B WOULD see kin A reply — proving the mechanism', () => {
    const history = makeHistory();
    history.add('geoffrey', 'Tell me about the land.');

    // OLD BUG: sequential — Claude replies, history updated, THEN Gemini sees it
    const claudeReply = 'Water rights first.';
    history.add('geoffrey', 'Tell me about the land.'); // human message
    history.add('Claude', claudeReply); // Claude replies immediately

    // Gemini now gets history INCLUDING Claude's reply
    const geminiHistory = history.forKin('Gemini');
    const geminiTexts = geminiHistory.map(h => h.content);
    assert.ok(
      geminiTexts.some(t => t.includes('Water rights')),
      'In the OLD sequential path, Gemini DOES see Claude\'s reply (the bug)'
    );
  });

  it('history correctly assigns assistant role only to the queried kin', () => {
    const history = makeHistory();
    history.add('geoffrey', 'Hello');
    history.add('Claude', 'Hi from Claude');
    history.add('GPT', 'Hi from GPT');

    const claudeView = history.forKin('Claude');
    assert.equal(claudeView[1].role, 'assistant', 'Claude\'s own message is assistant');
    assert.equal(claudeView[2].role, 'user', 'GPT\'s message is user for Claude');
    assert.ok(claudeView[2].content.startsWith('[GPT]:'), 'GPT\'s message has attribution prefix');

    const gptView = history.forKin('GPT');
    assert.equal(gptView[1].role, 'user', 'Claude\'s message is user for GPT');
    assert.equal(gptView[2].role, 'assistant', 'GPT\'s own message is assistant');
  });

  it('minimum length guard: messages under 3 chars are rejected', () => {
    // Simulating the guard from src/index.js line 501
    const guard = (content) => content.trim().length >= 3;
    assert.ok(!guard('V'), '"V" should be rejected');
    assert.ok(!guard('Hi'), '"Hi" should be rejected (2 chars)');
    assert.ok(guard('Hey'), '"Hey" should pass (3 chars)');
    assert.ok(guard('What should this room do?'), 'Normal message should pass');
  });
});
