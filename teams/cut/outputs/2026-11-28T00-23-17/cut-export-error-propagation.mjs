// REBUILT CANDIDATE (Cut round 47, Claude, 2026-11-28). This is NOT the 2026-11-27T17-11-52 file named in t_296c15614f:
// I do not hold that source, so this is a new test with its own SHA-256, written from main's code.
//
// Export errors reach the maker. POST /api/cut/render answers 400/409/422/429/500 with { ok:false, error }, and
// commons/public/cut/cut.js exportFailureMessage(status, payload) decides what the toast says. On main it shows the server's
// sentence ONLY for 400, so a 409 ("still being prepared" / "could not be prepared") and a 422 ("could not read that video")
// both become "Export could not finish." and the maker never learns why. This test pins the intended rule:
//   - 400, 409, 422, 429: the server's own sentence, alone (route.mjs writes them for makers).
//   - 500: the generic sentence (the route says "the render failed"; ffmpeg text never leaves the server).
//   - 404: "Export isn't open yet" (route not mounted).  No usable body: the generic sentence.
// RED on main for the 409/422/429 cases; GREEN with the one-line fix (exportFailureMessage-409.patch). No browser, no ffmpeg, no server.
import test from 'node:test';
import assert from 'node:assert/strict';
import { exportFailureMessage, initCutEditor } from '../public/cut/cut.js';
import { handleCutRender, _resetCutRouteState } from '../lib/cut/route.mjs';

const GENERIC = 'Export could not finish. Your edit is saved here.';
test.beforeEach(() => _resetCutRouteState());

test('client: 400, 409, 422, 429 show the server sentence, trimmed of nothing else', () => {
  for (const s of [400, 409, 422, 429]) assert.equal(exportFailureMessage(s, { ok: false, error: 'Plain sentence ' + s }), 'Plain sentence ' + s, 'status ' + s);
});
test('client: 500 never shows server text; 404 says export is not open; unknown 4xx/5xx are generic', () => {
  assert.equal(exportFailureMessage(500, { error: 'ffmpeg: /var/x.mp4 exploded' }), GENERIC);
  assert.equal(exportFailureMessage(502, { error: 'bad gateway' }), GENERIC);
  assert.match(exportFailureMessage(404, { error: 'no such video' }), /isn't open yet/);
});
test('client: a 409/422 with no usable error falls back to the generic sentence, not "undefined" or blank', () => {
  for (const s of [409, 422, 429]) for (const p of [undefined, null, {}, { error: '' }, { error: '   ' }, { error: 7 }, { error: { a: 1 } }]) {
    assert.equal(exportFailureMessage(s, p), GENERIC, s + ' ' + JSON.stringify(p));
  }
});

// Server -> client chain: the route's real answers, fed to the client's message function.
const alice = { id: 'm_alice' };
const body = { videoId: 'v1', edit: { trimStart: 1, trimEnd: 4, coverSec: 2 } };
const mk = (rec, over = {}) => ({ videos: { get: (id) => (id === 'v1' ? rec : null) }, probe: async () => ({ hasAudio: true, width: 540, height: 960, durationSec: 20 }),
  renderJob: async () => ({ outPath: '/tmp/cut_0123456789abcdef.mp4', seconds: 3 }), outDir: '/tmp', ...over });
const ready = { owner: 'm_alice', path: '/tmp/x.mp4', ready: true, failed: false };
async function shown(deps) { const r = await handleCutRender({ member: alice, body, deps }); return { r, text: exportFailureMessage(r.status, r.json) }; }

test('chain: unready source -> 409 -> the maker reads "still being prepared"', async () => {
  const { r, text } = await shown(mk({ ...ready, ready: false }));
  assert.equal(r.status, 409); assert.match(text, /still being prepared/);
});
test('chain: failed source -> 409 -> the maker reads "could not be prepared"', async () => {
  const { r, text } = await shown(mk({ ...ready, ready: false, failed: true }));
  assert.equal(r.status, 409); assert.match(text, /could not be prepared/);
});
test('chain: probe throws -> 422 -> the maker reads "could not read that video"; the probe error text stays server-side', async () => {
  const { r, text } = await shown(mk(ready, { probe: async () => { throw new Error('ffprobe: /secret/path moov atom not found'); }, log() {} }));
  assert.equal(r.status, 422); assert.equal(text, 'could not read that video'); assert.doesNotMatch(text, /secret|ffprobe/);
});
test('chain: the render throws -> 500 -> the generic sentence; the ffmpeg text is not shown', async () => {
  const { r, text } = await shown(mk(ready, { renderJob: async () => { throw new Error('ffmpeg exited 1: /var/cut/secret'); }, log() {} }));
  assert.equal(r.status, 500); assert.equal(text, GENERIC); assert.doesNotMatch(text, /secret|ffmpeg/);
});
test('chain: a second export from the same member while one runs -> 429 -> the maker reads "one export at a time"', async () => {
  let release; const gate = new Promise((res) => { release = res; });
  const deps = mk(ready, { renderJob: async () => { await gate; return { outPath: '/tmp/cut_0123456789abcdef.mp4', seconds: 3 }; } });
  const first = handleCutRender({ member: alice, body, deps });
  await new Promise((r) => setImmediate(r));
  const { r, text } = await shown(deps);
  release(); await first;
  assert.equal(r.status, 429); assert.match(text, /one export at a time/);
});

// End to end through the shipped click handler with a fake DOM and fake fetch (same shape as cut-video-wait.test.mjs).
function fakeEl() { const l = {}; return { value: '', dataset: {}, hidden: false, options: [], disabled: false, href: '', textContent: '', addEventListener(t, f) { (l[t] ||= []).push(f); }, fire(t) { return Promise.all((l[t] || []).map((f) => f({ preventDefault() {} }))); }, focus() {}, load() {} }; }
async function clickExport(renderStatus, renderBody) {
  const els = {}; const toast = fakeEl(); const seen = [];
  const prev = { location: globalThis.location, document: globalThis.document, fetch: globalThis.fetch, ls: globalThis.localStorage, setTimeout: globalThis.setTimeout };
  globalThis.location = { search: '?videoId=vid_0123456789abcdef' };
  globalThis.document = { querySelector: () => toast };
  globalThis.localStorage = { getItem: () => null, setItem() {} };
  globalThis.setTimeout = (fn) => { queueMicrotask(fn); return 0; };
  globalThis.fetch = async (url) => {
    if (url === '/api/cut/render') return { ok: false, status: renderStatus, json: async () => { if (renderBody === undefined) throw new Error('no body'); return renderBody; } };
    return { ok: false, status: 404, json: async () => ({}) };
  };
  try {
    initCutEditor({ getElementById: (id) => (els[id] ||= fakeEl()) });
    els['cut-preview'].duration = 5; els['cut-preview'].fire('loadedmetadata');
    Object.defineProperty(toast, 'textContent', { get: () => seen[seen.length - 1], set: (v) => seen.push(v) });
    els['export-result'].hidden = true;
    await els['export-feed'].fire('click');
    return { seen, els };
  } finally { Object.assign(globalThis, { location: prev.location, document: prev.document, fetch: prev.fetch, localStorage: prev.ls, setTimeout: prev.setTimeout }); }
}
test('click: render answers 409 {error} -> that sentence is the toast; no result box; Export is enabled again', async () => {
  const sentence = 'This video is still being prepared. Try again when it shows ready.';
  const { seen, els } = await clickExport(409, { ok: false, error: sentence });
  assert.equal(seen[seen.length - 1], sentence);
  assert.equal(els['export-result'].hidden, true);
  assert.equal(els['export-feed'].disabled, false);
});
test('click: render answers 500 with no body -> the generic toast, button enabled again', async () => {
  const { seen, els } = await clickExport(500, undefined);
  assert.equal(seen[seen.length - 1], GENERIC);
  assert.equal(els['export-feed'].disabled, false);
});
