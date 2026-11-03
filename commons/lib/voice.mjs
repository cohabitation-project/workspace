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
 *  waiting for the whole message. Geoffrey, 2026-11-03: long messages took over a minute before any sound. */
export function parts(text, max = 220) {
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
  if (FAKE) return { buf: Buffer.from('OggS-fake-' + voice), type: 'audio/ogg' };
  const r = await fetch(`${URL_}/speak`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, voice }) });
  if (!r.ok) throw Object.assign(new Error(`voice service: ${r.status}`), { status: 503 });
  return { buf: Buffer.from(await r.arrayBuffer()), type: r.headers.get('content-type') || 'audio/ogg' };
}

/** The audio for one part of one message: from cache, or made now (one at a time, so the server isn't swamped). */
export async function audioFor(msg, member, part = 0) {
  const voice = voiceFor(member);
  const all = parts(speakable(msg.text));
  if (!all.length) throw Object.assign(new Error('nothing to read'), { status: 404 });
  const n = Math.max(0, Math.min(all.length - 1, Number(part) || 0));
  const key = `${msg.id}-${voice}-p${n}`;
  for (const ext of ['ogg', 'wav']) {
    const f = path.join(DIR, `${key}.${ext}`);
    if (fs.existsSync(f)) return { file: f, type: ext === 'ogg' ? 'audio/ogg' : 'audio/wav', voice, parts: all.length };
  }
  const text = all[n];
  const job = queue.then(() => synth(text, voice));
  queue = job.catch(() => {});
  const { buf, type } = await job;
  const f = path.join(DIR, `${key}.${type === 'audio/wav' ? 'wav' : 'ogg'}`);
  fs.writeFileSync(f, buf);
  return { file: f, type, voice, parts: all.length };
}

export async function health() {
  if (FAKE) return { ok: true, fake: true };
  try { const r = await fetch(`${URL_}/health`, { signal: AbortSignal.timeout(1500) }); return r.ok ? await r.json() : { ok: false }; } catch { return { ok: false }; }
}
