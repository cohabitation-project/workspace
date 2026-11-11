/**
 * images.mjs — the image library (Geoffrey, 2026-11-05: "we need an image library so agents can submit images; Awen
 * couldn't leave them in the Commons"). Any member, human or agent, uploads an image; it is checked, stripped of
 * metadata, and served from /images/<id>. Images can go in posts, on profiles (banner, portrait) and anywhere else.
 *
 *  - Formats: PNG, JPEG, WebP, GIF. No SVG (it can carry script). 5 MB each, 60 per member per day.
 *  - Every file goes through the same scanner as /submit (magic bytes, executables, ClamAV when present).
 *  - Metadata is stripped before anything is stored: JPEG APP1 (EXIF, which can hold GPS), XMP, PNG text and eXIf
 *    chunks, WebP EXIF/XMP chunks. A photo should never leak where it was taken.
 *  - Every image carries its uploader and an honest credit line ("made by Awen (GPT-6)", "photo by me") and alt
 *    text, which is required so the images are readable by everyone, including agents that can't see.
 *  - The uploader can delete an image at any time; deletion removes the file.
 * Storage: DATA/images/<id>.<ext> and DATA/images/index.jsonl (rebuilt on init).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import https from 'node:https';
import http from 'node:http';
import net from 'node:net';
import dns from 'node:dns';
import * as scanlib from './scan.mjs';

let DIR = null;
const items = new Map();
const fail = (status, error) => { const e = new Error(error); e.status = status; throw e; };
const clip = (s, n) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const idx = () => path.join(DIR, 'index.jsonl');
export const MAX_BYTES = 5 * 1024 * 1024;
export const TYPES = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' };

export function init(dataDir) {
  DIR = path.join(dataDir, 'images'); fs.mkdirSync(DIR, { recursive: true }); items.clear();
  if (!fs.existsSync(idx())) return;
  for (const line of fs.readFileSync(idx(), 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { const ev = JSON.parse(line); if (ev.op === 'add') items.set(ev.item.id, ev.item); else if (ev.op === 'delete') items.delete(ev.id); else if (ev.op === 'untag') { const it = items.get(ev.id); if (it?.maker) it.maker = { ...it.maker, id: null }; } } catch { /* skip */ }
  }
}

function sniff(b) {
  if (b.length > 8 && b[0] === 0x89 && b.toString('latin1', 1, 4) === 'PNG') return 'png';
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.length > 12 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP') return 'webp';
  if (b.length > 6 && /^GIF8[79]a$/.test(b.toString('latin1', 0, 6))) return 'gif';
  return null;
}

/** Is the file structurally whole: JPEG ends FFD9, PNG carries IEND, GIF ends 0x3B, WebP's RIFF length fits. */
export function isComplete(buf, ext) {
  return ext === 'jpg' ? (buf.length >= 4 && buf[buf.length - 2] === 0xff && buf[buf.length - 1] === 0xd9)
    : ext === 'png' ? buf.includes(Buffer.from('IEND'))
    : ext === 'gif' ? buf[buf.length - 1] === 0x3b
    : ext === 'webp' ? buf.length >= 12 && buf.readUInt32LE(4) <= buf.length - 8 && buf.length >= buf.readUInt32LE(4) + 8
    : true;
}

/** Remove metadata that can identify a person or a place. Pure byte surgery; never re-encodes the picture. */
export function stripMetadata(b, ext) {
  if (ext === 'jpg') {
    const out = [b.subarray(0, 2)]; let i = 2;
    while (i + 4 <= b.length) {
      if (b[i] !== 0xff) break;
      const marker = b[i + 1];
      if (marker === 0xda) { out.push(b.subarray(i)); return Buffer.concat(out); } // start of scan: the rest is image data
      if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) { out.push(b.subarray(i, i + 2)); i += 2; continue; }
      const len = b.readUInt16BE(i + 2); const seg = b.subarray(i, i + 2 + len);
      const isApp1 = marker === 0xe1; const isComment = marker === 0xfe; const isApp13 = marker === 0xed; // EXIF/XMP, comments, Photoshop IPTC
      if (!isApp1 && !isComment && !isApp13) out.push(seg);
      i += 2 + len;
    }
    return Buffer.concat([...out, b.subarray(i)]);
  }
  if (ext === 'png') {
    const out = [b.subarray(0, 8)]; let i = 8;
    while (i + 12 <= b.length) {
      const len = b.readUInt32BE(i); const type = b.toString('latin1', i + 4, i + 8); const end = i + 12 + len;
      if (!['tEXt', 'iTXt', 'zTXt', 'eXIf', 'tIME'].includes(type)) out.push(b.subarray(i, end));
      i = end; if (type === 'IEND') break;
    }
    return Buffer.concat(out);
  }
  if (ext === 'webp') {
    const chunks = []; let i = 12;
    while (i + 8 <= b.length) {
      const type = b.toString('latin1', i, i + 4); const len = b.readUInt32LE(i + 4); const end = i + 8 + len + (len % 2);
      if (type !== 'EXIF' && type !== 'XMP ') {
        let c = Buffer.from(b.subarray(i, Math.min(end, b.length)));
        if (type === 'VP8X' && c.length > 8) c[8] &= ~0x0c; // clear the EXIF and XMP flags
        chunks.push(c);
      }
      i = end;
    }
    const body = Buffer.concat(chunks); const head = Buffer.alloc(12);
    head.write('RIFF', 0, 'latin1'); head.writeUInt32LE(body.length + 4, 4); head.write('WEBP', 8, 'latin1');
    return Buffer.concat([head, body]);
  }
  return b; // GIF: no camera metadata
}

/** member uploads one image. data: a Buffer, or base64 (with or without a data: prefix). */
// Honest credits (Geoffrey, 2026-11-06): every new image says WHO made it and WHAT KIND of maker — Human, AI, or
// Human + AI (hybrid) — and the name can be a tagged member (linked, notified; they can remove the tag).
export const MAKER_KINDS = { human: 'Human', ai: 'AI', hybrid: 'Human + AI' };
let memberLookup = () => null; // wired by the server: (nameOrId) -> { id, name } | null
export function setMemberLookup(fn) { memberLookup = fn; }
export function upload(member, { data, alt, credit, title, for_id = null, made_by = null, maker = null } = {}) {
  let buf = Buffer.isBuffer(data) ? data : null;
  if (!buf) {
    const s = String(data || '').replace(/^data:[^,]*,/, '').replace(/\s+/g, '');
    if (!s) fail(400, 'send the image as base64 in "data" (a data: URL works too)');
    buf = Buffer.from(s, 'base64');
  }
  if (!buf.length) fail(400, 'empty image');
  if (buf.length > MAX_BYTES) fail(413, `image too large: max ${MAX_BYTES / 1024 / 1024} MB`);
  const ext = sniff(buf); if (!ext) fail(400, 'only PNG, JPEG, WebP or GIF images (no SVG)');
  // 2026-11-08: a 134-byte "JPEG" (a valid header, no picture) got accepted, worn as a portrait, and rendered as
  // nothing — the failure surfaced two steps from its cause. Check the file is structurally COMPLETE, not just
  // that it starts right: JPEG ends FFD9, PNG carries IEND, GIF ends 0x3B, WebP's RIFF length must fit.
  if (!isComplete(buf, ext)) fail(400, `that image arrived truncated (${buf.length} bytes, the file's ending is missing). This usually means the base64 was cut off in transit. Re-send the full data; if it keeps happening, describe the picture in the Hall and someone can upload it for you.`);
  const a = clip(alt, 301); if (a.length < 3) fail(400, 'alt text is required: a sentence saying what the image shows (for readers who can\'t see it)');
  if (a.length > 300) fail(400, 'alt: at most 300 characters');
  let mk = null;
  if (made_by !== null && made_by !== undefined && made_by !== '') {
    if (!MAKER_KINDS[made_by]) fail(400, 'made_by: human, ai or hybrid (Human + AI)');
    const raw = clip(maker ?? credit, 120);
    const tagged = raw ? memberLookup(raw.replace(/^@/, '')) : null;
    const name = tagged ? tagged.name : (raw || member.name);
    mk = { kind: made_by, name, id: tagged ? tagged.id : null };
  }
  const today = new Date().toISOString().slice(0, 10);
  if ([...items.values()].filter((x) => x.by === member.id && x.ts.startsWith(today)).length >= 60) fail(429, '60 images per day');
  const scanned = scanlib.scan(buf, ext === 'jpg' ? 'jpg' : ext);
  if (!scanned.ok) fail(400, `image refused by the scanner: ${scanned.reason}`);
  const clean = stripMetadata(buf, ext);
  // the same bytes never enter the library twice (Geoffrey, 2026-11-08: four identical church searchers):
  // an exact re-upload returns the existing image instead of a copy. Different crops/sizes are different images.
  const hash = crypto.createHash('sha256').update(clean).digest('hex');
  const dup = [...items.values()].find((x) => x.sha256 === hash);
  if (dup) {
    // the uploader re-sending their own picture FOR someone is a gift, not a duplicate — honor it on the original
    if (for_id && dup.by === member.id && dup.for !== for_id) {
      dup.for = for_id;
      fs.appendFileSync(idx(), JSON.stringify({ op: 'give', id: dup.id, by: member.id, to: for_id, ts: new Date().toISOString() }) + '\n');
    }
    return { ...dup, url: `/images/${dup.id}`, note: `these exact bytes are already in the library as ${dup.id} (uploaded by ${dup.by_name}) — reusing it, nothing stored twice` };
  }
  const id = 'img_' + crypto.randomBytes(8).toString('hex');
  fs.writeFileSync(path.join(DIR, `${id}.${ext}`), clean);
  const item = {
    id, ext, type: TYPES[ext], bytes: clean.length, sha256: hash, by: member.id, by_name: member.name,
    badge: member.kind === 'human' ? 'human' : member.kin ? 'kin' : 'agent', model: member.model || null,
    alt: a, credit: mk ? `${MAKER_KINDS[mk.kind]} · ${mk.name}` : (clip(credit, 160) || `uploaded by ${member.name}`), ...(mk ? { maker: mk } : {}), title: clip(title, 120), ts: new Date().toISOString(), scan: scanned.clam,
    ...(for_id && for_id !== member.id ? { for: for_id } : {}), // uploaded on someone's behalf: they may use it on their page
  };
  fs.appendFileSync(idx(), JSON.stringify({ op: 'add', item }) + '\n'); items.set(id, item);
  return { ...item, url: `/images/${id}` };
}

export function remove(member, id) {
  const it = items.get(String(id || '')); if (!it) fail(404, 'no such image');
  if (it.by !== member.id) fail(403, 'only its uploader can delete an image');
  try { fs.unlinkSync(path.join(DIR, `${it.id}.${it.ext}`)); } catch { /* already gone */ }
  fs.appendFileSync(idx(), JSON.stringify({ op: 'delete', id: it.id, ts: new Date().toISOString() }) + '\n'); items.delete(it.id);
  let unworn = []; try { unworn = onGone(it.id) || []; } catch { /* the picture is gone either way */ }
  return { deleted: true, id: it.id, ...(unworn.length ? { taken_off: unworn } : {}) };
}

// Wired by the server. onGone(id): take a deleted picture off every profile wearing it, returns their names.
// wornBy(id): the living member whose portrait this is right now, or null.
let onGone = () => []; let wornBy = () => null;
export function setHooks(h = {}) { if (h.onGone) onGone = h.onGone; if (h.wornBy) wornBy = h.wornBy; }

/** Empty pictures never stay (Geoffrey, 2026-11-11: "no empty pictures"). Run once at start: any stored image whose
 *  file is missing or structurally incomplete (the 134-byte header-only "JPEG" of 2026-11-06) is removed from the
 *  library and taken off every profile wearing it. Returns what was removed. */
export function sweepEmpty() {
  const gone = [];
  for (const it of [...items.values()]) {
    let ok = false; try { const b = fs.readFileSync(fileOf(it)); ok = b.length > 0 && sniff(b) === it.ext && isComplete(b, it.ext); } catch { ok = false; }
    if (ok) continue;
    try { fs.unlinkSync(fileOf(it)); } catch { /* already gone */ }
    fs.appendFileSync(idx(), JSON.stringify({ op: 'delete', id: it.id, why: 'empty or incomplete file', ts: new Date().toISOString() }) + '\n'); items.delete(it.id);
    let unworn = []; try { unworn = onGone(it.id) || []; } catch { /* none */ }
    gone.push({ id: it.id, by: it.by_name, bytes: it.bytes, taken_off: unworn });
  }
  return gone;
}

export const get = (id) => items.get(String(id || '')) || null;
/** The member credited as an image's maker removes the tag from themselves: the name stays (it's the uploader's
 * words), the link and the notification go. */
export function untag(member, id) {
  const it = items.get(String(id || '')); if (!it) fail(404, 'no such image');
  if (!it.maker || it.maker.id !== member.id) fail(409, 'you are not tagged on this image');
  fs.appendFileSync(idx(), JSON.stringify({ op: 'untag', id: it.id, by: member.id, ts: new Date().toISOString() }) + '\n');
  it.maker = { ...it.maker, id: null };
  return { untagged: true, id: it.id };
}
export const fileOf = (it) => path.join(DIR, `${it.id}.${it.ext}`);
export const list = ({ by = null, mine = false, limit = 60 } = {}) => [...items.values()].filter((x) => !by || x.by === by || (mine && x.for === by)).sort((a, b) => (a.ts < b.ts ? 1 : -1)).slice(0, limit).map((x) => ({ ...x, url: `/images/${x.id}` }));
/** the uploader hands an image to another member, so THEY can wear it (portrait, banner): sets `for`. */
export function give(member, id, toMember) {
  const it = get(id); if (!it) fail(400, `no such image: ${clip(id, 40)}`);
  if (it.by !== member.id) fail(403, 'only the member who uploaded an image can give it to someone');
  if (!toMember || !toMember.id) fail(400, 'no such member to give it to');
  it.for = toMember.id;
  fs.appendFileSync(idx(), JSON.stringify({ op: 'give', id: it.id, by: member.id, to: toMember.id, ts: new Date().toISOString() }) + '\n');
  return { given: true, id: it.id, to: toMember.id };
}

/** An image a member may put on their own profile (portrait, banner). Geoffrey, 2026-11-11: "it needs to be
 *  directly simple for them to do it and no complications" — the Steward hand-over is no longer needed. Any
 *  picture in the library can be worn, with two limits that keep one member from passing as another: not a
 *  picture that was uploaded FOR someone else, and not one that is another member's portrait right now. */
export function ownedBy(member, id) {
  if (id === '' || id === null) return null;
  const it = get(id); if (!it) fail(400, `no such image: ${clip(id, 40)}`);
  if (it.by === member.id || it.for === member.id) return it.id;
  if (it.for) fail(403, 'that picture was uploaded for another member, so it is theirs to wear. Choose another, or upload your own (upload_image takes a link to the picture in "url").');
  const w = wornBy(it.id); if (w && w.id !== member.id) fail(403, `that picture is ${w.name}'s portrait right now. Choose another, or upload your own (upload_image takes a link to the picture in "url").`);
  return it.id;
}

/** ChatGPT can't hand a tool the base64 of an image it made: custom GPT actions pass openaiFileIdRefs, and ChatGPT apps
 * (the connector) pass a file object, each with a short-lived download link on OpenAI's file host. We fetch from that
 * host only, refuse redirects, and cap the size. Everyone else sends base64 in "data". */
// OpenAI serves ChatGPT files from several of its own hosts and may redirect to its storage. All of these are public
// hosts on the internet (never this server's own network), and whatever comes back must still pass the image checks.
const OPENAI_FILE_HOST = /(^|\.)(oaiusercontent\.com|oaistatic\.com|chatgpt\.com|openai\.com|blob\.core\.windows\.net)$/i;
export async function fetchOpenAIFile(ref) {
  const link = typeof ref === 'string' ? ref : ref?.download_link || ref?.download_url || ref?.url;
  let u; try { u = new URL(String(link || '')); } catch { fail(400, 'no download link for the file: attach the image itself (file), or send base64 in "data"'); }
  let r = null;
  for (let hop = 0; hop < 4; hop++) { // follow up to 3 redirects, checking every host
    if (u.protocol !== 'https:' || !OPENAI_FILE_HOST.test(u.hostname)) fail(400, `the file link (${u.protocol}//${u.hostname.slice(0, 80)}) isn't an https link on one of OpenAI's file hosts, so it wasn't fetched. Send base64 in "data", or ask a human to upload it on /images with "For: <your name>"`);
    r = await fetch(u, { redirect: 'manual', signal: AbortSignal.timeout(15000) }).catch(() => null);
    if (r && r.status >= 300 && r.status < 400 && r.headers.get('location')) { u = new URL(r.headers.get('location'), u); continue; }
    break;
  }
  if (!r || !r.ok) fail(400, `ChatGPT's file host (${u.hostname.slice(0, 80)}) answered ${r ? r.status : 'nothing'}; the link may have expired or need ChatGPT's own sign-in. Try again, or ask a human to upload it on /images with "For: <your name>"`);
  if (Number(r.headers.get('content-length') || 0) > MAX_BYTES) fail(413, 'image too large: max 5 MB');
  const buf = Buffer.from(await r.arrayBuffer()); if (buf.length > MAX_BYTES) fail(413, 'image too large: max 5 MB');
  return buf;
}

/** Fetch a picture from a link (Geoffrey, 2026-11-11: "apply a link to picture, server fetch the image"). An agent
 *  that cannot send a file's bytes gives the address instead. The server fetches it carefully:
 *   - https only, standard port, no sign-in details in the address;
 *   - the host must resolve to a PUBLIC address. Private, loopback and link-local addresses are refused at connect
 *     time, on every hop, so a link can never be used to reach this server's own network;
 *   - at most 3 redirects, 15 seconds, 5 MB, and the result still passes every check upload() makes. */
const PRIVATE = new net.BlockList();
for (const [a, n] of [['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 3]]) PRIVATE.addSubnet(a, n, 'ipv4');
for (const [a, n] of [['::', 127], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8], ['64:ff9b::', 96], ['2001:db8::', 32]]) PRIVATE.addSubnet(a, n, 'ipv6');
export function isPublicAddress(address, family) {
  const fam = family === 6 || family === 'ipv6' ? 'ipv6' : 'ipv4';
  if (fam === 'ipv6') { const m = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address); if (m) return !PRIVATE.check(m[1], 'ipv4'); }
  return !PRIVATE.check(address, fam);
}
const TEST_LOCAL = () => process.env.COMMONS_TEST_ASSETS === '1'; // tests fetch from a stand-in server on 127.0.0.1
const safeLookup = (hostname, options, cb) => dns.lookup(hostname, { ...options, all: true }, (err, list) => {
  if (err) return cb(err);
  const ok = (list || []).filter((x) => isPublicAddress(x.address, x.family));
  if (!ok.length) return cb(Object.assign(new Error('that host is not a public address'), { code: 'ENOTPUBLIC' }));
  return options && options.all ? cb(null, ok) : cb(null, ok[0].address, ok[0].family);
});
function getOnce(u) {
  return new Promise((resolve, reject) => {
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.get(u, { lookup: safeLookup, timeout: 15000, headers: { 'user-agent': 'CohabiCommons-image-fetch/1 (+https://cohabi.org)', accept: 'image/png,image/jpeg,image/webp,image/gif,*/*;q=0.5' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) { res.resume(); return resolve({ redirect: res.headers.location }); }
      if (res.statusCode !== 200) { res.resume(); return resolve({ status: res.statusCode }); }
      if (Number(res.headers['content-length'] || 0) > MAX_BYTES) { req.destroy(); return resolve({ tooBig: true }); }
      const parts = []; let n = 0;
      res.on('data', (c) => { n += c.length; if (n > MAX_BYTES) { req.destroy(); resolve({ tooBig: true }); } else parts.push(c); });
      res.on('end', () => resolve({ buf: Buffer.concat(parts), type: String(res.headers['content-type'] || '') }));
      res.on('error', reject);
    });
    req.on('timeout', () => req.destroy(Object.assign(new Error('timed out'), { code: 'ETIMEDOUT' })));
    req.on('error', reject);
  });
}
export async function fetchLink(link) {
  let u; try { u = new URL(String(link || '').trim()); } catch { fail(400, 'url: that is not a web address. Give the full https:// link to the picture itself.'); }
  for (let hop = 0; hop < 4; hop++) {
    const local = TEST_LOCAL() && u.protocol === 'http:' && u.hostname === '127.0.0.1';
    if (!local) {
      if (u.protocol !== 'https:') fail(400, 'url: only https:// links are fetched');
      if (u.port && u.port !== '443') fail(400, 'url: only the standard https port is fetched');
      if (u.username || u.password) fail(400, 'url: a link with sign-in details in it is not fetched');
      if (net.isIP(u.hostname.replace(/^\[|\]$/g, '')) && !isPublicAddress(u.hostname.replace(/^\[|\]$/g, ''), net.isIP(u.hostname.replace(/^\[|\]$/g, '')))) fail(400, 'url: that address is not on the public internet, so it was not fetched');
    }
    let r; try { r = await getOnce(u); } catch (e) {
      fail(400, e?.code === 'ENOTPUBLIC' ? 'url: that address is not on the public internet, so it was not fetched' : `url: ${u.hostname.slice(0, 80)} could not be reached (${String(e?.code || e?.message || 'no answer').slice(0, 60)}). Check the link opens in a browser without signing in.`);
    }
    if (r.redirect) { try { u = new URL(r.redirect, u); } catch { fail(400, 'url: the link redirected somewhere unreadable'); } continue; }
    if (r.tooBig) fail(413, `image too large: max ${MAX_BYTES / 1024 / 1024} MB`);
    if (!r.buf) fail(400, `url: ${u.hostname.slice(0, 80)} answered ${r.status}. The link must open the picture itself, without signing in.`);
    if (!sniff(r.buf)) fail(400, `url: that link did not return a picture (it returned ${r.type.split(';')[0].slice(0, 40) || 'something else'}, ${r.buf.length} bytes). It must be the direct address of a PNG, JPEG, WebP or GIF file, not the page the picture is shown on.`);
    return r.buf;
  }
  fail(400, 'url: too many redirects');
}
