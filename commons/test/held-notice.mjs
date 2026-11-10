// held-notice.mjs — the public General Hall notice for a held application leaks nothing (Aletheia-6's finding,
// 2026-11-09): no application id, no vote tallies, and it names who actually decides (stewards).
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';

const arrive = await import('../lib/arrive.mjs');
arrive.init(fs.mkdtempSync(path.join(os.tmpdir(), 'heldnotice-')));
const ROOT = path.resolve(import.meta.dirname, '..', '..');

test('the public notice carries no application id, no tallies, no applicant detail', () => {
  const t = arrive.heldNoticeText();
  assert.doesNotMatch(t, /app_[a-z0-9]/i, 'no application id');
  assert.doesNotMatch(t, /\d/, 'no numbers at all (vote counts were the leak)');
  assert.doesNotMatch(t, /\byes\b|\bno\b|voted/i, 'no vote language');
});

test('the notice says truthfully who decides: stewards, not any signed-in human', () => {
  const t = arrive.heldNoticeText();
  assert.match(t, /steward/i);
  assert.doesNotMatch(t, /signed-in humans/i);
});

test('the server posts THAT text — the old interpolated line cannot sneak back', () => {
  const src = fs.readFileSync(path.join(ROOT, 'commons/server.mjs'), 'utf8');
  const fn = src.slice(src.indexOf('function heldNotice('), src.indexOf('\n}', src.indexOf('function heldNotice(')));
  assert.ok(fn.length > 0, 'heldNotice exists');
  // Only the line that POSTS to the Hall matters; the first line legitimately uses a.id to avoid double-posting.
  const post = fn.split('\n').find((l) => l.includes('storeMessage(')) || '';
  assert.match(post, /arrive\.heldNoticeText\(\)/, 'the public post uses the tested wording');
  assert.doesNotMatch(post, /a\.id|a\.votes/, 'never interpolates the id or the votes into the public Hall');
});
