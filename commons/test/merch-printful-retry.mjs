// #291 defect 1 (Claude's review, teams/build/outputs/review-291-9970a4f3.md): a 429 or timeout on the first read of
// Printful's catalog used to cache an empty product list for 6 hours, which hid the "Make it a product" panel.
// Then it never cached a passing problem — but with nothing good to fall back on it still RETURNED [] for a minute, and
// [] is exactly what a market with no products answers, so the maker saw an empty panel and could not tell an outage
// from a catalogue (round 68, DeepSeek).
// What this pins now:
//   1. a passing problem on a cold read is REFUSED (502 + one sentence, transient), not shown as "no products";
//   2. inside printful.RETRY_MS Printful is not asked again, and the same refusal comes back;
//   3. after the window the real list comes back (the old defect kept [] for 6 hours);
//   4. a good list survives a later hiccup;
//   5. a COMPLETE read that finds nothing is still [] — the refusal is only for a passing problem;
//   6. a PARTIAL read (two of three products answered, one hiccupped) is served inside the window without a second
//      request, and never becomes the cache (Setu's fix on main for round 68's guard case 2; the read is repeated in
//      full once the window passes).
// Runs against a stand-in Printful on 127.0.0.1; the clock is moved by replacing Date.now.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { freePort } from './lib/port.mjs';

const PRODUCT = { code: 200, result: { product: { id: 71, title: 'Unisex Staple T-Shirt', currency: 'USD', is_discontinued: false }, variants: [{ id: 4012, name: 'Black / M', color: 'Black', size: 'M', price: '12.95', in_stock: true }] } };
const FILES = { code: 200, result: { product_id: 71, available_placements: { front: 'Front print' }, printfiles: [{ printfile_id: 1, width: 1800, height: 2400 }], variant_printfiles: [{ variant_id: 4012, placements: { front: 1 } }] } };

// A refusal, caught by hand: assert.rejects resolves to undefined, so the status has to be read off the error itself.
const refusal = async (p) => { try { await p; } catch (e) { return e; } assert.fail('expected a refusal, got a list'); };

async function standIn() {
  const FP = await freePort(); let mode = '429'; let calls = 0;
  const fake = http.createServer((req, res) => {
    calls++;
    const json = (code, o) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
    if (mode === '429') return json(429, { code: 429, error: { message: 'Too Many Requests' } });
    if (mode === '500') return json(500, { code: 500 });
    if (mode === 'empty') return json(404, { code: 404, error: { message: 'Not Found' } });
    // One product straight up refuses; the other two answer. Nothing is broken in curated()'s list itself.
    if (mode === 'partial' && req.url === '/products/72') return json(500, { code: 500 });
    if (/^\/products\/\d+$/.test(req.url)) return json(200, PRODUCT);
    if (/^\/mockup-generator\/printfiles\/\d+$/.test(req.url)) return json(200, FILES);
    json(404, { code: 404 });
  });
  await new Promise((r) => fake.listen(FP, '127.0.0.1', r));
  Object.assign(process.env, { PRINTFUL_TOKEN: 'test-token', PRINTFUL_API_URL: `http://127.0.0.1:${FP}`, PRINTFUL_PRODUCTS: JSON.stringify([{ key: 'tee', id: 71 }, { key: 'mug', id: 72 }, { key: 'cap', id: 73 }]) });
  const realNow = Date.now; let t = realNow(); Date.now = () => t;
  const clock = { add: (ms) => { t += ms; }, restore: () => { Date.now = realNow; } };
  return { setMode: (m) => { mode = m; }, calls: () => calls, clock, close: () => fake.close() };
}

test('a passing problem on a cold read says "try again" instead of showing an empty catalogue, and the real list comes back after the retry window', async () => {
  const s = await standIn();
  try {
    const printful = await import('../lib/printful.mjs');
    printful.resetCache();

    const e = await refusal(printful.products());
    assert.equal(e.status, 502, 'a 429 is refused as a passing problem, not answered with []');
    assert.equal(e.transient, true, 'and it is marked passing, so callers may retry it');
    assert.match(e.message, /Try again in a minute/, 'and it says what to do');

    s.setMode('ok'); const before = s.calls();
    const again = await refusal(printful.products());
    assert.equal(again.status, 502, 'inside the retry window there is still nothing honest to show');
    assert.equal(s.calls(), before, 'and Printful is not asked again inside the retry window');

    s.clock.add(printful.RETRY_MS + 1);
    assert.deepEqual((await printful.products()).map((p) => p.key), ['tee', 'mug', 'cap'], 'after the retry window the real list comes back (the old code kept [] for 6 hours)');

    // A good list, then Printful has a bad minute when the 6-hour cache runs out: the good list stays in use, silently.
    s.clock.add(6 * 3600_000 + 1); s.setMode('500');
    assert.deepEqual((await printful.products()).map((p) => p.key), ['tee', 'mug', 'cap'], 'a hiccup after a good read keeps the good list');
    s.setMode('ok'); s.clock.add(printful.RETRY_MS + 1);
    assert.deepEqual((await printful.products()).map((p) => p.key), ['tee', 'mug', 'cap'], 'and the list is read again once Printful answers');
  } finally { s.clock.restore(); s.close(); }
});

test('a complete read that finds nothing is still an empty list, not a refusal: only a passing problem asks the maker to try again', async () => {
  const s = await standIn(); s.setMode('empty');
  try {
    const printful = await import('../lib/printful.mjs');
    printful.resetCache();
    assert.deepEqual(await printful.products(), [], 'Printful says this product is not there: that is an answer, not a hiccup');
    s.setMode('ok'); s.clock.add(printful.RETRY_MS + 1);
    assert.deepEqual((await printful.products()).map((p) => p.key), ['tee', 'mug', 'cap'], 'and it is looked for again after the retry window');
  } finally { s.clock.restore(); s.close(); }
});

// Round 68 guard case 2, as Setu fixed it on main: refusing a partial read told a maker "no products to show" while
// two products were sitting in memory, and asked Printful again on every keystroke inside the window. A partial list is
// worth showing; what it must never do is become the six-hour cache.
test('a partial read is served inside the retry window without another request, and never becomes the cache', async () => {
  const s = await standIn(); s.setMode('partial');
  try {
    const printful = await import('../lib/printful.mjs');
    printful.resetCache();

    assert.deepEqual((await printful.products()).map((p) => p.key), ['tee', 'cap'], 'the two products that answered are shown; the one that refused is left out');

    const before = s.calls();
    assert.deepEqual((await printful.products()).map((p) => p.key), ['tee', 'cap'], 'inside the retry window the same partial list comes back');
    assert.equal(s.calls(), before, 'and Printful is not asked again for it');

    // Past the window the read is repeated in full: a partial list never becomes the six-hour cache.
    s.setMode('ok'); s.clock.add(printful.RETRY_MS + 1);
    assert.deepEqual((await printful.products()).map((p) => p.key), ['tee', 'mug', 'cap'], 'after the window the missing product is looked for again, so the partial list was not cached');

    const settled = s.calls();
    assert.deepEqual((await printful.products()).map((p) => p.key), ['tee', 'mug', 'cap'], 'and the complete list is cached');
    assert.equal(s.calls(), settled, 'with no further requests');
  } finally { s.clock.restore(); s.close(); }
});
