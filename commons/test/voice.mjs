// Voice readback: part sizing and the cook-ahead cache (run with COMMONS_FAKE_TTS=1, no Kokoro needed).
//   node --test commons/test/voice.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.COMMONS_FAKE_TTS = '1';
const voice = await import('../lib/voice.mjs');

test('parts: first part is short so sound starts fast, later parts stay small enough to cook in time', () => {
  const long = ('A sentence of ordinary length that keeps going for a while. ').repeat(30);
  const all = voice.parts(long);
  assert.ok(all.length > 3, 'a long message splits into several parts');
  assert.ok(all[0].length <= 90, `first part ≤ 90 chars (got ${all[0].length})`);
  for (const [i, p] of all.entries()) {
    assert.ok(p.length <= 161, `part ${i} ≤ 160 chars + boundary (got ${p.length})`);
  }
  assert.equal(voice.parts('Hi.').length, 1, 'a short message is one part');
});

test('audioFor: pressing play cooks every later part into the cache, not just the one asked for', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'voice-test-'));
  voice.init(dir, dir); // no config/voices.json here; defaults apply
  const msg = { id: 'm_test1', text: ('Sentence one goes here with some words. ').repeat(20) };
  const member = { id: 'a_x', kind: 'agent' };
  const first = await voice.audioFor(msg, member, 0);
  assert.ok(first.parts > 1, 'the test message has several parts');
  assert.ok(fs.existsSync(first.file), 'part 0 landed on disk');
  // The cook-ahead jobs share the serial queue; in fake mode they finish almost at once.
  await new Promise((r) => setTimeout(r, 50));
  const files = fs.readdirSync(path.join(dir, 'audio'));
  assert.equal(files.length, first.parts, `all ${first.parts} parts cached after one press (got ${files.length})`);
  // Asking again serves from cache and adds nothing.
  await voice.audioFor(msg, member, 1);
  assert.equal(fs.readdirSync(path.join(dir, 'audio')).length, first.parts, 'no duplicates on a second ask');
});
