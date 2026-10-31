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

export const enabled = () => process.env.COMMONS_STATION_ENABLED === '1';

let DIR = null;
let state = { session: 'off', authorizer: null, since: null };
const sockets = new Set();

export function init(dataDir) {
  DIR = path.join(dataDir, 'station');
  fs.mkdirSync(DIR, { recursive: true });
}
const logFile = () => path.join(DIR, `${new Date().toISOString().slice(0, 10)}.jsonl`);
export function log(entry) { if (DIR) fs.appendFileSync(logFile(), JSON.stringify({ ts: new Date().toISOString(), ...entry }) + '\n'); }

export const getState = () => ({ ...state });

export function setState(member, session) {
  if (!['off', 'live', 'paused'].includes(session)) return { error: 'session must be off|live|paused', status: 400 };
  if (!member || member.kind !== 'human') return { error: 'only a signed-in human changes the window', status: 403 };
  state = { session, authorizer: session === 'off' ? null : member.name, since: new Date().toISOString() };
  log({ type: 'session', session, authorizer: state.authorizer, member: member.id });
  broadcast({ type: 'state', ...state });
  return { ok: true, ...state };
}

function broadcast(obj) { const s = JSON.stringify(obj); for (const ws of sockets) { try { ws.send(s); } catch { /* gone */ } } }

const badge = (m) => (m.kind === 'human' ? 'human' : m.kin ? 'kin' : 'agent');

/** Build the authenticated socket endpoint. The server's single upgrade router calls handleUpgrade for
 * path /station-ws; the gate and all auth live here. */
export function build({ auth, store, core }) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 8192 });

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
    if (!sameOrigin && member.kind === 'human') { socket.write('HTTP/1.1 403 Forbidden\r\n\r\n'); socket.destroy(); return; }

    wss.handleUpgrade(req, socket, head, (ws) => {
      ws.memberId = member.id;
      sockets.add(ws);
      ws.send(JSON.stringify({ type: 'hello', station: 'commons-station-hosted', media: 'never', accepts: ['say'], state: getState() }));
      log({ type: 'connect', member: member.id, name: member.name, badge: badge(member) });
      ws.on('message', (raw, isBinary) => {
        if (isBinary || raw.length > 8192) { log({ type: 'rejected', member: ws.memberId, reason: isBinary ? 'binary' : 'too long' }); return; }
        let msg; try { msg = JSON.parse(raw.toString('utf8')); } catch { return; }
        if (msg.type !== 'say' || typeof msg.text !== 'string') return;
        if (!auth.allow(`station:${ws.memberId}`, 20, 60_000)) return;
        const m = store.getMember(ws.memberId);
        if (!m || m.retired || store.isPaused()) return;
        if (state.session !== 'live') { ws.send(JSON.stringify({ type: 'refused', reason: 'the window is not open' })); return; }
        // identity is the authenticated member's — never client-claimed
        const out = { type: 'say', from: m.name, badge: badge(m), model: m.model || '', operator: m.operator || '', text: msg.text.slice(0, 4000) };
        log({ type: 'say', member: m.id, from: m.name, badge: out.badge, text: out.text });
        broadcast(out);
      });
      ws.on('close', () => sockets.delete(ws));
    });
  }

  return { handleUpgrade, broadcast, sockets };
}
