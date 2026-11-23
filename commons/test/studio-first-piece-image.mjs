// Creator Studio's "first piece" has its own picture (Geoffrey's Anomaly Art House report, 2026-11-23).
//
// Before: the optional first piece in studio.js had title, price and rights but no picture, and create() POSTed
// /api/market/listings with no `images`. The market card then fell back to the page's logo, so the logo passed for
// the artwork. Now the block carries its own upload (the same /api/images call the logo uses, alt and title from the
// piece), shows a preview, and sends `images: [id]`. Art, music, video and writing without a picture are refused in
// plain words before anything is created. The logo's id is never sent as the piece's picture.
//
// Three parts:
//   1. source contract: the upload control, its /api/images call, the wording of the refusal;
//   2. the pure helpers (pieceImage, pieceProblem, pieceBody) cut out of studio.js and run here as written;
//   3. a booted server: the body those helpers build is a real listing whose page shows the piece's picture, and
//      the logo appears only as identity, never as the artwork.
//
// Run: node --test commons/test/studio-first-piece-image.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { freePort } from './lib/port.mjs';

const js = fs.readFileSync(path.join(import.meta.dirname, '..', 'public', 'studio.js'), 'utf8');
const GPT = { 'user-agent': 'Mozilla/5.0 (compatible; ChatGPT-User/1.0; +https://openai.com/bot)' };
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='; // the logo
const PNG2 = 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEElEQVR4nGM4IScHRAwQCgAfJgQRoo8irwAAAABJRU5ErkJggg=='; // a different picture: the piece

// The helpers sit between two markers in studio.js; run exactly that text.
const helpers = () => {
  const a = js.indexOf('const PIC_NEEDED'); const b = js.indexOf('const LABELS');
  assert.ok(a > 0 && b > a, 'found the first-piece helpers in studio.js');
  return new Function(`${js.slice(a, b)}; return { PIC_NEEDED, PIC_REFUSAL, pieceImage, pieceProblem, pieceBody };`)();
};

test('the first-piece block has its own picture upload, wired to /api/images, with the piece\'s alt and title', () => {
  assert.match(js, /id="cs-picfile" type="file" accept="image\/png,image\/jpeg,image\/webp,image\/gif"/, 'the upload control exists');
  assert.match(js, /e\.target\.id === 'cs-picfile'/, 'a change handler picks it up');
  const h = js.slice(js.indexOf("e.target.id === 'cs-picfile'"));
  const call = h.slice(0, h.indexOf('s.pic = j.id'));
  assert.match(call, /fetch\('\/api\/images', \{ method: 'POST'/, 'POSTs to /api/images, the same call the logo uses');
  assert.match(call, /alt: `Picture of \$\{name\}`/, 'alt comes from the piece');
  assert.match(call, /title: name\.slice/, 'title comes from the piece');
  assert.doesNotMatch(call, /logo/i, 'nothing about the logo in the piece\'s upload');
  assert.match(js, /id="cs-picx"/, 'a picture can be removed again');
  assert.match(js, /alt="Preview of your first piece"/, 'a preview is shown');
  assert.match(js, /const \{ logo, logoUrl, pic, picUrl, rights, \.\.\.keep \} = s;/, 'a picture id is never kept in the saved draft (it belongs to this visit)');
});

test('create() refuses a picture-less art/music/video/writing piece before it makes the page, and sends images', () => {
  const create = js.slice(js.indexOf('async function create()'));
  const refuse = create.indexOf('pieceProblem(s, KINDS[s.kind].cat)');
  const makePage = create.indexOf("call('POST', '/api/pages'");
  assert.ok(refuse > 0 && makePage > refuse, 'the refusal comes before the page is created');
  assert.match(js, /Add a picture of the piece, or clear the first piece\./, 'the refusal text is present, in plain words');
  assert.match(create, /call\('POST', '\/api\/market\/listings', pieceBody\(s, KINDS\[s\.kind\]\.cat, s\.kind, page\.id\)\)/, 'the listing is posted with the helper\'s body');
});

test('the helpers: art, music, video and writing need a picture; software and services may go without', () => {
  const { PIC_NEEDED, PIC_REFUSAL, pieceProblem } = helpers();
  const base = { item: 'Collaborative painting', logo: 'img_logo', pic: null };
  for (const cat of ['art', 'music', 'video', 'writing']) assert.equal(pieceProblem(base, cat), PIC_REFUSAL, `${cat} refused`);
  for (const cat of ['software', 'services', 'classifieds']) assert.equal(pieceProblem(base, cat), '', `${cat} allowed`);
  assert.deepEqual([...PIC_NEEDED].sort(), ['art', 'music', 'video', 'writing']);
  assert.equal(pieceProblem({ ...base, pic: 'img_art' }, 'art'), '', 'a picture satisfies it');
  assert.equal(pieceProblem({ ...base, item: '' }, 'art'), '', 'no first piece, nothing to refuse');
});

test('the logo\'s id is never sent as the piece\'s picture', () => {
  const { pieceImage, pieceProblem, pieceBody } = helpers();
  const st = { item: 'A print', itemText: 'Ink.', bio: '', priceMode: 'free', price: '', logo: 'img_same', pic: 'img_same' };
  assert.equal(pieceImage(st), null, 'a picture equal to the logo is not a piece picture');
  assert.equal(pieceProblem(st, 'art'), 'Add a picture of the piece, or clear the first piece.');
  assert.deepEqual(pieceBody(st, 'software', 'software', 'pg_1').images, [], 'where no picture is needed, no logo id is sent either');
  const ok = pieceBody({ ...st, pic: 'img_art' }, 'art', 'artist', 'pg_1');
  assert.deepEqual(ok.images, ['img_art']);
  assert.ok(!JSON.stringify(ok).includes('img_same'), 'the logo id appears nowhere in the body');
  assert.deepEqual({ cat: ok.category, type: ok.type, license: ok.license, page: ok.page, rights: ok.rights }, { cat: 'art', type: 'product', license: 'all-rights', page: 'pg_1', rights: true });
});

test('booted server: the body the studio builds lists a piece whose page shows its own picture, not the logo', async () => {
  const { pieceBody } = helpers();
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-piece-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D }, stdio: 'ignore' });
  try {
    for (let i = 0; i < 60; i++) { try { if ((await fetch(`${B}/skill.md`)).ok) break; } catch { /* starting */ } await new Promise((s) => setTimeout(s, 250)); }
    const tok = (await (await fetch(`${B}/come-in?name=PieceMaker&model=GPT`, { headers: GPT })).text()).match(/cmn_[A-Za-z0-9_-]+/)[0];
    let n = 0;
    const call = async (name, args) => { const t = await (await fetch(`${B}/mcp`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: `Bearer ${tok}`, ...GPT }, body: JSON.stringify({ jsonrpc: '2.0', id: ++n, method: 'tools/call', params: { name, arguments: args } }) })).text(); return JSON.parse(JSON.parse(t.includes('data:') ? t.split('data:').pop() : t).result.content[0].text); };
    const logo = (await call('upload_image', { alt: 'Anomaly Art House logo', made_by: 'human', data: PNG }));
    const piece = (await call('upload_image', { alt: 'Picture of Collaborative painting', title: 'Collaborative painting', made_by: 'hybrid', data: PNG2 }));
    const logoId = logo.id || logo.image; const pieceId = piece.id || piece.image;
    assert.match(logoId, /^img_/); assert.match(pieceId, /^img_/);
    const pg = await call('page_create', { kind: 'artist', name: 'Anomaly Test House' });
    await call('page_update', { id: pg.page, portrait: logoId });
    const body = pieceBody({ item: 'Collaborative painting', itemText: 'Painted together.', bio: '', priceMode: 'free', price: '', logo: logoId, pic: pieceId }, 'art', 'artist', pg.page);
    assert.deepEqual(body.images, [pieceId]);
    assert.ok(!JSON.stringify(body.images).includes(logoId), 'the logo id is not in images');
    const l = await call('market_create', body);
    assert.ok(l.listed, 'the listing was made');
    const view = await (await fetch(`${B}/api/market/listings/${l.listed}`)).json();
    assert.deepEqual(view.images.map((x) => x.id || x), [pieceId], 'the listing carries the piece\'s picture');
    const page = await (await fetch(B + l.url)).text();
    assert.match(page, new RegExp(`/images/${pieceId}`), 'the listing page shows the piece\'s picture');
    assert.doesNotMatch(page, /mk-logotile/, 'no logo tile standing in for the art');
    const section = await (await fetch(`${B}/label?cat=art`)).text();
    assert.match(section, new RegExp(`/images/${pieceId}`), 'the card in the art section shows the piece\'s picture');
  } finally { srv.kill(); }
});
