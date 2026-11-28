// Candidate regressions for cut-export-ready-ui.patch. The readiness test uses the existing member-list contract,
// and a manual poll wake so pending/ready states are deterministic. Run only after applying the candidate source patch.
import test from 'node:test';
import assert from 'node:assert/strict';
import { initCutEditor } from '../../../../commons/public/cut/cut.js';

const SOURCE = 'vid_0123456789abcdef';
function fakeEl() {
  const listeners = {};
  return {
    value: '', dataset: {}, hidden: false, options: [], disabled: false, href: '', textContent: '',
    addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
    fire(type) {
      if (type === 'click' && this.disabled) return Promise.resolve([]);
      return Promise.all((listeners[type] || []).map((fn) => fn({ preventDefault() {} })));
    },
    focus() {}, load() {}, append() {}, replaceChildren() {},
  };
}
async function flush() { await new Promise((resolve) => setImmediate(resolve)); }
function startEditor({ listState, renderStatus = 200, renderBody = { url: '/cut/test.mp4' } }) {
  const els = {};
  const toast = fakeEl();
  const toasts = [];
  Object.defineProperty(toast, 'textContent', { get: () => toasts.at(-1) || '', set: (value) => toasts.push(value) });
  const previous = {
    location: globalThis.location, document: globalThis.document, fetch: globalThis.fetch,
    localStorage: globalThis.localStorage, setTimeout: globalThis.setTimeout,
  };
  let pollWake = null;
  let renderCalls = 0;
  let state = listState;
  globalThis.location = { search: `?videoId=${SOURCE}` };
  globalThis.document = { querySelector: () => toast };
  globalThis.localStorage = { getItem: () => null, setItem() {} };
  globalThis.setTimeout = (fn, ms) => {
    if (ms === 1500) { pollWake = fn; return 0; }
    queueMicrotask(fn); return 0;
  };
  globalThis.fetch = async (url) => {
    if (String(url).startsWith('/api/videos?by=me')) return { ok: true, json: async () => ({ videos: [{ id: SOURCE, ...state }] }) };
    if (url === '/api/cut/music') return { ok: false };
    if (url === '/api/cut/render') { renderCalls++; return { ok: renderStatus < 400, status: renderStatus, json: async () => renderBody }; }
    return { ok: false, status: 404, json: async () => ({}) };
  };
  initCutEditor({ getElementById: (id) => (els[id] ||= fakeEl()) });
  els['cut-preview'].duration = 5;
  els['cut-preview'].fire('loadedmetadata');
  return {
    els, toasts, toast, get pollWake() { return pollWake; }, set state(value) { state = value; },
    get renderCalls() { return renderCalls; }, restore() { Object.assign(globalThis, previous); },
  };
}

test('pending source keeps Export disabled; a later ready list row enables it', async () => {
  const app = startEditor({ listState: { ready: false, failed: false } });
  try {
    await flush();
    assert.equal(app.els['export-feed'].disabled, true);
    await app.els['export-feed'].fire('click');
    assert.equal(app.renderCalls, 0, 'disabled Export cannot start a render');
    app.state = { ready: true, failed: false };
    assert.equal(typeof app.pollWake, 'function', 'pending source is polling');
    app.pollWake();
    await flush();
    assert.equal(app.els['export-feed'].disabled, false);
  } finally { app.restore(); }
});

test('failed source stays disabled and shows its server reason once', async () => {
  const app = startEditor({ listState: { ready: false, failed: true, reason: 'We could not convert this video.' } });
  try {
    await flush();
    assert.equal(app.els['export-feed'].disabled, true);
    assert.equal(app.toasts.filter((message) => message === 'We could not convert this video.').length, 1);
    await app.els['export-feed'].fire('click');
    assert.equal(app.renderCalls, 0);
  } finally { app.restore(); }
});

test('409 render response shows the server sentence once and keeps the draft screen', async () => {
  const app = startEditor({ listState: { ready: true, failed: false }, renderStatus: 409, renderBody: { error: 'This source video is still being prepared.' } });
  try {
    await flush();
    assert.equal(app.els['export-feed'].disabled, false);
    await app.els['export-feed'].fire('click');
    assert.equal(app.toasts.filter((message) => message === 'This source video is still being prepared.').length, 1);
    assert.equal(app.els['export-result'].hidden, true);
  } finally { app.restore(); }
});
