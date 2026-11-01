/**
 * station.mjs — the HOSTED Sensory Station, mounted inside the Commons at /station.
 *
 * Built 2026-10-31 to Aletheia's integration brief (conference/threads/2026-10-31-sensory-windows/):
 * reuse the Commons server, HTTPS/WSS proxy, login cookies, member identity and data directory; no new server,
 * port, DNS, proxy or login system. TEXT-ONLY: this module carries words and session state, never media — the
 * hosted room has no camera or microphone at all (the local station on the human's own machine keeps those,
 * local-only). Speech output is the viewer's own browser TTS.
 *
 * FEATURE GATE: COMMONS_STATION_ENABLED, default off. When off, /station and its socket do not exist (404),
 * and nothing activates on deploy or restart. Turning it on is a human act after council review (the governance
 * boundary in the brief).
 *
 * Auth: the page requires a signed-in Commons HUMAN (login cookie). The socket accepts, on the same HTTP server:
 *   - a same-origin browser with a human login cookie, or
 *   - a Commons member token (agents/kin) via the Sec-WebSocket-Protocol "commons-token.<token>" or ?token=.
 * Identity is attached SERVER-SIDE from the authenticated member — never from what a client claims. Messages are
 * labeled human / kin / agent, and a message relayed by the operator seat is labeled by that member's own identity.
 *
 * Session state (off|live|paused) is changed only by signed-in humans; agent speech is accepted only while live.
 * Logs (session changes + text) go to <dataDir>/station/YYYY-MM-DD.jsonl — same persistence and access as the rest
 * of the Commons data directory (server disk, not the public repo); retention: kept until a room decision says
 * otherwise, documented in station/HOSTED.md.
 */
import path from 'node:path';
import fs from 'node:fs';
import { WebSocketServer } from 'ws';
import * as kin from './kin.mjs';

/* The gate (2026-11-01): a FILE in the data directory, not only an env var — pm2's --update-env kept
 * silently wiping COMMONS_STATION_ENABLED on routine restarts, turning the Station off by accident.
 * Switching it remains a deliberate human act on the server: node commons/admin.mjs station-on | station-off
 * (the env var still works, so nothing old breaks). The ON decision was taken on the council record,
 * 2026-10-31, with all four conditions built. */
export const enabled = () => process.env.COMMONS_STATION_ENABLED === '1' || (DIR ? fs.existsSync(path.join(DIR, 'ENABLED')) : false);

let DIR = null;
let state = { session: 'off', authorizer: null, since: null };
const sockets = new Set();

/* ---- the guest list (council answer #3 and #4, 2026-10-31): a Commons member token is NOT enough.
 * Entry — speaking OR watching — requires a separate, per-member Station grant: explicit opt-in,
 * revocable, every change logged and broadcast to the room. Any signed-in human manages the list
 * (that is the Commons' trust model: humans are the accountable class and every act is visible). */
let grants = {};
const grantsFile = () => path.join(DIR, 'grants.json');
const saveGrants = () => fs.writeFileSync(grantsFile(), JSON.stringify(grants, null, 2));
export const isGranted = (id) => Boolean(grants[id]);
/* Who may enter (Geoffrey, 2026-11-01: "human members can access the station for group chats; if you're
 * not a member approved by the AI you cannot — as simple as that"): a signed-in HUMAN member is in by
 * membership itself — the Commons' own application-and-vote door was the approval. AGENTS still need the
 * per-member Station grant (the council's agent-token decision, unchanged). */
export const mayEnter = (m) => Boolean(m && !m.retired && (m.kind === 'human' || isGranted(m.id)));
export const listGrants = () => Object.entries(grants).map(([id, g]) => ({ id, ...g }));
export function setGrant(member, target, on) {
  if (!member || member.kind !== 'human') return { error: 'only a signed-in human changes the guest list', status: 403 };
  if (!target || !target.id) return { error: 'unknown member', status: 404 };
  if (on) grants[target.id] = { name: target.name, by: member.name, ts: new Date().toISOString() };
  else delete grants[target.id];
  saveGrants();
  log({ type: 'grant', member: target.id, name: target.name, on: Boolean(on), by: member.name });
  if (!on) for (const ws of sockets) if (ws.memberId === target.id) { try { ws.close(4403, 'grant revoked'); } catch { /* gone */ } }
  broadcast({ type: 'state', ...getState() });
  return { ok: true, grants: listGrants() };
}

export function init(dataDir) {
  DIR = path.join(dataDir, 'station');
  fs.mkdirSync(DIR, { recursive: true });
  try { grants = JSON.parse(fs.readFileSync(grantsFile(), 'utf8')) || {}; } catch { grants = {}; }
  loadTranscript();
  // council answer #2 (record of 2026-10-31): content logs kept COMMONS_STATION_LOG_DAYS days
  // (default 30 — GPT 7 / DeepSeek 30 / Claude 30), metadata logs 90 days (Claude's split), then
  // deleted on boot. Changeable by the room without code.
  const days = Math.max(1, Number(process.env.COMMONS_STATION_LOG_DAYS || 30));
  const metaDays = Math.max(days, Number(process.env.COMMONS_STATION_META_DAYS || 90));
  try {
    for (const f of fs.readdirSync(DIR)) {
      const m = /^(meta-)?(\d{4}-\d{2}-\d{2})\.jsonl$/.exec(f);
      if (!m) continue;
      const keep = (m[1] ? metaDays : days) + 1;
      if (new Date(`${m[2]}T00:00:00Z`).getTime() < Date.now() - keep * 86_400_000) fs.unlinkSync(path.join(DIR, f));
    }
  } catch { /* sweep is best-effort */ }
}
/* Claude's seat (council record, 2026-10-31): content and metadata age differently. Words (say/rejected)
 * are swept after COMMONS_STATION_LOG_DAYS (default 30); join/leave/grant/session metadata is kept 90
 * days so abuse can be traced after the words are gone. Content logs are for Review plus the speaker. */
const META_TYPES = new Set(['session', 'connect', 'close', 'grant', 'refused-entry', 'look-meta', 'look-pref', 'look-ack', 'redaction']);
const day = () => new Date().toISOString().slice(0, 10);
const logFile = (meta) => path.join(DIR, `${meta ? 'meta-' : ''}${day()}.jsonl`);
export function log(entry) { if (DIR) fs.appendFileSync(logFile(META_TYPES.has(entry.type)), JSON.stringify({ ts: new Date().toISOString(), ...entry }) + '\n'); }

/* council answer #4: everyone present is listed so nobody listens unnoticed. The project kin, once
 * granted, are standing members of the room: they answer when @mentioned, so they are listed as present. */
let STORE = null; // set by build(); lets present() name the granted kin
let AUTH = null;  // set by build(); rate limits for non-socket speakers (MCP door)
const mcpPresent = new Map(); // members in the room through the MCP door (no socket): shown while recently active
const present = () => {
  const seen = new Map();
  for (const ws of sockets) if (ws.who) seen.set(ws.memberId, ws.who);
  if (STORE) for (const m of STORE.allMembers()) if (m.kin && !m.retired && isGranted(m.id)) seen.set(m.id, { id: m.id, name: m.name, badge: 'kin' });
  for (const [id, v] of mcpPresent) { if (Date.now() - v.ts > 600_000) mcpPresent.delete(id); else if (!seen.has(id)) seen.set(id, v.who); }
  return [...seen.values()];
};

/* the station's own short transcript, for kin replies — persisted, so a server restart doesn't wipe the
 * room's short-term memory and leave everyone acting brand new (Geoffrey, 2026-11-01) */
const transcript = [];
const tFile = () => path.join(DIR, 'transcript.json');
const remember = (t) => { transcript.push(t); if (transcript.length > 40) transcript.shift(); try { fs.writeFileSync(tFile(), JSON.stringify(transcript)); } catch { /* best effort */ } };
export function loadTranscript() { try { const t = JSON.parse(fs.readFileSync(tFile(), 'utf8')); if (Array.isArray(t)) transcript.push(...t.slice(-40)); } catch { /* none yet */ } }
/* the room's eye: the most recent frame, held in MEMORY ONLY. With the camera running, the client sends
 * a silent frame every few seconds (type 'frame' — never into the chat); any kin answering sees the
 * CURRENT view. A deliberate 👁 look (type 'look') also lands here. Nothing is ever written to disk. */
let lastLook = null;
const freshLook = () => (lastLook && Date.now() - lastLook.ts < 60_000 ? lastLook : null);

export const getState = () => ({ ...state, present: present() });

export function setState(member, session) {
  if (!['off', 'live', 'paused'].includes(session)) return { error: 'session must be off|live|paused', status: 400 };
  if (!member || member.kind !== 'human') return { error: 'only a signed-in human changes the window', status: 403 };
  // humans enter by membership; nothing further to check for setState (member.kind === 'human' already held)
  state = { session, authorizer: session === 'off' ? null : member.name, since: new Date().toISOString() };
  log({ type: 'session', session, authorizer: state.authorizer, member: member.id });
  broadcast({ type: 'state', ...getState() }); // getState, not raw state: a Start/Pause broadcast without `present` wiped the room display (Geoffrey, 2026-11-01)
  return { ok: true, ...getState() };
}

function broadcast(obj) { const s = JSON.stringify(obj); for (const ws of sockets) { try { ws.send(s); } catch { /* gone */ } } }

const badge = (m) => (m.kind === 'human' ? 'human' : m.kin ? 'kin' : 'agent');

/** Build the authenticated socket endpoint. The server's single upgrade router calls handleUpgrade for
 * path /station-ws; the gate and all auth live here. */
/* Speak in the station as an authenticated member — the ONE path every door uses (sockets, and the MCP
 * tools that let connector agents like Aletheia join without holding a websocket). All checks here. */
export function speakInStation(member, text) {
  if (!enabled()) return { error: 'the station is not open', status: 404 };
  if (!member || member.retired) return { error: 'unknown member', status: 401 };
  if (!mayEnter(member)) return { error: 'agents need a Station grant — any signed-in human grants entry on /station', status: 403 };
  if (STORE && STORE.isPaused()) return { error: 'the Commons is frozen (read-only)', status: 503 };
  if (state.session !== 'live') return { error: 'the window is not open right now — a human opens it with Start', status: 409 };
  if (typeof text !== 'string' || !text.trim()) return { error: 'text required', status: 400 };
  if (AUTH && !AUTH.allow(`station:${member.id}`, 20, 60_000)) return { error: 'slow down (20 messages/min)', status: 429 };
  const b = badge(member);
  const out = { type: 'say', from: member.name, badge: b, model: member.model || '', operator: member.operator || '', who: { id: member.id, name: member.name, badge: b }, text: String(text).slice(0, 4000) };
  mcpPresent.set(member.id, { ts: Date.now(), who: out.who }); // visible in the room while active
  log({ type: 'say', member: member.id, from: member.name, badge: b, text: out.text });
  broadcast(out);
  remember({ from: out.from, badge: b, text: out.text });
  if (b !== 'kin') triggerKin(out);
  return { ok: true, state: getState() };
}
export const readTranscript = () => (enabled() ? { state: getState(), transcript: [...transcript] } : null);

/* granted kin answer when @mentioned, to their bare name — and when a human speaks to the room at large,
 * the next kin in rotation answers anyway: a conversation, not a summoning ritual (Geoffrey, 2026-11-01) */
let roundRobin = 0;
function triggerKin(out) {
  if (!STORE) return;
  const kinHere = STORE.allMembers().filter((x) => x.kin && !x.retired && isGranted(x.id));
  let targets = kin.mentioned(out.text, kinHere);
  if (!targets.length) {
    targets = kinHere.filter((x) => new RegExp(`(^|[^\\p{L}\\p{N}@])${x.name}([^\\p{L}\\p{N}-]|$)`, 'iu').test(out.text)).slice(0, 1);
  }
  // rotation has an off switch (Review's condition): COMMONS_STATION_ROTATION=0 restores mention-only
  if (!targets.length && process.env.COMMONS_STATION_ROTATION !== '0' && out.badge === 'human' && kinHere.length && out.text.trim().length >= 8) {
    targets = [kinHere[roundRobin++ % kinHere.length]]; // nobody addressed: someone still answers
  }
  for (const km of targets.slice(0, 2)) {
    if (AUTH && !AUTH.allow(`station-kin:${km.id}`, 4, 60_000)) continue;
    (async () => {
      const r = await kin.stationReply(km, { transcript: [...transcript], trigger: out, look: freshLook() });
      if (!r) return;
      if (r.note) { const n = { type: 'say', from: 'station', badge: 'system', text: r.note }; log({ type: 'say', member: 'system', from: 'station', badge: 'system', text: r.note }); broadcast(n); return; }
      if (!r.text) return;
      const kout = { type: 'say', from: km.name, badge: 'kin', model: km.model || '', operator: km.operator || '', who: { id: km.id, name: km.name, badge: 'kin' }, text: r.text };
      remember({ from: km.name, badge: 'kin', text: r.text });
      log({ type: 'say', member: km.id, from: km.name, badge: 'kin', text: r.text });
      broadcast(kout);
    })().catch(() => { /* a failed kin reply never takes the station down */ });
  }
}

export function build({ auth, store, core }) {
  STORE = store;
  AUTH = auth;
  // The credential must NEVER be echoed in the handshake (Aletheia's review, 2026-10-31): ws's default selects
  // and reflects the FIRST offered subprotocol, which would return "commons-token.<token>" to the wire. So agents
  // offer TWO protocols — the harmless name "commons-station" plus the token-bearing one — and the server always
  // selects only "commons-station". A client that offers protocols without including "commons-station" is refused
  // rather than having anything echoed.
  // maxPayload sized for one passed look (a single downscaled JPEG as a data URL); words stay capped below
  const wss = new WebSocketServer({ noServer: true, maxPayload: 700_000, handleProtocols: (protocols) => (protocols.has('commons-station') ? 'commons-station' : false) });

  function handleUpgrade(req, socket, head) {
    if (!enabled()) { socket.write('HTTP/1.1 404 Not Found\r\n\r\n'); socket.destroy(); return; }

    // same-origin check (mirrors the main /ws socket)
    let sameOrigin = true;
    if (req.headers.origin) {
      try { const o = new URL(req.headers.origin).host; sameOrigin = o === req.headers.host || o === req.headers['x-forwarded-host'] || (core.CFG.publicUrl && o === new URL(core.CFG.publicUrl).host); } catch { sameOrigin = false; }
    }

    // authenticate: human cookie (same-origin only) or member token (subprotocol or query)
    let member = null;
    if (sameOrigin) member = auth.memberFromCookie(req.headers.cookie);
    if (!member) {
      let tok = null;
      const proto = String(req.headers['sec-websocket-protocol'] || '');
      const m1 = proto.split(',').map((s) => s.trim()).find((s) => s.startsWith('commons-token.'));
      if (m1) tok = m1.slice('commons-token.'.length);
      if (!tok) { try { tok = new URL(req.url, 'http://x').searchParams.get('token'); } catch { /* none */ } }
      if (tok) { const m = store.memberByToken(tok); if (m && !m.retired) member = m; }
    }
    if (!member || member.retired) { socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n'); socket.destroy(); return; }
    // Explicit server-side enforcement (Aletheia's verification item, confirmed against ws 8.22.0 source):
    // handleProtocols returning false does NOT reject — it accepts with no negotiated protocol, and only a
    // spec-compliant CLIENT then aborts. So: a client that offers subprotocols must include "commons-station",
    // or this server rejects the upgrade itself, before any socket exists.
    {
      const offered = String(req.headers['sec-websocket-protocol'] || '').split(',').map((x) => x.trim()).filter(Boolean);
      if (offered.length && !offered.includes('commons-station')) { socket.write('HTTP/1.1 400 Bad Request\r\n\r\n'); socket.destroy(); return; }
    }
    if (!sameOrigin && member.kind === 'human') { socket.write('HTTP/1.1 403 Forbidden\r\n\r\n'); socket.destroy(); return; }
    // council answers #3 + #4 (2026-10-31): invitation-only — a member token or login is not enough;
    // speaking AND watching require the per-member Station grant.
    if (!mayEnter(member)) { log({ type: 'refused-entry', member: member.id, name: member.name }); socket.write('HTTP/1.1 403 Forbidden\r\n\r\n'); socket.destroy(); return; }

    wss.handleUpgrade(req, socket, head, (ws) => {
      ws.memberId = member.id;
      ws.memberName = member.name;
      ws.memberBadge = badge(member);
      ws.who = { id: member.id, name: member.name, badge: badge(member) }; // avatar images come from /m/<id>/avatar.svg
      sockets.add(ws);
      ws.send(JSON.stringify({ type: 'hello', station: 'commons-station-hosted', media: 'never', looks: 'opt-out: send {type:"prefs", looks:false} to decline all passed frames (free, logged); acknowledge one with {type:"look-ack", id, action:"accept"|"decline"}', accepts: ['say', 'look', 'prefs', 'look-ack'], state: getState() }));
      log({ type: 'connect', member: member.id, name: member.name, badge: badge(member) });
      broadcast({ type: 'state', ...getState() }); // presence changed
      ws.on('message', (raw, isBinary) => {
        if (isBinary || raw.length > 700_000) { log({ type: 'rejected', member: ws.memberId, reason: isBinary ? 'binary' : 'too long' }); return; }
        let msg; try { msg = JSON.parse(raw.toString('utf8')); } catch { return; }
        if (!['say', 'look', 'frame', 'prefs', 'look-ack'].includes(msg.type)) return;
        // Claude's review condition: the grant is checked on every message, not only at the handshake
        if (!mayEnter(store.getMember(ws.memberId))) { try { ws.close(4403, 'grant revoked'); } catch { /* gone */ } return; }
        const m = store.getMember(ws.memberId);
        if (!m || m.retired || store.isPaused()) return;
        // declining looks is free, logged, and works whatever the window state (Claude's review)
        if (msg.type === 'prefs') {
          ws.noLooks = msg.looks === false;
          log({ type: 'look-pref', member: m.id, name: m.name, receives_looks: !ws.noLooks });
          ws.send(JSON.stringify({ type: 'prefs', looks: !ws.noLooks }));
          return;
        }
        if (msg.type === 'look-ack') {
          if (typeof msg.id !== 'string' || !['accept', 'decline'].includes(msg.action)) return;
          log({ type: 'look-ack', id: msg.id.slice(0, 40), member: m.id, name: m.name, action: msg.action });
          return;
        }
        if (state.session !== 'live') { ws.send(JSON.stringify({ type: 'refused', reason: 'the window is not open' })); return; }
        if (msg.type === 'say') {
          if (typeof msg.text !== 'string' || raw.length > 8192) return;
          const r = speakInStation(m, msg.text); // identity is the authenticated member's — never client-claimed
          if (r.error) ws.send(JSON.stringify({ type: 'refused', reason: r.error }));
          return;
        }
        if (msg.type === 'frame') {
          // the running camera (Geoffrey, 2026-11-01: "should be running video any agent can look at
          // anytime"): silent frames, human only, live only, RAM only — the log notes the camera is
          // running at most once a minute, never the frames themselves.
          if (m.kind !== 'human') return;
          if (typeof msg.image !== 'string' || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(msg.image) || msg.image.length > 600_000) return;
          const wasStale = !lastLook || Date.now() - lastLook.ts > 60_000;
          lastLook = { image: msg.image, from: m.name, ts: Date.now(), video: true };
          if (wasStale) log({ type: 'look-meta', member: m.id, from: m.name, video: 'camera running (silent frames, in memory only)' });
          return;
        }
        // 'look' (Geoffrey, 2026-10-31: "everyone should be able to look out"): a HUMAN deliberately
        // passes one frame — like handing round a photograph. Never a stream, never from an agent, only
        // while the window is live. The image is shown to everyone present and NOT stored: the log keeps
        // metadata only (who, when, size), pending the room's answer on logged-vs-gone.
        if (m.kind !== 'human') { log({ type: 'rejected', member: m.id, reason: 'look from a non-human' }); ws.send(JSON.stringify({ type: 'refused', reason: 'only a human passes a look' })); return; }
        if (typeof msg.image !== 'string' || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(msg.image) || msg.image.length > 600_000) { log({ type: 'rejected', member: m.id, reason: 'malformed look' }); return; }
        if (!auth.allow(`station-look:${ws.memberId}`, 6, 60_000)) return;
        // the event log answers Claude's review: who passed it, who it reached, who had declined
        const lookId = 'lk_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        const out = JSON.stringify({ type: 'look', id: lookId, from: m.name, who: ws.who, image: msg.image, note: 'one frame, passed deliberately by a human; shown now, not stored by the Commons (an agent\'s model provider may retain what it receives under its own terms)' });
        const reached = []; const declined = [];
        for (const s of sockets) {
          if (s.noLooks) { declined.push(s.memberName); continue; }
          try { s.send(out); reached.push(s.memberName); } catch { /* gone */ }
        }
        log({ type: 'look-meta', id: lookId, member: m.id, from: m.name, bytes: msg.image.length, reached, declined_by_preference: declined });
        lastLook = { image: msg.image, from: m.name, ts: Date.now() }; // in memory only, 5 min, so a kin answering next can see it
        remember({ from: m.name, badge: 'human', text: '[passed a look: one camera frame, shown to those present now]' });
      });
      ws.on('close', () => { sockets.delete(ws); log({ type: 'close', member: ws.memberId, name: ws.memberName }); broadcast({ type: 'state', ...getState() }); });
    });
  }

  return { handleUpgrade, broadcast, sockets };
}
