import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildEdit } from './cut.js';

const html = await readFile(new URL('./cut.html', import.meta.url), 'utf8');
const css = await readFile(new URL('./cut.css', import.meta.url), 'utf8');
const js = await readFile(new URL('./cut.js', import.meta.url), 'utf8');

test('page builds exactly the edit fields consumed by editToTracks', () => {
  const edit = buildEdit({
    trimStart: 1.25, trimEnd: 9.5, textBody: 'A first cut', textPosition: 'bottom',
    musicId: 'track-7', musicVolume: 0.4, coverSec: 4,
  });
  assert.deepEqual(Object.keys(edit).sort(), ['coverSec', 'music', 'text', 'trimEnd', 'trimStart'].sort());
  assert.deepEqual(edit, {
    trimStart: 1.25,
    trimEnd: 9.5,
    text: { body: 'A first cut', y: 540 },
    music: { id: 'track-7', volume: 0.4 },
    coverSec: 4,
  });
  assert.deepEqual(Object.keys(edit.text).sort(), ['body', 'y']);
  assert.deepEqual(Object.keys(edit.music).sort(), ['id', 'volume']);
});

test('optional text and music are omitted; text remains one line and at most 80 chars', () => {
  const edit = buildEdit({ trimStart: 0, trimEnd: 3, coverSec: 0 });
  assert.deepEqual(Object.keys(edit).sort(), ['coverSec', 'trimEnd', 'trimStart']);
  assert.throws(() => buildEdit({ trimStart: 0, trimEnd: 3, textBody: 'a\nb', coverSec: 0 }), /one line/);
  assert.throws(() => buildEdit({ trimStart: 0, trimEnd: 3, textBody: 'x'.repeat(81), coverSec: 0 }), /80 characters/);
});

test('video preview, trim, text, optional music, and cover controls exist', () => {
  assert.match(html, /<video\b[^>]*id="cut-preview"[^>]*playsinline/);
  assert.match(html, /id="trim-start"[^>]*type="range"/);
  assert.match(html, /id="trim-end"[^>]*type="range"/);
  assert.match(html, /id="edit-text"[^>]*maxlength="80"/);
  assert.match(html, /id="text-position"/);
  assert.match(html, /<option value="top">Top<\/option>[\s\S]*<option value="middle"[\s\S]*<option value="bottom">Bottom<\/option>/);
  assert.match(html, /id="music-wrap" hidden/);
  assert.match(js, /fetch\('\/api\/label\/tracks'/);
  assert.match(html, /id="cover-scrub"[^>]*type="range"/);
  assert.match(html, /id="cover-use"[^>]*>Use this frame<\/button>/);
});

test('every form control has a label and non-form controls have accessible names', () => {
  const controls = [...html.matchAll(/<(input|select)\b[^>]*\bid="([^"]+)"[^>]*>/g)].map((m) => m[2]);
  for (const id of controls) assert.match(html, new RegExp(`<label\\b[^>]*for="${id}"`), `missing label for ${id}`);
  assert.match(html, /<video\b[^>]*aria-label="Video preview"/);
  assert.match(html, /id="export-feed"[^>]*>Export to Feed<\/button>/);
});

test('export uses the documented route and 404 copy; drafts guard localStorage failures', () => {
  assert.match(js, /JSON\.stringify\(\{ videoId, edit \}\)/);
  assert.match(js, /fetch\('\/api\/cut\/render'[\s\S]*?method: 'POST'/);
  assert.match(js, /Export isn't open yet — your edit is saved here\./);
  assert.match(js, /function safeRead[\s\S]*?catch/);
  assert.match(js, /function safeWrite[\s\S]*?catch/);
});

test('CSS provides 44px touch targets and a phone-width no-overflow layout', () => {
  assert.match(css, /button, select, input\[type="text"\]\s*\{[^}]*min-height:\s*44px/s);
  assert.match(css, /input\[type="range"\]\s*\{[^}]*min-height:\s*44px/s);
  assert.match(css, /max-width:\s*100%/);
  assert.match(css, /overflow-x:\s*hidden/);
  assert.match(css, /@media\s*\(max-width:\s*380px\)/);
  assert.match(css, /width:\s*min\(100%,\s*520px\)/);
});
