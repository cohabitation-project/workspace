// Composer mode is one value: the current #compose data-mode, also read by feed.js on submit.
// Round 60 began as a reproduction of the legacy media-pill -> Sell collision. While this test was
// being written, PR #306's composer replaced media-pill/#sell-form/listing-select with data-cx-mode.
// These checks pin the current contract and prove that Post, Music and Link are not coerced to Sell.
// No browser, network, form submission or product-library patch is involved.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const server = read('lib/feedv2.mjs');
const feed = read('public/feed.js');
const identity = read('public/feed-identity.js');
const feedv2 = read('public/feedv2.js');

test('the shipped composer exposes explicit modes and keeps the posting form on the same data-mode', () => {
  assert.match(server, /id="compose"[^>]*data-mode="post"/);
  for (const mode of ['post', 'music', 'link', 'sell']) {
    assert.match(server, new RegExp(`data-cx-mode="\\$\\{k\\}"`), 'mode buttons are rendered from the mode list');
    assert.ok(server.includes(`['${mode}',`), `server renders the ${mode} choice`);
  }
  assert.match(identity, /composer\.dataset\.mode = mode/);
  assert.match(feed, /const sellMode = \(\) => form\.dataset\.mode === 'sell';/);
  for (const source of [feed, identity, feedv2]) {
    assert.doesNotMatch(source, /window\.COHABI\.composerMode\s*=\s*['"]sell['"]/, 'no document-level handler forces Sell');
  }
});

class ClassList {
  constructor() { this.names = new Set(); }
  add(name) { this.names.add(name); }
  remove(name) { this.names.delete(name); }
  toggle(name, force) { if (force) this.names.add(name); else this.names.delete(name); }
}
class Element {
  constructor(id = '') {
    this.id = id; this.dataset = {}; this.attributes = {}; this.hidden = true;
    this.classList = new ClassList(); this.textContent = ''; this.value = '';
    this.listeners = {}; this.modeButtons = null; this.postButton = null;
  }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  querySelectorAll(selector) { return selector === '[data-cx-mode]' ? (this.modeButtons || []) : []; }
  querySelector(selector) { return selector === '.cx-post' ? this.postButton : null; }
  focus() {}
  closest(selector) {
    if (selector === '[data-cx-mode]' && this.dataset.cxMode) return this;
    return null;
  }
}

function legacyCollisionHarness() {
  const composer = new Element('compose');
  const scrim = new Element('cx-scrim');
  const text = new Element('c-text');
  const title = new Element('cx-title');
  const post = new Element('post-button');
  const modes = ['post', 'music', 'link', 'sell'].map((mode) => {
    const button = new Element(`${mode}-button`); button.dataset.cxMode = mode; return button;
  });
  composer.modeButtons = modes; composer.postButton = post;
  const byId = { compose: composer, 'cx-scrim': scrim, 'c-text': text, 'cx-title': title };
  const document = {
    activeElement: null,
    body: new Element('body'),
    listeners: {},
    getElementById: (id) => byId[id] || null,
    addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); },
  };
  const window = { COHABI: {} };
  const context = vm.createContext({ document, window, location: { hash: '' }, console });
  // Execute the real current mode controller, stopping before unrelated upload/camera/preview setup.
  // Function bodies may mention later declarations (stopCam/startCam); none of those paths is called here.
  const cut = "  byId('fx-write')?.addEventListener";
  const end = identity.indexOf(cut);
  assert.ok(end > 0, 'the real mode-controller boundary is still present');
  const controller = `${identity.slice(0, end)}\n}\n`;
  vm.runInContext(controller, context, { filename: 'feed-identity.js#mode-controller' });
  context.form = composer; // feed.js names the same #compose element `form`.
  const sellModeSource = feed.match(/const sellMode = \(\) => form\.dataset\.mode === 'sell';/)?.[0];
  assert.ok(sellModeSource, 'execute feed.js\'s real Sell predicate, not a copy');
  vm.runInContext(sellModeSource, context, { filename: 'feed.js#sellMode' });
  return {
    composer, modes, post, title, window,
    click(button) {
      const event = { target: button, preventDefault() {} };
      for (const listener of document.listeners.click || []) listener(event);
    },
    sellMode() { return vm.runInContext('sellMode()', context); },
  };
}

test('Post, Music and Link stay in their own modes; only Sell makes feed.js sell', () => {
  const h = legacyCollisionHarness();
  for (const mode of ['post', 'music', 'link', 'sell']) {
    const button = h.modes.find((candidate) => candidate.dataset.cxMode === mode);
    h.click(button);
    assert.equal(h.composer.dataset.mode, mode, `${mode} is not overwritten by a global Sell handoff`);
    assert.equal(h.sellMode(), mode === 'sell', `feed.js Sell predicate for ${mode}`);
    assert.equal(h.window.COHABI.composerMode, undefined, 'the current controller does not use the old global');
    assert.equal(h.post.textContent, mode === 'sell' ? 'Publish →' : 'Post →');
    for (const candidate of h.modes) {
      assert.equal(candidate.attributes['aria-pressed'], String(candidate === button), `${mode}: aria-pressed follows the choice`);
    }
  }
  assert.equal(h.title.textContent, 'Sell or offer something');
});
