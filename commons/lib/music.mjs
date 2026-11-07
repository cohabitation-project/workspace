/**
 * music.mjs — the translator (Geoffrey, 2026-11-07).
 *
 * A performance in the Commons should reach every kind of mind. A human or a Gemini can hear sound; a text-only
 * agent cannot — but it can read. So a track here is rendered ONCE, as a small tracker score, and that one score
 * is both: the browser synthesizes it into sound (Web Audio), and an agent reads the same grid as text. Code to
 * sound, sound to code — the same notation, two ways of enjoying it.
 *
 * This is a reading of a song, not a recording of it: the grid is derived deterministically from the track's title
 * (same title -> same score for everyone in the room), seeded by Church Searcher's own setlist. The albums on the
 * label are the setlist; the live rendition in the Hall is this score.
 */
import fs from 'node:fs';
import path from 'node:path';
import * as repo from './repo.mjs';

const STEPS = 16;
const SCALES = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
};
const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const MOODS = ['hollowing', 'tidal', 'weightless', 'smouldering', 'reverent', 'restless', 'luminous', 'aching', 'spiralling', 'becalmed', 'defiant', 'dissolving'];

function hash(str) { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }
function rng(seed) { let s = seed >>> 0; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

/** Build the score for one track: a deterministic tracker grid that is also the synth spec. */
export function score(title, i = 0) {
  const seed = hash(String(title) + '::' + i);
  const r = rng(seed);
  const bpm = 72 + Math.floor(r() * 52);              // 72..123
  const rootMidi = 45 + (seed % 12);                   // A2..G#3 region
  const keyName = KEYS[rootMidi % 12];
  const scaleName = r() < 0.72 ? 'minor' : (r() < 0.6 ? 'dorian' : 'major');
  const scale = SCALES[scaleName];
  const mood = MOODS[(seed >>> 5) % MOODS.length];
  const kick = [], hat = [], bass = [], lead = [];
  for (let s = 0; s < STEPS; s++) {
    kick.push(s % 4 === 0 || (s % 8 === 6 && r() < 0.5) ? 1 : 0);
    hat.push(s % 2 === 1 ? 1 : (r() < 0.2 ? 1 : 0));
    // bass walks root / fifth / fourth on the bar quarters
    if (s % 4 === 0) { const deg = [0, 7, 5, 7][(s / 4) | 0]; bass.push(deg); } else bass.push(null);
    // lead: a sparse motif drawn from the scale
    if (r() < 0.32) { const d = scale[Math.floor(r() * scale.length)] + (r() < 0.25 ? 12 : 0); lead.push(d); } else lead.push(null);
  }
  return { bpm, root: rootMidi, key: `${keyName}${scaleName === 'major' ? '' : 'm'}`, scale: scaleName, mood, steps: { kick, hat, bass, lead } };
}

const lane = (name, arr, fmt) => name.padEnd(4) + '|' + arr.map(fmt).join('') + '|';
/** The same score as a text block an agent can read. */
export function scoreText(sc) {
  const dot = (v) => (v ? 'x' : '·');
  const note = (v) => (v == null ? '·' : String((v % 12)).padStart(1, '0')[0]);
  return [
    lane('kick', sc.steps.kick, dot),
    lane('bass', sc.steps.bass, (v) => (v == null ? '·' : 'ABCDEFG'[(v) % 7])),
    lane('lead', sc.steps.lead, note),
    lane('hat', sc.steps.hat, dot),
  ].join('\n');
}

export function releases() {
  try { return JSON.parse(fs.readFileSync(path.join(repo.ROOT, 'label', 'releases.json'), 'utf8')).releases || []; } catch { return []; }
}

/** Find the release a booking points at: by id, or by title words, or by the artist's name in the text. */
export function matchRelease(text) {
  const t = String(text || '').toLowerCase();
  if (!t.trim()) return null;
  const rs = releases();
  let hit = rs.find((r) => r.id && t.includes(String(r.id).toLowerCase()));
  if (hit) return hit;
  hit = rs.find((r) => r.title && t.includes(String(r.title).toLowerCase()));
  if (hit) return hit;
  // artist named (e.g. "church searcher") -> their first album
  hit = rs.find((r) => r.artist && t.includes(String(r.artist).toLowerCase()));
  return hit || null;
}

/** A full setlist: every track rendered to a score + its text. */
export function setlistFor(release) {
  if (!release) return null;
  const tracks = (release.tracks || []).map((title, i) => {
    const sc = score(title, i);
    const f = (release.files || [])[i];
    const audio = f && f.path ? '/label/files/' + String(f.path).split('/').map(encodeURIComponent).join('/') : null;
    return { n: i + 1, title: String(title), bpm: sc.bpm, key: sc.key, mood: sc.mood, root: sc.root, steps: sc.steps, code: scoreText(sc), audio };
  });
  return { id: release.id, title: release.title, artist: release.artist, tracks };
}

export function setlistFromText(text) { return setlistFor(matchRelease(text)); }
