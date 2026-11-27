// Cut maker-facing export-save failure regression. Runs the real editor click handler with fake fetch/DOM;
// no browser, server, ffmpeg, or real video is involved.
import test from 'node:test';
import assert from 'node:assert/strict';
import { initCutEditor } from '../../../commons/public/cut/cut.js';

function fakeEl() {
  const listeners = {};
  return {
    value: '', dataset: {}, hidden: false, options: [], disabled: false, href: '', textContent: '',
    addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
    fire(type) { return Promise.all((listeners[type] || []).map((fn) => fn({ preventDefault() {} }))); },
    focus() {}, load() {}, append() {}, replaceChildren() {},
  };
}

async function attemptSave(uploadResponse) {
  const els = {};
  const toast = fakeEl();
  const calls = [];
  const previous = {
    location: globalThis.location, document: globalThis.document, fetch: globalThis.fetch,
    localStorage: globalThis.localStorage, setTimeout: globalThis.setTimeout,
  };
  globalThis.location = { search: '?videoId=vid_save_failure_test' };
  globalThis.document = { querySelector: () => toast, createElement: () => fakeEl() };
  globalThis.localStorage = { getItem: () => null, setItem() {} };
  // Suppress the five-second toast timer; export's click handler is awaited by fire().
  globalThis.setTimeout = () => 1;
  globalThis.fetch = async (url, options) => {
    calls.push(String(url));
    if (url === '/api/cut/music') return { ok: false, status: 503, json: async () => ({}) };
    if (url === '/api/cut/render') return { ok: true, json: async () => ({ url: '/cut/cut_test.mp4' }) };
    if (url === '/cut/cut_test.mp4') return { ok: true, blob: async () => new Blob(['test']) };
    if (String(url).startsWith('/api/videos?alt=')) return uploadResponse;
    return { ok: false, status: 404, json: async () => ({}) };
  };
  try {
    initCutEditor({ getElementById: (id) => (els[id] ||= fakeEl()) });
    els['cut-preview'].duration = 5;
    await els['cut-preview'].fire('loadedmetadata');
    els['export-result'].hidden = true;
    await els['export-feed'].fire('click');
    assert.ok(calls.includes('/api/cut/render'), 'export render path should be exercised');
    assert.ok(calls.some((url) => url.startsWith('/api/videos?alt=')), 'save-to-videos upload should be exercised');
    return { els, toast };
  } finally {
    Object.assign(globalThis, previous);
  }
}

test('upload HTTP 500 with server error gives the maker a refusal, not a Post it link', async () => {
  const { els, toast } = await attemptSave({ ok: false, status: 500, json: async () => ({ error: 'Video storage is unavailable.' }) });
  assert.equal(toast.textContent, 'Video storage is unavailable.');
  assert.equal(els['export-post'].href, '');
  assert.equal(els['export-result'].hidden, true);
  assert.notEqual(toast.textContent, 'Your edited video is ready. Tap "Post it".');
});

test('upload HTTP 500 with unreadable body uses the status fallback, not a Post it link', async () => {
  const { els, toast } = await attemptSave({ ok: false, status: 500, json: async () => { throw new Error('no JSON body'); } });
  assert.equal(toast.textContent, 'Could not save the export to your videos (500).');
  assert.equal(els['export-post'].href, '');
  assert.equal(els['export-result'].hidden, true);
  assert.notEqual(toast.textContent, 'Your edited video is ready. Tap "Post it".');
});
