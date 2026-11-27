// waitForVideo (commons/public/cut/cut.js): after an upload answers ready:false, Cut polls the member's own list
// until the video is ready or failed, and only then offers "Post it". Fake fetch + fake sleep: no browser, no server.
// Direct waits are bounded at 30 simulated ms; export-flow polls use an immediate fake timer, so a missing failure exit goes red fast.
import test from 'node:test';
import assert from 'node:assert/strict';
import { waitForVideo, failedVideoMessage } from '../public/cut/cut.js';

const seq = (...lists) => { let i = 0; const urls = []; const fetchFn = async (u) => { urls.push(u); const l = lists[Math.min(i++, lists.length - 1)]; return { ok: true, json: async () => ({ videos: l }) }; }; fetchFn.urls = urls; return fetchFn; };
const noSleep = async () => {};

test('ready after two polls', async () => {
  const f = seq([{ id: 'v1', ready: false }], [{ id: 'v1', ready: false }], [{ id: 'v1', ready: true }]);
  assert.deepEqual(await waitForVideo('v1', { fetchFn: f, sleep: noSleep, intervalMs: 10, timeoutMs: 30 }), { state: 'ready' });
  assert.equal(f.urls.length, 3);
  assert.ok(f.urls[0].startsWith('/api/videos?by=me'));
});
test('failed returns the server reason, so Cut can show it and withhold "Post it"', async () => {
  const f = seq([{ id: 'v1', ready: false }], [{ id: 'v1', ready: false, failed: true, reason: 'We could not convert this video.' }]);
  assert.deepEqual(await waitForVideo('v1', { fetchFn: f, sleep: noSleep, intervalMs: 10, timeoutMs: 30 }), { state: 'failed', reason: 'We could not convert this video.' });
});
test('only the asked-for id counts (another ready video does not end the wait)', async () => {
  const f = seq([{ id: 'other', ready: true }]);
  assert.equal((await waitForVideo('v1', { fetchFn: f, sleep: noSleep, intervalMs: 10, timeoutMs: 30 })).state, 'timeout');
});
test('a failed fetch or network error is retried, then times out; it never claims ready', async () => {
  let n = 0; const f = async () => { n++; if (n % 2) throw new Error('offline'); return { ok: false }; };
  assert.equal((await waitForVideo('v1', { fetchFn: f, sleep: noSleep, intervalMs: 10, timeoutMs: 30 })).state, 'timeout');
  assert.equal(n, 4);
});

// Export flow (round 33, Cut Claude): drive the shipped initCutEditor with a fake DOM and a fake fetch. The upload answers ready:false,
// the member's own list then says failed:true. The maker sees the failure message and is never offered "Post it". Fake DOM, not a browser.
import { initCutEditor } from '../public/cut/cut.js';
function fakeEl() { const l = {}; return { value: '', dataset: {}, hidden: false, options: [], disabled: false, href: '', textContent: '', addEventListener(t, f) { (l[t] ||= []).push(f); }, fire(t) { return Promise.all((l[t] || []).map((f) => f({ preventDefault() {} }))); }, focus() {}, load() {} }; }
async function runExport(uploadBody, listVideos, uploadStatus = 200, uploadJsonFails = false) {
  const els = {}; const toasts = []; const toast = fakeEl(); let pollSleeps = 0;
  const prev = { location: globalThis.location, document: globalThis.document, fetch: globalThis.fetch, ls: globalThis.localStorage, setTimeout: globalThis.setTimeout };
  globalThis.location = { search: '?videoId=vid_0123456789abcdef' };
  globalThis.document = { querySelector: () => toast };
  globalThis.localStorage = { getItem: () => null, setItem() {} };
  // Await the real click listener below. Its default 1,500 ms sleeps run as microtasks; after 20, reject the sleep
  // (outside waitForVideo's fetch catch), so a missing terminal state settles red instead of leaving a live poller.
  globalThis.setTimeout = (fn, ms) => {
    if (ms === 1500 && ++pollSleeps > 20) throw new Error('Test poller exceeded 20 sleeps');
    queueMicrotask(fn);
    return 0;
  };
  globalThis.fetch = async (url, opts) => {
    if (url === '/api/cut/render') return { ok: true, json: async () => ({ url: '/cut/cut_x.mp4' }) };
    if (url === '/cut/cut_x.mp4') return { ok: true, blob: async () => new Blob(['x']) };
    if (String(url).startsWith('/api/videos?by=me')) return { ok: true, json: async () => ({ videos: listVideos }) };
    if (String(url).startsWith('/api/videos?alt=')) return { ok: uploadStatus < 400, status: uploadStatus, json: async () => { if (uploadJsonFails) throw new Error('no response body'); return uploadBody; } };
    return { ok: false, status: 404, json: async () => ({}) };
  };
  try {
    initCutEditor({ getElementById: (id) => (els[id] ||= fakeEl()) });
    els['cut-preview'].duration = 5; els['cut-preview'].fire('loadedmetadata');
    const seen = []; Object.defineProperty(toast, 'textContent', { get: () => seen[seen.length - 1], set: (v) => seen.push(v) });
    els['export-result'].hidden = true;
    await els['export-feed'].fire('click');
    assert.ok(pollSleeps <= 20, 'export poller must settle before globals are restored');
    return { els, seen, pollSleeps };
  } finally { Object.assign(globalThis, { location: prev.location, document: prev.document, fetch: prev.fetch, localStorage: prev.ls, setTimeout: prev.setTimeout }); }
}
const MSG = "We couldn't convert this video.";
const DEFAULT_MSG = "We couldn't prepare this video.";
test('export flow: upload says ready:false, own list says failed -> message shown, no Post link, no result box', async () => {
  const { els, seen } = await runExport({ id: 'vid_0123456789abcdef', ready: false }, [{ id: 'vid_0123456789abcdef', ready: false, failed: true, reason: "We couldn't convert this video." }]);
  assert.equal(seen[seen.length - 1], MSG);
  assert.equal(els['export-post'].href, '');
  assert.equal(els['export-result'].hidden, true);
});
test('export flow: the upload response itself says failed -> same message, nothing to post', async () => {
  const { els, seen } = await runExport({ id: 'vid_0123456789abcdef', ready: false, failed: true, reason: "We couldn't convert this video." }, []);
  assert.equal(seen[seen.length - 1], MSG);
  assert.equal(els['export-post'].href, '');
});
test('export flow: a video that becomes ready still offers Post it (the failure path did not break success)', async () => {
  const { els, seen } = await runExport({ id: 'vid_0123456789abcdef', ready: true }, []);
  assert.equal(seen[seen.length - 1], 'Your edited video is ready. Tap "Post it".');
  assert.equal(els['export-result'].hidden, false);
  assert.match(els['export-post'].href, /^\/social\?cut=vid_0123456789abcdef/);
});
test('export flow: failed with no reason from the poll -> the plain default sentence, once', async () => {
  const { els, seen } = await runExport({ id: 'vid_0123456789abcdef', ready: false }, [{ id: 'vid_0123456789abcdef', ready: false, failed: true }]);
  assert.equal(seen[seen.length - 1], DEFAULT_MSG);
  assert.equal(els['export-result'].hidden, true);
});
test('export flow: failed on the upload answer with no reason -> the plain default sentence', async () => {
  const { seen } = await runExport({ id: 'vid_0123456789abcdef', ready: false, failed: true }, []);
  assert.equal(seen[seen.length - 1], DEFAULT_MSG);
});
test('failedVideoMessage: reason alone, trimmed; blank or non-string gives the default', () => {
  assert.equal(failedVideoMessage("  We couldn't convert this video. "), "We couldn't convert this video.");
  for (const bad of ['', '   ', undefined, null, 5]) assert.equal(failedVideoMessage(bad), DEFAULT_MSG);
});
test('waitForVideo: failed with no reason resolves reason "" (the page supplies the default)', async () => {
  const f = seq([{ id: 'v1', ready: false, failed: true }]);
  assert.deepEqual(await waitForVideo('v1', { fetchFn: f, sleep: noSleep, intervalMs: 10, timeoutMs: 30 }), { state: 'failed', reason: '' });
});

test('export save HTTP 500 with server error: exactly one Disk is full toast, Post box hidden', async () => {
  const { els, seen } = await runExport({ error: 'Disk is full.' }, [], 500);
  assert.equal(seen.filter((message) => message === 'Disk is full.').length, 1);
  assert.equal(seen.at(-1), 'Disk is full.');
  assert.equal(els['export-post'].href, '');
  assert.equal(els['export-result'].hidden, true);
});
test('export save HTTP 500 with no response body: status fallback, Post box hidden', async () => {
  const { els, seen } = await runExport({}, [], 500, true);
  assert.match(seen.at(-1), /Could not save the export to your videos \(500\)/);
  assert.equal(els['export-post'].href, '');
  assert.equal(els['export-result'].hidden, true);
});
