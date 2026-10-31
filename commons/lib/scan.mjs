/**
 * scan.mjs — submission file scanning (Geoffrey, 2026-10-31: "all files scanned for threats thoroughly,
 * someone should need clearance, or we could get messed around").
 *
 * Two layers, both recorded on the submission's log entry:
 *   1. Content verification, always on: the file's bytes must actually BE the type its name claims
 *      (magic bytes per allowed extension), nothing may carry an executable (PE/ELF/Mach-O) anywhere
 *      near its head, SVG may carry no active content, text types may carry no NUL bytes, and a zip's
 *      entries are read: no executable/script entry names, no nested archives.
 *   2. ClamAV, when the server has it (clamdscan preferred, clamscan fallback): result recorded as
 *      clean / INFECTED / unavailable. Unavailable does not fail the scan — layer 1 plus human
 *      clearance is the floor; clam is extra.
 *
 * A failed scan REJECTS the upload outright (nothing written to the public area). A passed scan still
 * only makes the file PENDING: nothing is served until a signed-in human clears it (server.mjs).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ascii = (b, off, s) => b.length >= off + s.length && b.toString('latin1', off, off + s.length) === s;

const MAGIC = {
  wav: (b) => ascii(b, 0, 'RIFF') && ascii(b, 8, 'WAVE'),
  mp3: (b) => ascii(b, 0, 'ID3') || (b.length > 2 && b[0] === 0xff && (b[1] & 0xe0) === 0xe0),
  ogg: (b) => ascii(b, 0, 'OggS'),
  flac: (b) => ascii(b, 0, 'fLaC'),
  m4a: (b) => ascii(b, 4, 'ftyp'),
  mid: (b) => ascii(b, 0, 'MThd'),
  midi: (b) => ascii(b, 0, 'MThd'),
  png: (b) => b.length > 8 && b[0] === 0x89 && ascii(b, 1, 'PNG'),
  jpg: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  jpeg: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  gif: (b) => ascii(b, 0, 'GIF8'),
  webp: (b) => ascii(b, 0, 'RIFF') && ascii(b, 8, 'WEBP'),
  pdf: (b) => ascii(b, 0, '%PDF'),
  zip: (b) => ascii(b, 0, 'PK'),
  stl: (b) => b.length > 84 || /^\s*solid/i.test(b.toString('latin1', 0, 20)),
  step: (b) => /ISO-10303/i.test(b.toString('latin1', 0, 200)),
  svg: (b) => /<svg[\s>]/i.test(b.toString('utf8', 0, Math.min(b.length, 4096))),
};
const TEXT_EXT = new Set(['md', 'txt', 'csv', 'json', 'py', 'mjs', 'js', 'svg', 'stl', 'step']);

/** Executable headers, checked at the start of every file regardless of claimed type. */
function looksExecutable(b) {
  if (ascii(b, 0, 'MZ')) return 'Windows executable (MZ)';
  if (b.length > 4 && b[0] === 0x7f && ascii(b, 1, 'ELF')) return 'ELF executable';
  const m = b.length > 4 ? b.readUInt32BE(0) : 0;
  if ([0xfeedface, 0xfeedfacf, 0xcefaedfe, 0xcffaedfe, 0xcafebabe].includes(m)) return 'Mach-O / universal binary';
  return null;
}

const BAD_ZIP_ENTRY = /\.(exe|dll|scr|bat|cmd|com|msi|sh|bash|ps1|app|jar|apk|vbs|zip|7z|rar|gz|tar|dmg|iso)(\/|$)/i;
/** Walk a zip's local file headers and refuse dangerous entry names or nested archives. */
function scanZipEntries(b) {
  let off = 0; let n = 0;
  while (off + 30 < b.length && n < 4096) {
    if (b.readUInt32LE(off) !== 0x04034b50) break; // not a local header: done with the stored region
    const nameLen = b.readUInt16LE(off + 26); const extraLen = b.readUInt16LE(off + 28);
    const compSize = b.readUInt32LE(off + 18);
    const name = b.toString('utf8', off + 30, off + 30 + nameLen);
    if (name.includes('..')) return `zip entry path traversal: ${name}`;
    if (BAD_ZIP_ENTRY.test(name)) return `zip contains a refused entry type: ${name}`;
    // 0xffffffff = zip64; we can't walk it safely, refuse rather than guess
    if (compSize === 0xffffffff) return 'zip64 archives not accepted';
    off += 30 + nameLen + extraLen + compSize; n++;
  }
  return null;
}

const SVG_ACTIVE = /<script|javascript:|on[a-z]+\s*=|<foreignObject|href\s*=\s*["']\s*data:/i;

/** Layer 1: verify content. Returns { ok, reason? }. */
export function verify(buf, ext) {
  if (!buf || !buf.length) return { ok: false, reason: 'empty file' };
  const exe = looksExecutable(buf);
  if (exe) return { ok: false, reason: `file is an executable: ${exe}` };
  const magic = MAGIC[ext];
  if (magic && !magic(buf)) return { ok: false, reason: `content is not a real .${ext} (magic bytes do not match)` };
  if (TEXT_EXT.has(ext) && ['md', 'txt', 'csv', 'json', 'py', 'mjs', 'js', 'svg', 'step'].includes(ext) && buf.includes(0)) {
    return { ok: false, reason: `a .${ext} file may not contain binary (NUL) bytes` };
  }
  if (ext === 'svg' && SVG_ACTIVE.test(buf.toString('utf8'))) return { ok: false, reason: 'SVG contains active content (script/handlers/foreignObject)' };
  if (ext === 'zip') { const z = scanZipEntries(buf); if (z) return { ok: false, reason: z }; }
  return { ok: true };
}

/** Layer 2: ClamAV if present. Returns 'clean' | 'INFECTED: <sig>' | 'unavailable'. */
export function clamScan(buf) {
  const tmp = path.join(os.tmpdir(), `commons-scan-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  try {
    fs.writeFileSync(tmp, buf, { mode: 0o600 });
    for (const bin of ['clamdscan', 'clamscan']) {
      const r = spawnSync(bin, ['--no-summary', tmp], { timeout: 60_000 });
      if (r.error) continue; // binary not present
      if (r.status === 0) return 'clean';
      if (r.status === 1) return `INFECTED: ${String(r.stdout).split(':').pop().trim().slice(0, 120)}`;
      // status 2 = scanner error; try the next binary
    }
    return 'unavailable';
  } catch { return 'unavailable'; } finally { try { fs.unlinkSync(tmp); } catch { /* gone */ } }
}

/** Full scan. Returns { ok, reason?, clam }. */
export function scan(buf, ext) {
  const v = verify(buf, ext);
  if (!v.ok) return { ok: false, reason: v.reason, clam: 'skipped' };
  const clam = clamScan(buf);
  if (clam.startsWith('INFECTED')) return { ok: false, reason: clam, clam };
  return { ok: true, clam };
}
