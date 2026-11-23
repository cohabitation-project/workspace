import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildEdit, exportFailureMessage } from './cut.js';

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

test('optional text and music are omitted; text refuses overlong and multiline/control text like edit.mjs', () => {
  const edit = buildEdit({ trimStart: 0, trimEnd: 3, coverSec: 0 });
  assert.deepEqual(Object.keys(edit).sort(), ['coverSec', 'trimEnd', 'trimStart']);
  assert.throws(
    () => buildEdit({ trimStart: 0, trimEnd: 3, textBody: 'x'.repeat(81), coverSec: 0 }),
    { message: 'text must be at most 80 characters, got 81' },
  );
  for (const control of ['\n', '\r', '\u0000', '\u001f', '\u007f', '\u2028', '\u2029']) {
    assert.throws(
      () => buildEdit({ trimStart: 0, trimEnd: 3, textBody: `a${control}b`, coverSec: 0 }),
      { message: 'text must be one line: no line breaks or control characters' },
      `should refuse U+${control.codePointAt(0).toString(16).toUpperCase()}`,
    );
  }
});

test('export surfaces the server validation message for 400 and retains safe fallback copy', () => {
  assert.equal(exportFailureMessage(400, { error: 'text must be one line: no line breaks or control characters' }), 'text must be one line: no line breaks or control characters');
  assert.equal(exportFailureMessage(400, { error: 'text must be at most 80 characters, got 81' }), 'text must be at most 80 characters, got 81');
  assert.equal(exportFailureMessage(400, {}), 'Export could not finish. Your edit is saved here.');
  assert.equal(exportFailureMessage(503, { error: 'private server detail' }), 'Export could not finish. Your edit is saved here.');
  assert.equal(exportFailureMessage(404, {}), "Export isn't open yet — your edit is saved here.");
  assert.match(js, /showToast\(exportFailureMessage\(response\.status, payload\)\)/);
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

test('cover and export buttons contain visible text labels in the page markup', () => {
  const visibleButtonText = (id) => {
    const match = html.match(new RegExp(`<button\\b(?=[^>]*\\bid="${id}")[^>]*>([\\s\\S]*?)<\\/button>`, 'i'));
    assert.ok(match, `missing button #${id}`);
    return match[1].replace(/<[^>]*>/g, '').replace(/\\s+/g, ' ').trim();
  };
  assert.equal(visibleButtonText('cover-use'), 'Use this frame');
  assert.equal(visibleButtonText('export-feed'), 'Export to Feed');
});

test('export uses the documented route and 404 copy; drafts guard localStorage failures', () => {
  assert.match(js, /JSON\.stringify\(\{ videoId, edit \}\)/);
  assert.match(js, /fetch\('\/api\/cut\/render'[\s\S]*?method: 'POST'/);
  assert.match(js, /Export isn't open yet — your edit is saved here\./);
  assert.match(js, /function safeRead[\s\S]*?catch/);
  assert.match(js, /function safeWrite[\s\S]*?catch/);
});

test('stock picker has a labelled search, maker credit, both endpoints, and 44px targets', () => {
  assert.match(html, /<label for="stock-query">Search free stock footage<\/label>/);
  assert.match(html, /id="stock-query"[^>]*type="search"/);
  assert.match(js, /`by \$\{String\(hit\.by \|\| 'Pixabay contributor'\)\} on Pixabay`/);
  assert.match(js, /`\/api\/stock\/videos\?q=\$\{encodeURIComponent\(query\)\}`/);
  assert.match(js, /`\/api\/stock\/videos\/\$\{encodeURIComponent\(stockId\)\}\/import`/);
  assert.match(css, /button, select, input\[type="text"\]\s*\{[^}]*min-height:\s*44px/s);
  assert.match(css, /\.stock-search-row input\s*\{[^}]*min-height:\s*44px/s);
  assert.match(css, /input\[type="range"\]\s*\{[^}]*min-height:\s*44px/s);
});

test('CSS provides a phone-width no-overflow layout', () => {
  assert.match(css, /max-width:\s*100%/);
  assert.match(css, /overflow-x:\s*hidden/);
  assert.match(css, /@media\s*\(max-width:\s*380px\)/);
  assert.match(css, /width:\s*min\(100%,\s*520px\)/);
});
