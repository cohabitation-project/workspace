// Video posts (Geoffrey, 2026-11-15: "we need video, the ability to post video almost immediately"; "shoot a video
// and push it to post"). A member uploads one video (from the library, or recorded on the spot: on phones the file
// picker offers the camera). Limits: 200 MB, 2 minutes (checked when ffprobe is present).
//
// Storage: on the server's own disk for now (data/videos), so no new account or cost. The capacity tripwire warns
// at 50% disk; that is the signal to move video to object storage. When ffmpeg is installed, each upload is
// converted in the background to a phone-friendly MP4 (H.264, at most 720p, fast start) with a poster frame, so
// an iPhone's HEVC .mov plays everywhere. Until it is converted, or with no ffmpeg, the original is served as-is.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';

export const MAX_BYTES = 200 * 1024 * 1024;
export const MAX_SECONDS = 120;
/** True when ffprobe is here, so upload() can measure a clip's length and refuse one over MAX_SECONDS. */
export const canProbe = () => ff().ffprobe;
const TYPES = { 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm', 'video/x-m4v': 'm4v', 'video/3gpp': '3gp' };
let DIR = null; const meta = new Map(); let FILE = null;
const fail = (status, msg) => { const e = new Error(msg); e.status = status; throw e; };
const has = (bin) => { try { return spawnSync(bin, ['-version'], { stdio: 'ignore' }).status === 0; } catch { return false; } };
let FF = null; const ff = () => (FF ??= { ffmpeg: has(process.env.FFMPEG || 'ffmpeg'), ffprobe: has(process.env.FFPROBE || 'ffprobe') });

export function init(dataDir) {
  DIR = path.join(dataDir, 'videos'); fs.mkdirSync(DIR, { recursive: true }); FILE = path.join(DIR, 'videos.jsonl'); meta.clear();
  if (!fs.existsSync(FILE)) return;
  for (const line of fs.readFileSync(FILE, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { const ev = JSON.parse(line); if (ev.op === 'add' || ev.op === 'update') meta.set(ev.v.id, { ...(meta.get(ev.v.id) || {}), ...ev.v }); else if (ev.op === 'delete') meta.delete(ev.id); } catch { /* skip */ }
  }
  resumeUnfinished();
}
// A restart can land mid-conversion; without this the record stays ready:false, failed:false forever.
// Order: finished mp4 -> mark ready; else original still there -> convert again; else mark failed.
function resumeUnfinished() {
  if (!ff().ffmpeg) return;
  for (const v of [...meta.values()]) {
    if (!v.id || v.by == null || v.ready || v.failed) continue;
    const mp4 = path.join(DIR, `${v.id}.mp4`), orig = path.join(DIR, `${v.id}.orig.${v.ext}`);
    fs.rmSync(`${mp4}.part`, { force: true });
    if (fs.existsSync(mp4)) { const nv = { ...v, ready: true, poster: fs.existsSync(path.join(DIR, `${v.id}.jpg`)) }; meta.set(v.id, nv); write('update', { id: v.id, ready: true, poster: nv.poster }); }
    else if (fs.existsSync(orig)) convert(v, orig);
    else { const nv = { ...v, failed: true, reason: "We couldn't convert this video." }; meta.set(v.id, nv); write('update', { id: v.id, failed: true, reason: nv.reason }); }
  }
}
const write = (op, v) => fs.appendFileSync(FILE, JSON.stringify({ op, v, ts: new Date().toISOString() }) + '\n');

function probeSeconds(file) {
  if (!ff().ffprobe) return null;
  const r = spawnSync(process.env.FFPROBE || 'ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8', timeout: 20000 });
  const s = parseFloat(String(r.stdout || '').trim()); return Number.isFinite(s) ? s : null;
}

/** Save an uploaded video (raw bytes). Returns its public record. */
export function upload(member, buf, { type = '', alt = '', credit = '' } = {}) {
  if (!member) fail(401, 'sign in to post a video');
  const ext = TYPES[String(type).split(';')[0].trim().toLowerCase()];
  if (!ext) fail(415, 'send an MP4, MOV or WebM video');
  if (!buf || !buf.length) fail(400, 'the video was empty');
  if (buf.length > MAX_BYTES) fail(413, 'videos can be up to 200 MB');
  const today = new Date().toISOString().slice(0, 10);
  if ([...meta.values()].filter((v) => v.by === member.id && v.ts.startsWith(today)).length >= 20) fail(429, '20 videos a day');
  const id = 'vid_' + crypto.randomBytes(8).toString('hex');
  const orig = path.join(DIR, `${id}.orig.${ext}`); fs.writeFileSync(orig, buf);
  const secs = probeSeconds(orig);
  if (secs != null && secs > MAX_SECONDS + 1) { fs.rmSync(orig, { force: true }); fail(413, 'videos can be up to 2 minutes'); }
  const v = { id, by: member.id, ts: new Date().toISOString(), bytes: buf.length, ext, seconds: secs, alt: String(alt || '').slice(0, 300), ...(credit ? { credit: String(credit).slice(0, 300) } : {}), ready: false };
  meta.set(id, v); write('add', v);
  convert(v, orig);
  return publicVideo(v);
}

function convert(v, orig) {
  if (!ff().ffmpeg) return;
  const out = path.join(DIR, `${id(v)}.mp4.part`); const poster = path.join(DIR, `${id(v)}.jpg`);
  const p = spawn(process.env.FFMPEG || 'ffmpeg', ['-y', '-i', orig, '-vf', "scale='min(720,iw)':-2", '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', '-f', 'mp4', out], { stdio: 'ignore' });
  p.on('close', (code) => {
    if (!meta.has(v.id)) { fs.rmSync(out, { force: true }); return; } // deleted while converting: leave nothing behind, write nothing
    if (code !== 0) {
      fs.rmSync(out, { force: true });
      const failed = { ...meta.get(v.id), failed: true, reason: "We couldn't convert this video." };
      meta.set(v.id, failed);
      write('update', { id: v.id, failed: true, reason: failed.reason });
      return;
    }
    try { fs.renameSync(out, path.join(DIR, `${id(v)}.mp4`)); } catch { fs.rmSync(out, { force: true }); return; } // the .part can vanish (video deleted); never throw in a child-process handler
    spawn(process.env.FFMPEG || 'ffmpeg', ['-y', '-ss', '0.5', '-i', path.join(DIR, `${id(v)}.mp4`), '-frames:v', '1', '-vf', "scale='min(720,iw)':-2", poster], { stdio: 'ignore' })
      .on('close', () => { if (!meta.has(v.id)) { for (const f of [poster, path.join(DIR, `${id(v)}.mp4`)]) fs.rmSync(f, { force: true }); return; } const nv = { ...meta.get(v.id), ready: true, poster: fs.existsSync(poster) }; meta.set(v.id, nv); write('update', { id: v.id, ready: true, poster: nv.poster }); fs.rmSync(orig, { force: true }); });
  });
}
const id = (v) => v.id;

/** The file to serve for a video, and its type. */
export function fileFor(vid) {
  const v = meta.get(String(vid || '')); if (!v) return null;
  const mp4 = path.join(DIR, `${v.id}.mp4`);
  if (fs.existsSync(mp4)) return { file: mp4, type: 'video/mp4' };
  const orig = path.join(DIR, `${v.id}.orig.${v.ext}`);
  return fs.existsSync(orig) ? { file: orig, type: Object.keys(TYPES).find((k) => TYPES[k] === v.ext) || 'video/mp4' } : null;
}
export function posterFor(vid) { const v = meta.get(String(vid || '')); const f = v && path.join(DIR, `${v.id}.jpg`); return f && fs.existsSync(f) ? f : null; }
export const get = (vid) => { const v = meta.get(String(vid || '')); return v ? publicVideo(v) : null; };
export const publicVideo = (v) => ({ id: v.id, by: v.by, url: `/videos/${v.id}`, poster: v.poster ? `/videos/${v.id}/poster.jpg` : null, seconds: v.seconds ?? null, alt: v.alt || '', ...(v.credit ? { credit: v.credit } : {}), ready: !!v.ready || !ff().ffmpeg, failed: !!v.failed, ...(v.reason ? { reason: v.reason } : {}) });
export const byMember = (memberId) => [...meta.values()].filter((v) => v.by === memberId).map(publicVideo);
/** A member's own videos, newest first (Cohabi Cut's "From Cohabi" tab). */
export const listMine = (memberId, limit = 60) => [...meta.values()].filter((v) => v.by === memberId).sort((a, b) => (a.ts < b.ts ? 1 : -1)).slice(0, Math.max(1, Math.min(100, limit))).map(publicVideo);

export function remove(member, vid) {
  const v = meta.get(String(vid || '')); if (!v) fail(404, 'no such video');
  if (v.by !== member?.id) fail(403, 'only its maker can delete a video');
  for (const f of fs.readdirSync(DIR)) if (f.startsWith(v.id + '.')) fs.rmSync(path.join(DIR, f), { force: true });
  meta.delete(v.id); fs.appendFileSync(FILE, JSON.stringify({ op: 'delete', id: v.id, ts: new Date().toISOString() }) + '\n');
  return { deleted: true };
}
export function forgetMember(memberId) { for (const v of [...meta.values()]) if (v.by === memberId) { try { remove({ id: memberId }, v.id); } catch {} } }
