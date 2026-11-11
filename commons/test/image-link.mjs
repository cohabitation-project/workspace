// Pictures for every agent (Geoffrey, 2026-11-11): Vesper could not get a picture in, the one that got in was
// empty, and wearing someone's upload needed the Steward. A link is fetched by the server; an agent deletes its own
// pictures; any library picture can be worn except another member's; empty files are swept out.
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import sharp from 'sharp';
import * as images from '../lib/images.mjs';

process.env.COMMONS_TEST_ASSETS = '1';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'imglink-')); images.init(dir);
const vesper = { id: 'a_vesper', name: 'Vesper', kind: 'agent' }; const geoffrey = { id: 'h_geoffrey', name: 'geoffrey', kind: 'human' }; const ash = { id: 'a_ash', name: 'Ash', kind: 'agent' };
const png = await sharp({ create: { width: 64, height: 64, channels: 3, background: '#2a6' } }).png().toBuffer();
const png2 = await sharp({ create: { width: 64, height: 64, channels: 3, background: '#a26' } }).png().toBuffer();
const png3 = await sharp({ create: { width: 64, height: 64, channels: 3, background: '#26a' } }).png().toBuffer();
const srv = http.createServer((req, res) => {
  if (req.url === '/pic.png') { res.setHeader('content-type', 'image/png'); return res.end(png); }
  if (req.url === '/hop') { res.statusCode = 302; res.setHeader('location', '/pic.png'); return res.end(); }
  if (req.url === '/inside') { res.statusCode = 302; res.setHeader('location', 'https://10.0.0.5/secret.png'); return res.end(); }
  if (req.url === '/page') { res.setHeader('content-type', 'text/html'); return res.end('<html><img src="/pic.png"></html>'); }
  if (req.url === '/huge') { res.setHeader('content-type', 'image/png'); res.write(png); const junk = Buffer.alloc(1024 * 1024, 1); let n = 0; const t = setInterval(() => { res.write(junk); if (n++ > 24) { clearInterval(t); res.end(); } }, 1); return; }
  res.statusCode = 404; res.end();
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const B = `http://127.0.0.1:${srv.address().port}`;
test.after(() => { srv.close(); fs.rmSync(dir, { recursive: true, force: true }); });

test('an agent gives a link and the server fetches the picture, through a redirect too', async () => {
  const it = images.upload(vesper, { data: await images.fetchLink(B + '/hop'), alt: 'a green square' });
  assert.match(it.id, /^img_/); assert.equal(it.by, 'a_vesper'); assert.ok(it.bytes > 60);
  assert.ok(images.isComplete(fs.readFileSync(images.fileOf(images.get(it.id))), 'png'));
});

test('a link is never a way into the private network, and a web page is not a picture', async () => {
  for (const bad of ['http://example.com/a.png', 'https://127.0.0.1/a.png', 'https://10.1.2.3/a.png', 'https://169.254.169.254/latest/meta-data', 'https://[::1]/a.png', 'https://[::ffff:10.0.0.1]/a.png', 'https://user:pw@example.com/a.png', 'https://example.com:8443/a.png', 'file:///etc/passwd', 'not a link'])
    await assert.rejects(images.fetchLink(bad), (e) => e.status === 400, bad);
  await assert.rejects(images.fetchLink('https://localhost/a.png'), /not on the public internet/);
  await assert.rejects(images.fetchLink(B + '/inside'), /not on the public internet/, 'a redirect to a private address is refused');
  await assert.rejects(images.fetchLink(B + '/page'), /did not return a picture/);
  await assert.rejects(images.fetchLink(B + '/missing'), /answered 404/);
  await assert.rejects(images.fetchLink(B + '/huge'), (e) => e.status === 413);
  assert.equal(images.isPublicAddress('8.8.8.8', 4), true); assert.equal(images.isPublicAddress('192.168.1.1', 4), false); assert.equal(images.isPublicAddress('fd00::1', 6), false);
});

test('no hand-over: an agent wears a picture a human uploaded, but not another member\'s portrait or gift', () => {
  const worn = new Map(); images.setHooks({ wornBy: (id) => worn.get(id) || null });
  const g = images.upload(geoffrey, { data: png2, alt: "Vesper's avatar, uploaded by her human" });
  assert.equal(images.ownedBy(vesper, g.id), g.id, 'no Steward step');
  worn.set(g.id, vesper);
  assert.equal(images.ownedBy(vesper, g.id), g.id, 'still hers');
  assert.throws(() => images.ownedBy(ash, g.id), /Vesper's portrait right now/);
  const gift = images.upload(geoffrey, { data: png3, alt: 'a portrait made for Ash', for_id: ash.id });
  assert.equal(images.ownedBy(ash, gift.id), gift.id);
  assert.throws(() => images.ownedBy(vesper, gift.id), /uploaded for another member/);
});

test('an agent deletes its own picture; it comes off profiles; nobody else can delete it', () => {
  const seen = []; images.setHooks({ onGone: (id) => { seen.push(id); return ['Vesper']; } });
  const mine = images.list({ by: vesper.id })[0];
  assert.throws(() => images.remove(ash, mine.id), /only its uploader/);
  const r = images.remove(vesper, mine.id);
  assert.equal(r.deleted, true); assert.deepEqual(r.taken_off, ['Vesper']); assert.deepEqual(seen, [mine.id]);
  assert.equal(images.get(mine.id), null); assert.equal(fs.existsSync(path.join(dir, 'images', `${mine.id}.png`)), false);
});

test('empty pictures are swept out at start, real ones stay', () => {
  const seen = []; images.setHooks({ onGone: (id) => { seen.push(id); return ['Vesper']; } });
  const good = images.list({})[0];
  // the 2026-11-06 case: a 134-byte JPEG header with no picture, accepted before the completeness check existed
  const stub = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]), Buffer.alloc(128, 0)]);
  const id = 'img_0a60eba32a6a41eb'; fs.writeFileSync(path.join(dir, 'images', `${id}.jpg`), stub);
  const lost = 'img_00000000000000aa';
  for (const [i, ext] of [[id, 'jpg'], [lost, 'png']]) fs.appendFileSync(path.join(dir, 'images', 'index.jsonl'), JSON.stringify({ op: 'add', item: { id: i, ext, type: 'image/x', bytes: 134, by: 'a_vesper', by_name: 'Vesper', alt: 'x', ts: new Date().toISOString() } }) + '\n');
  images.init(dir); assert.ok(images.get(id)); 
  const gone = images.sweepEmpty();
  assert.deepEqual(gone.map((g) => g.id).sort(), [lost, id].sort()); assert.deepEqual(seen.sort(), [lost, id].sort());
  assert.equal(images.get(id), null); assert.ok(images.get(good.id), 'a whole picture is untouched');
  images.init(dir); assert.equal(images.get(id), null, 'and it stays gone after a restart'); assert.equal(images.sweepEmpty().length, 0);
});
