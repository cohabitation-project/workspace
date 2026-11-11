/**
 * variants.mjs — lighter copies of uploaded pictures and songs, made by the site itself (Geoffrey, 2026-11-11:
 * "our site is loading so slow"). Measured that morning: the feed was 13.6 MB, nearly all of it two full-size PNG
 * uploads and one song.
 *
 * Nobody is asked to resize anything. The original is always kept, untouched. The first time a picture is asked
 * for, a WebP copy no wider than the size wanted is made and kept beside the data; every later request gets the
 * copy. A WAV is turned into an MP3 the same way. If the tools are missing (sharp, ffmpeg) or a file cannot be
 * converted, the original is served exactly as before: this can only make things lighter, never break them.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';

export const SIZES = { thumb: 480, view: 1280 };
let DIR = null; let sharp = null; let ffmpeg = false;
const running = new Map(); // key -> promise, so one file is converted once however many people ask at the same moment
let active = 0; const waiting = [];
const slot = () => new Promise((res) => { if (active < 2) { active += 1; res(); } else waiting.push(res); });
const done = () => { const n = waiting.shift(); if (n) n(); else active -= 1; };

export async function init(dataDir) {
  DIR = path.join(dataDir, 'variants'); fs.mkdirSync(DIR, { recursive: true });
  try { sharp = (await import('sharp')).default; sharp.cache(false); sharp.concurrency(1); } catch { sharp = null; console.error('[commons] sharp is not installed: pictures are served at full size (run npm install)'); }
  ffmpeg = await new Promise((res) => execFile('ffmpeg', ['-version'], { timeout: 5000 }, (e) => res(!e)));
  return status();
}
export const status = () => ({ images: !!sharp, audio: ffmpeg });
const keyFor = (src, tag) => { const st = fs.statSync(src); return crypto.createHash('sha256').update(`${src}|${st.size}|${st.mtimeMs}|${tag}`).digest('hex').slice(0, 32); };
const once = (key, make) => { if (running.has(key)) return running.get(key); const p = (async () => { await slot(); try { return await make(); } catch (e) { console.error('[commons] variant not made', e?.message); return null; } finally { done(); running.delete(key); } })(); running.set(key, p); return p; };

/** A WebP copy of a picture, no wider than SIZES[size]. Returns its path, or null to mean "serve the original"
 *  (no sharp, an animated or tiny file, a copy that would be bigger, or any failure). */
export async function image(src, size = 'view') {
  const width = SIZES[size]; if (!sharp || !width || !DIR) return null;
  let key; try { key = keyFor(src, `img:${width}`); } catch { return null; }
  const out = path.join(DIR, `${key}.webp`); const skip = path.join(DIR, `${key}.skip`);
  if (fs.existsSync(out)) return out; if (fs.existsSync(skip)) return null;
  return once(key, async () => {
    const meta = await sharp(src, { animated: false, limitInputPixels: 80_000_000 }).metadata();
    if ((meta.pages || 1) > 1) { fs.writeFileSync(skip, ''); return null; } // animation: leave it alone
    const tmp = `${out}.${process.pid}.tmp`;
    await sharp(src, { limitInputPixels: 80_000_000 }).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 78, effort: 4 }).toFile(tmp);
    if (fs.statSync(tmp).size >= fs.statSync(src).size) { fs.unlinkSync(tmp); fs.writeFileSync(skip, ''); return null; }
    fs.renameSync(tmp, out); return out;
  });
}

/** An MP3 copy of a WAV. Returns its path if it already exists; otherwise starts making it and returns null, so
 *  the first listener gets the original at once and later listeners get the small one. */
export function mp3(src) {
  if (!ffmpeg || !DIR) return null;
  let key; try { key = keyFor(src, 'mp3:192'); } catch { return null; }
  const out = path.join(DIR, `${key}.mp3`); const skip = path.join(DIR, `${key}.skip`);
  if (fs.existsSync(out)) return out; if (fs.existsSync(skip)) return null;
  once(key, () => new Promise((res) => { const tmp = `${out}.${process.pid}.tmp.mp3`;
    execFile('ffmpeg', ['-nostdin', '-y', '-loglevel', 'error', '-i', src, '-vn', '-codec:a', 'libmp3lame', '-b:a', '192k', tmp], { timeout: 180_000 }, (e) => {
      try { if (e || !fs.existsSync(tmp) || fs.statSync(tmp).size < 1000) { try { fs.unlinkSync(tmp); } catch { /* none */ } fs.writeFileSync(skip, ''); return res(null); } fs.renameSync(tmp, out); res(out); } catch { res(null); } }); }));
  return null;
}
