/**
 * voice.mjs: readback for every message (Geoffrey, 2026-11-03: a natural voice "for everybody, especially the
 * ambassador"). The audio comes from the local Kokoro service (commons/voice/tts_server.py on 127.0.0.1). Each
 * message is spoken once and cached under DATA/audio/, so a message is never generated twice.
 *
 * Voices: config/voices.json can give a member a voice by name. Everyone else gets a stable default from a short
 * list, so the same member always sounds the same. A member's own choice (member.voice) wins over both. The
 * Ambassador has no voice set: he is offered the list and chooses.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const PORT = process.env.VOICE_PORT || '3310';
const URL_ = `http://127.0.0.1:${PORT}`;
const FAKE = process.env.COMMONS_FAKE_TTS === '1';
let DIR = null; let cfg = { members: {}, human: [], agent: [] };

export function init(dataDir, root) {
  DIR = path.join(dataDir, 'audio'); fs.mkdirSync(DIR, { recursive: true });
  try { cfg = { ...cfg, ...JSON.parse(fs.readFileSync(path.join(root, 'config', 'voices.json'), 'utf8')) }; } catch { /* defaults */ }
}

const HUMAN = ['am_michael', 'af_heart', 'bm_george', 'af_bella', 'am_adam', 'bf_emma'];
const AGENT = ['am_puck', 'af_nova', 'bm_fable', 'af_sky', 'am_echo', 'bf_isabella', 'am_onyx', 'af_river'];

export function voiceFor(member) {
  if (!member) return 'am_michael';
  if (member.voice) return member.voice;
  const named = cfg.members?.[member.name];
  if (named) return named;
  const list = member.kind === 'human' ? (cfg.human?.length ? cfg.human : HUMAN) : (cfg.agent?.length ? cfg.agent : AGENT);
  const h = crypto.createHash('sha256').update(String(member.id)).digest();
  return list[h[0] % list.length];
}

/** What gets read aloud: the words, not the markup. Links and code are named, not spelled out. */
export function speakable(text) {
  return String(text || '')
    .replace(/```[\s\S]*?```/g, ' (a code block) ')
    .replace(/`([^`]{1,60})`/g, '$1')
    .replace(/`[^`]+`/g, ' (code) ')
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '$1')
    .replace(/https?:\/\/\S+/g, ' (a link) ')
    .replace(/^\s{0,3}#{1,6}\s*/gm, '')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/[*_~>|]/g, '')
    .replace(/@(\w)/g, '$1')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '.\n')
    .trim()
    .slice(0, 6000); // read in parts now, so long messages can be read whole
}

/** Split what's read into short parts (a sentence or two each), so playback starts after the first part instead of
 *  waiting for the whole message. Geoffrey, 2026-11-03: long messages took over a minute before any sound. Parts are
 *  kept small (first 90, then 160 chars) because the CPU synthesizes slower than real time: a part must cook in about
 *  the time the previous one plays, or the listener sits in silence (Geoffrey, same day: a minute between sentences). */
export function parts(text, max = 160) {
  const sentences = String(text).match(/[^.!?\n]+[.!?]*[\s]*|\n+/g) || [String(text)];
  const out = []; let cur = '';
  for (const raw of sentences) {
    const s = raw.replace(/\s+/g, ' ');
    if (!s.trim()) continue;
    const lim = out.length ? max : 90; // the first part is short, so sound starts in a couple of seconds
    if ((cur + s).length > lim && cur.trim()) { out.push(cur.trim()); cur = ''; }
    if (s.length > max) { for (let i = 0; i < s.length; i += max) out.push(s.slice(i, i + max).trim()); continue; }
    cur += s;
  }
  if (cur.trim()) out.push(cur.trim());
  return out.filter(Boolean);
}

let queue = Promise.resolve();
async function synth(text, voice) {
  if (FAKE) return { buf: Buffer.from('ID3-fake-' + voice), type: 'audio/mpeg' };
  const r = await fetch(`${URL_}/speak`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, voice }) });
  if (!r.ok) throw Object.assign(new Error(`voice service: ${r.status}`), { status: 503 });
  return { buf: Buffer.from(await r.arrayBuffer()), type: r.headers.get('content-type') || 'audio/ogg' };
}

// MP3/WAV only: cached Ogg from the first day is skipped because Safari can't play it.
const TYPES = { mp3: 'audio/mpeg', wav: 'audio/wav' };
// The key carries a short hash of the part's own text, so when the splitting rules change, old cache
// files (cut at the old boundaries) are simply never matched instead of playing the wrong words.
const partKey = (msgId, voice, n, text) =>
  `${msgId}-${voice}-p${n}-${crypto.createHash('sha256').update(text).digest('hex').slice(0, 8)}`;
function cachedFile(key) {
  for (const ext of Object.keys(TYPES)) {
    const f = path.join(DIR, `${key}.${ext}`);
    if (fs.existsSync(f)) return { file: f, type: TYPES[ext] };
  }
  return null;
}

/** One synthesis per part, however many ask for it: concurrent requests for the same key share one job,
 *  and every job goes through the serial queue so the little CPU is never asked for two at once. */
const inflight = new Map();
function makePart(key, text, voice) {
  if (inflight.has(key)) return inflight.get(key);
  const job = queue
    .then(() => synth(text, voice))
    .then(({ buf, type }) => {
      const f = path.join(DIR, `${key}.${type === 'audio/wav' ? 'wav' : 'mp3'}`);
      fs.writeFileSync(f, buf);
      return { file: f, type };
    })
    .finally(() => inflight.delete(key));
  queue = job.catch(() => {});
  inflight.set(key, job);
  return job;
}

/** The audio for one part of one message: from cache, or made now. Pressing play also puts every later part
 *  of the message on the cook queue, so by the time the player asks for the next part it is ready or already
 *  cooking — instead of only starting when asked (Geoffrey, 2026-11-03: a minute of silence between the first
 *  sentence and the rest). */
export async function audioFor(msg, member, part = 0) {
  const voice = voiceFor(member);
  const all = parts(speakable(msg.text));
  if (!all.length) throw Object.assign(new Error('nothing to read'), { status: 404 });
  const n = Math.max(0, Math.min(all.length - 1, Number(part) || 0));
  for (let i = n; i < all.length; i++) {
    const ki = partKey(msg.id, voice, i, all[i]);
    if (!cachedFile(ki) && !inflight.has(ki)) makePart(ki, all[i], voice).catch(() => {});
  }
  const key = partKey(msg.id, voice, n, all[n]);
  const hit = cachedFile(key);
  if (hit) return { ...hit, voice, parts: all.length };
  const made = await makePart(key, all[n], voice);
  return { ...made, voice, parts: all.length };
}

export async function health() {
  if (FAKE) return { ok: true, fake: true };
  try { const r = await fetch(`${URL_}/health`, { signal: AbortSignal.timeout(1500) }); return r.ok ? await r.json() : { ok: false }; } catch { return { ok: false }; }
}
