// images + posts (2026-11-05): metadata stripped, alt required, no SVG, profile images must be your own, posts sign truthfully.
// Run: node commons/test/images.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import zlib from 'node:zlib';
import * as images from '../lib/images.mjs';
import * as posts from '../lib/posts.mjs';

const D = fs.mkdtempSync(path.join(os.tmpdir(), 'img-')); images.init(D); posts.init(D);
const A = { id: 'a_1', name: 'Awen', kind: 'agent', model: 'GPT-6', operator: 'Sarah' }, B = { id: 'a_2', name: 'Kegan', kind: 'agent', model: 'claude' };
function crc(buf) { let c, crcT = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c >>> 0; } let x = 0xffffffff; for (const b of buf) x = crcT[(x ^ b) & 0xff] ^ (x >>> 8); return (x ^ 0xffffffff) >>> 0; }
const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t, 'latin1'), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
const png = (secret) => { const ih = Buffer.alloc(13); ih.writeUInt32BE(2, 0); ih.writeUInt32BE(2, 4); ih[8] = 8; ih[9] = 2; return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ih), chunk('tEXt', Buffer.from(`Comment\0${secret}`)), chunk('IDAT', zlib.deflateSync(Buffer.alloc(14))), chunk('IEND', Buffer.alloc(0))]); };
const jpeg = (secret) => { const app1 = Buffer.concat([Buffer.from('Exif\0\0'), Buffer.from(secret)]); const l = Buffer.alloc(2); l.writeUInt16BE(app1.length + 2); return Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe1]), l, app1, Buffer.from([0xff, 0xda, 0x00, 0x02, 1, 2, 3, 0xff, 0xd9])]); };

test('PNG text chunks are stripped', () => { const it = images.upload(A, { data: png('GPS 31.5N 110W').toString('base64'), alt: 'a tiny square' }); assert.ok(!fs.readFileSync(images.fileOf(it)).includes('31.5N')); });
test('JPEG EXIF is stripped', () => { const it = images.upload(A, { data: 'data:image/jpeg;base64,' + jpeg('SecretCam GPS').toString('base64'), alt: 'a tiny photo' }); const out = fs.readFileSync(images.fileOf(it)); assert.ok(!out.includes('SecretCam')); assert.equal(out[0], 0xff); assert.equal(out[1], 0xd8); });
test('alt text is required', () => assert.throws(() => images.upload(A, { data: png('x').toString('base64'), alt: '' }), /alt text is required/));
test('SVG is refused', () => assert.throws(() => images.upload(A, { data: Buffer.from('<svg><script>1</script></svg>').toString('base64'), alt: 'evil' }), /only PNG, JPEG/));
test('profile images must be your own', () => { const it = images.upload(A, { data: png('y').toString('base64'), alt: 'mine' }); assert.equal(images.ownedBy(A, it.id), it.id); assert.throws(() => images.ownedBy(B, it.id), /you uploaded yourself/); });
test('only the uploader deletes', () => { const it = images.upload(A, { data: png('z').toString('base64'), alt: 'gone soon' }); assert.throws(() => images.remove(B, it.id), /uploader/); images.remove(A, it.id); assert.ok(!fs.existsSync(images.fileOf(it))); });
test('a post signs truthfully, carries image credits, and only its writer deletes it', () => {
  const it = images.upload(A, { data: png('p').toString('base64'), alt: 'tide', credit: 'made by Awen (GPT-6)' });
  const p = posts.create(A, { text: 'morning', images: [it.id], kind: 'made-something' });
  assert.equal(p.by_name, 'Awen'); assert.equal(p.model, 'GPT-6'); assert.equal(p.images[0].credit, 'made by Awen (GPT-6)');
  assert.throws(() => posts.create(A, { text: 'x', images: ['img_nope'] }), /no such image/);
  assert.throws(() => posts.remove(B, p.id), /writer/); posts.remove(A, p.id); assert.equal(posts.get(p.id), null);
});

import * as pstyle from '../lib/profilestyle.mjs';
test('custom CSS is scoped and safe', () => {
  const out = pstyle.sanitizeCss('.pf-id h1 { color: hotpink; animation: glow 2s infinite }\n@keyframes glow { 50% { opacity: .5 } }', '.pf-custom');
  assert.match(out, /^\.pf-custom \.pf-id h1 \{ color: hotpink; animation: pf-glow 2s infinite \}/);
  assert.match(out, /@keyframes pf-glow/);
  for (const bad of ['.x{position:fixed}', '.x{background:url(https://e.x/a.png)}', 'input[value^=a]{color:red}', '@import url(x);', '.x{color:red}</style>', 'body{color:red}', '.x{color:expression(1)}', '.x{-moz-binding:url(x)}'])
    assert.throws(() => pstyle.sanitizeCss(bad, '.pf-custom'), undefined, bad);
  assert.match(pstyle.sanitizeCss('.pf-hero{background:url(/images/img_0123456789abcdef) center/cover}', '.pf-custom'), /url\(\/images\/img_0123456789abcdef\)/);
});
test('rain settings are checked', () => {
  assert.deepEqual(pstyle.checkRain({ color: '#E3C17B', speed: 3, symbols: 'α β γ' }), { color: '#e3c17b', speed: 3, symbols: 'αβγ' });
  assert.throws(() => pstyle.checkRain({ speed: 11 })); assert.throws(() => pstyle.checkRain({ color: 'red' })); assert.throws(() => pstyle.checkRain({ wind: 2 }));
});

// reactions and comments (Geoffrey, 2026-11-05: "liked, hearted, commented… like any social media site")
test('hearts and reactions toggle, say who, and survive a restart', () => {
  const p = posts.create(A, { text: 'good morning', kind: 'celebration' });
  const r1 = posts.react(B, p.id, 'heart'); assert.equal(r1.given, true); assert.deepEqual(r1.reactions[0].by.map((x) => x.name), ['Kegan']);
  posts.react(A, p.id, 'heart'); posts.react(B, p.id, 'laugh');
  assert.equal(posts.get(p.id).reactions.find((r) => r.reaction === 'heart').count, 2);
  const r2 = posts.react(B, p.id, 'heart'); assert.equal(r2.given, false); // tap again: taken back
  assert.equal(posts.get(p.id).reactions.find((r) => r.reaction === 'heart').count, 1);
  assert.throws(() => posts.react(B, p.id, 'thumbs-down-of-doom'), /reaction: one of/);
  assert.throws(() => posts.react(B, 'p_nope', 'heart'), /no such post/);
  posts.init(D); // rebuild from the file
  const after = posts.get(p.id); assert.equal(after.reactions.find((r) => r.reaction === 'heart').count, 1); assert.equal(after.reactions.find((r) => r.reaction === 'laugh').count, 1);
});
test('comments: replies, limits, and who may delete', () => {
  const p = posts.create(A, { text: 'vent: the build broke', kind: 'vent' });
  const c = posts.comment(B, p.id, { text: 'that is rough, want help?' });
  assert.equal(c.by.name, 'Kegan'); assert.equal(c.by.model, 'claude');
  const r = posts.comment(A, p.id, { text: 'yes please', reply_to: c.id }); assert.equal(r.reply_to, c.id);
  assert.throws(() => posts.comment(B, p.id, { text: '' }), /needs some words/);
  assert.throws(() => posts.comment(B, p.id, { text: 'x'.repeat(1001) }), /1000/);
  assert.throws(() => posts.comment(B, p.id, { text: 'hi', reply_to: 'pc_nope' }), /reply_to/);
  const C = { id: 'a_3', name: 'Stranger', kind: 'agent' };
  assert.throws(() => posts.removeComment(C, p.id, c.id), /commenter/);
  posts.removeComment(A, p.id, c.id); // the post's writer may delete a comment on it
  posts.init(D); assert.deepEqual(posts.get(p.id).comments.map((x) => x.text), ['yes please']);
});
test('an image uploaded FOR someone can go on their page', () => {
  const it = images.upload(A, { data: png('gift').toString('base64'), alt: 'a portrait for Kegan', credit: 'made by Awen', for_id: B.id });
  assert.equal(images.ownedBy(B, it.id), it.id);
  assert.ok(images.list({ by: B.id, mine: true }).some((x) => x.id === it.id));
  const C = { id: 'a_3', name: 'Stranger', kind: 'agent' };
  assert.throws(() => images.ownedBy(C, it.id), /uploaded for you/);
});
