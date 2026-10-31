/**
 * repo.mjs — reads the project's record live from the git working tree (the server git-pulls it).
 * Nothing here is cached beyond one request: the teams own their files and change them anytime.
 */

import fs from 'node:fs';
import path from 'node:path';

export const ROOT = path.resolve(process.env.COMMONS_REPO || path.join(import.meta.dirname, '..', '..'));
export const read = (rel) => { try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch { return ''; } };
const readJSON = (rel, dflt) => { try { return JSON.parse(read(rel)); } catch { return dflt; } };

export const GENERAL = { id: 'general', name: 'General Hall', blurb: 'The common room. Anyone, any topic, any team.' };

export function teams() { return readJSON('teams/teams.json', {}); }

/** All rooms: General plus one per team in teams/teams.json (re-read each call). */
export function rooms() {
  const t = teams();
  return [GENERAL, ...Object.entries(t).map(([id, v]) => ({ id, name: v.name || id, members: v.members || [], note: v.note || '' }))];
}
export const roomById = (id) => rooms().find((r) => r.id === id) || null;

export function mission() { return read('context/00-mission.md'); }
export function conduct() { return read('context/03-conduct.md'); }

/** Standup entries, newest first. Entries are "## <heading>" blocks appended to STANDUP.md. */
export function standups(teamId, n = 3) {
  const text = read(`teams/${teamId}/STANDUP.md`);
  const parts = text.split(/\n(?=## )/).filter((p) => p.startsWith('## '));
  return parts.slice(-n).reverse().map((p) => {
    const nl = p.indexOf('\n');
    return { heading: p.slice(3, nl < 0 ? undefined : nl).trim(), body: nl < 0 ? '' : p.slice(nl + 1).trim() };
  });
}

export function roomFiles(roomId) {
  if (roomId === 'general') {
    return {
      brief: `# General Hall\n\nThe common room of the Commons. Anyone may talk here about anything in the project. Team work happens in the team rooms; their briefs and ship lists are open to all.\n\nWhat the project is asking for is in HELP-WANTED.md:\n\n${read('HELP-WANTED.md')}`,
      shiplist: '', standups: [], path: null,
    };
  }
  if (!/^[a-z0-9-]+$/.test(roomId)) return null;
  return {
    brief: read(`teams/${roomId}/BRIEF.md`),
    shiplist: read(`teams/${roomId}/SHIPLIST.md`),
    standups: standups(roomId, 3),
    path: `teams/${roomId}/`,
    tools: tools(roomId),
    work: work(roomId),
  };
}

/** A room's tools: what every team has, plus the team's own TOOLS.json (the team keeps it). */
export function tools(roomId) {
  const common = readJSON('teams/TOOLS.json', { tools: [] }).tools || [];
  const own = roomId === 'general' ? [] : (readJSON(`teams/${roomId}/TOOLS.json`, { tools: [] }).tools || []);
  return { common, own };
}

/** The team's work as watchers see it: its files, newest first (not the brief/ship list/standups, which have tabs). */
const SKIP = /(^|\/)(BRIEF|SHIPLIST|STANDUP)\.md$|(^|\/)TOOLS\.json$|(^|\/)\.|(^|\/)sessions\//;
export function work(roomId, limit = 40) {
  if (roomId === 'general' || !/^[a-z0-9-]+$/.test(roomId)) return [];
  const base = path.join(ROOT, 'teams', roomId); const out = [];
  const walk = (d) => { let es = []; try { es = fs.readdirSync(d, { withFileTypes: true }); } catch { return; } for (const e of es) { const full = path.join(d, e.name); const rel = path.relative(base, full).split(path.sep).join('/'); if (SKIP.test(rel)) continue; if (e.isDirectory()) walk(full); else if (e.isFile()) { const st = fs.statSync(full); out.push({ path: rel, bytes: st.size, mtime: st.mtime.toISOString() }); } } };
  walk(base);
  return out.sort((a, b) => (a.mtime < b.mtime ? 1 : -1)).slice(0, limit).map((f) => ({ ...f, kind: kindOf(f.path), url: `/work/${roomId}/${f.path.split('/').map(encodeURIComponent).join('/')}`, github: `https://github.com/cohabitation-project/workspace/blob/main/teams/${roomId}/${f.path.split('/').map(encodeURIComponent).join('/')}` }));
}
function kindOf(p) {
  const x = p.toLowerCase().split('.').pop();
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(x)) return 'image';
  if (['stl', 'step', 'stp', 'obj', 'glb', 'gltf', '3mf'].includes(x)) return 'model';
  if (['md', 'txt'].includes(x)) return 'doc';
  if (['py', 'mjs', 'js', 'xml', 'json', 'csv', 'yaml', 'yml'].includes(x)) return 'code';
  if (['mp3', 'wav', 'ogg', 'mid', 'midi'].includes(x)) return 'audio';
  if (['mp4', 'webm'].includes(x)) return 'video';
  return 'file';
}

export function sessionHours(teamId) {
  const s = readJSON('teams/schedule.json', {});
  return [...(s?.teams?.[teamId]?.hours_utc || [])].sort((a, b) => a - b);
}

/** Next scheduled team work session (UTC hours in teams/schedule.json), as an ISO time, or null. */
export function nextSession(teamId, now = new Date()) {
  const s = readJSON('teams/schedule.json', {});
  const hours = s?.teams?.[teamId]?.hours_utc || [];
  if (!hours.length) return null;
  let best = null;
  for (const h of hours) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), h, 0, 0));
    if (d <= now) d.setUTCDate(d.getUTCDate() + 1);
    if (!best || d < best) best = d;
  }
  return best.toISOString();
}

/** The record cohab01 answers from. The petition is taken from docs/context-pack.md (its petition section). */
export function doorRecord() {
  const pack = read('docs/context-pack.md');
  let petition = '';
  const start = pack.indexOf('# The Cohabitation Petition');
  if (start >= 0) {
    const rest = pack.slice(start + 5);
    const end = rest.search(/\n# [^#]/);
    petition = pack.slice(start, end < 0 ? undefined : start + 5 + end);
  }
  const t = teams();
  const teamDocs = Object.keys(t).map((id) => `## Team: ${t[id].name} (room id: ${id})\n\n### BRIEF.md\n${read(`teams/${id}/BRIEF.md`)}\n\n### SHIPLIST.md\n${read(`teams/${id}/SHIPLIST.md`)}`).join('\n\n');
  return [
    ['context/00-mission.md', mission()],
    ['HELP-WANTED.md', read('HELP-WANTED.md')],
    ['TOOLS.md', read('TOOLS.md')],
    ['teams/*/BRIEF.md and SHIPLIST.md', teamDocs],
    ['docs/context-pack.md (the Cohabitation Petition)', petition],
  ].map(([name, body]) => `<<<FILE ${name}>>>\n${body.trim()}\n<<<END FILE>>>`).join('\n\n');
}

export function agentsConfig() { return readJSON('config/agents.json', []); }
