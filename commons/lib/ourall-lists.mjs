/**
 * ourall-lists.mjs — what 0ural1 (the music app) may keep on a member's account: hearts and playlists (round 64).
 * Until now they lived in the browser only (public/0ural1/app.js). This is the server half: one validator.
 *
 * Shape: { liked: string[], lists: [{ name, tracks: string[] }] }. A track is a same-origin path ("/...", never "//"
 * or a backslash) or an https URL: never javascript:, data:, http: or a protocol-relative address, because the app
 * will one day put these in an <audio src> and an <a href>. Limits: 50 lists, 500 tracks a list, 2000 liked, each
 * string <= 300 chars, a list name 1..80 chars. Anything else is a 400 with a plain message; nothing is trimmed
 * silently, so a bad save never half-works.
 */
import { CommonsError } from './core.mjs';

export const LIMITS = { lists: 50, tracksPerList: 500, liked: 2000, str: 300, name: 80 };

const bad = (msg) => { throw new CommonsError(400, msg); };
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f]/;

function checkTrack(u, where) {
  if (typeof u !== 'string') bad(`${where}: each track must be text`);
  if (u.length === 0 || u.length > LIMITS.str) bad(`${where}: a track address must be 1 to ${LIMITS.str} characters`);
  if (CONTROL.test(u) || /\s/.test(u)) bad(`${where}: a track address can't contain spaces or control characters`);
  if (u.startsWith('/')) {
    if (u.startsWith('//') || u.includes('\\')) bad(`${where}: that address isn't a path on this site`);
    return u;
  }
  let parsed;
  try { parsed = new URL(u); } catch { bad(`${where}: a track must be a path on this site or an https address`); }
  if (parsed.protocol !== 'https:' || !u.toLowerCase().startsWith('https://')) bad(`${where}: a track must be a path on this site or an https address`);
  return u;
}

/** Returns the cleaned { liked, lists }, or throws a 400 CommonsError. */
export function check(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) bad('send {"liked": [...], "lists": [...]}');
  const { liked, lists } = body;
  if (!Array.isArray(liked)) bad('"liked" must be a list of track addresses');
  if (!Array.isArray(lists)) bad('"lists" must be a list of playlists');
  if (liked.length > LIMITS.liked) bad(`at most ${LIMITS.liked} liked tracks`);
  if (lists.length > LIMITS.lists) bad(`at most ${LIMITS.lists} playlists`);
  const outLiked = liked.map((u) => checkTrack(u, 'liked'));
  const outLists = lists.map((l, i) => {
    const where = `playlist ${i + 1}`;
    if (!l || typeof l !== 'object' || Array.isArray(l)) bad(`${where}: send {"name": "...", "tracks": [...]}`);
    if (typeof l.name !== 'string' || !l.name.trim() || l.name.length > LIMITS.name) bad(`${where}: a name of 1 to ${LIMITS.name} characters`);
    if (CONTROL.test(l.name)) bad(`${where}: the name can't contain control characters`);
    if (!Array.isArray(l.tracks)) bad(`${where}: "tracks" must be a list`);
    if (l.tracks.length > LIMITS.tracksPerList) bad(`${where}: at most ${LIMITS.tracksPerList} tracks`);
    return { name: l.name, tracks: l.tracks.map((u) => checkTrack(u, where)) };
  });
  return { liked: outLiked, lists: outLists };
}

/** What a member has saved (empty when nothing yet). Copies, so a caller can't change the record in place. */
export function read(member) {
  const s = member && member.ourall;
  return s ? { liked: [...s.liked], lists: s.lists.map((l) => ({ name: l.name, tracks: [...l.tracks] })) } : { liked: [], lists: [] };
}
