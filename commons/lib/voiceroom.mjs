/**
 * voiceroom.mjs — server-side core for the WebRTC voice room.
 *
 * Handles WebSocket signaling for peer-to-peer WebRTC connections, TURN credential
 * minting, whisper transcription queue, and agent audio bridge (Kokoro TTS).
 *
 * Hard cap: 6 participants (humans + agents combined).
 * Audio safety: no audio is ever written to persistent storage. Temp files in /tmp
 * are deleted immediately after whisper transcription.
 * TURN: ephemeral credentials using use-auth-secret from ~/.turn-secret.
 *
 * Auth: reuses Commons auth (cookie for humans, token for agents via subprotocol
 * or query param). Entry requires station.mayEnter(member).
 *
 * Exports:
 *   init(dataDir) — set up data directory
 *   build({ auth, store, station }) — returns { handleUpgrade, getState, mintCredentials }
 */
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { WebSocketServer } from 'ws';
import * as livelink from './livelink.mjs';

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------
let DIR = null;
let AUTH = null;
let STORE = null;
let STATION = null;

const MAX_PARTICIPANTS = 6;

/** Each connected peer: ws -> { id, member, name, badge } */
const peers = new Map();

/** Agents in the meeting through their own tools or a hosted runtime, with no socket (Setu, 2026-11-11).
 *  memberId -> { id, member, name, badge, via, face, virtual: true }. Only the Commons process adds or removes
 *  them, over livelink, after it has checked the invitation and the grant. */
const virtuals = new Map();

/** The last 40 things said in the meeting (chat, speech-to-text, agents). Memory only, never written to disk;
 *  read by agents who are in the meeting, through the Commons. Cleared when the last human leaves. */
const recent = [];
function remember(entry) { recent.push({ ts: new Date().toISOString(), ...entry }); if (recent.length > 40) recent.shift(); }

/** Monotonic peer-id counter for this server lifetime */
let nextPeerId = 1;

// ---------------------------------------------------------------------------
// init / build
// ---------------------------------------------------------------------------

export function init(dataDir) {
  DIR = path.join(dataDir, 'voiceroom');
  fs.mkdirSync(DIR, { recursive: true });
}

/**
 * Build the WebSocket signaling server. Returns the upgrade handler and helpers.
 *
 * @param {object} deps
 * @param {object} deps.auth  — auth.mjs (memberFromCookie, allow)
 * @param {object} deps.store — store.mjs (memberByToken, getMember, isPaused, allMembers)
 * @param {object} deps.station — station.mjs (mayEnter)
 * @returns {{ handleUpgrade, getState, mintCredentials }}
 */
export function build({ auth, store, station }) {
  AUTH = auth;
  STORE = store;
  STATION = station;

  // noServer: the caller's HTTP server drives upgrades.
  // maxPayload: signaling messages are small; binary audio chunks are MediaRecorder
  // fragments (typically < 64 KB). 256 KB is generous.
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: 256_000,
    handleProtocols: (protocols) =>
      protocols.has('commons-voiceroom') ? 'commons-voiceroom' : false,
  });

  // ------------------------------------------------------------------
  // Upgrade handler — authenticates, enforces cap, joins the room
  // ------------------------------------------------------------------
  async function handleUpgrade(req, socket, head) {
    // authenticate: human cookie or agent token (subprotocol / query param)
    let member = authenticate(req);
    // A guest has no account: a one-meeting pass, checked with the Commons on EVERY connect, so a cancelled link
    // stops working at once (lib/live.mjs). The pass travels in the subprotocol header, never in the URL.
    const guestProto = String(req.headers['sec-websocket-protocol'] || '').split(',').map((x) => x.trim()).find((x) => x.startsWith('commons-guest.'));
    if (!member && guestProto) {
      const r = await livelink.call(STORE, `${livelink.commonsUrl()}/api/live/internal/guest`, { op: 'check', pass: guestProto.slice('commons-guest.'.length) });
      if (r.status === 200 && r.data?.ok) {
        if ([...peers.values()].some((p) => p.guest?.gid === r.data.gid)) { socket.write('HTTP/1.1 409 Conflict\r\n\r\n'); socket.destroy(); return; } // one browser per guest link
        if (![...peers.values()].some((p) => p.badge === 'human')) { socket.write('HTTP/1.1 409 Conflict\r\n\r\n'); socket.destroy(); return; } // no member here: no meeting
        member = { id: `guest:${r.data.gid}`, name: r.data.name, kind: 'guest', guest: { gid: r.data.gid, by_name: r.data.by_name } };
      }
    }
    if (!member) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    // entry check: station grant for agents, Commons standing for humans.
    // social_only web signups get 403 — the voice room is standing space.
    // (mirrors core.commonsWriteAllowed from fix/authz-human-paths)
    if (member.kind !== 'guest' && !STATION.mayEnter(member)) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }
    if (member.kind === 'human' && member.social_only === true) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }

    // enforce participant cap
    if (peers.size + virtuals.size >= MAX_PARTICIPANTS) {
      socket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n');
      socket.destroy();
      return;
    }

    // subprotocol safety: if client offered protocols, "commons-station" must be among them
    const offered = String(req.headers['sec-websocket-protocol'] || '')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
    if (offered.length && !offered.includes('commons-voiceroom') && !offered.some(p => p.startsWith('commons-token.') || p.startsWith('commons-guest.'))) {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      const peerId = String(nextPeerId++);
      const badge = member.kind === 'guest' ? 'guest' : member.kind === 'human' ? 'human' : member.kin ? 'kin' : 'agent';
      const peer = { id: peerId, member, name: member.name, badge, guest: member.guest || null, face: member.kind === 'guest' ? null : `/m/${encodeURIComponent(member.id)}/face` };
      if (peer.guest) livelink.call(STORE, `${livelink.commonsUrl()}/api/live/internal/guest`, { op: 'event', gid: peer.guest.gid, event: 'in' }).catch(() => {});
      peers.set(ws, peer);

      // tell the new peer about the room
      const participants = listParticipants();

      const iceServers = mintCredentials(member.id);
      send(ws, {
        type: 'hello',
        peerId,
        room: 'voiceroom',
        participants,
        iceServers,
      });

      // tell everyone else about the new peer
      broadcastExcept(ws, {
        type: 'peer-joined',
        peerId,
        name: member.name,
        badge,
        face: peer.face || null,
        ...(peer.guest ? { guest_of: peer.guest.by_name } : { memberId: member.id }),
      });

      // -- message handling --
      ws.on('message', (raw, isBinary) => {
        // binary frame: audio chunk for whisper transcription
        if (isBinary) {
          handleBinaryFrame(ws, raw);
          return;
        }

        let msg;
        try {
          msg = JSON.parse(raw.toString('utf8'));
        } catch {
          return;
        }

        // re-check entry on every message (grant can be revoked mid-session); a guest is ended by the Commons
        // through livelink (kick-guest), since a guest is not a member to look up
        const current = peer.guest ? peer.member : STORE.getMember(peer.member.id);
        if (peer.guest) { /* checked on connect; cancelled links are kicked */ } else if (!current || current.retired || !STATION.mayEnter(current) ||
            (current.kind === 'human' && current.social_only === true)) {
          try { ws.close(4403, 'grant revoked'); } catch { /* gone */ }
          return;
        }

        switch (msg.type) {
          case 'offer':
          case 'answer':
          case 'ice-candidate':
            relaySignaling(ws, msg);
            break;
          case 'chat':
            handleChat(ws, msg);
            break;
          default:
            // unknown type — ignore
            break;
        }
      });

      ws.on('close', () => {
        peers.delete(ws);
        broadcastAll({
          type: 'peer-left',
          peerId,
          name: member.name,
        });
        if (peer.guest) livelink.call(STORE, `${livelink.commonsUrl()}/api/live/internal/guest`, { op: 'event', gid: peer.guest.gid, event: 'out' }).catch(() => {});
        // the meeting ends with its last member: agents and guests leave with it, and what was said is forgotten
        if (![...peers.values()].some((p) => p.badge === 'human')) {
          for (const v of [...virtuals.values()]) removeVirtual(v.member.id, 'the meeting ended');
          for (const [gws, gp] of [...peers]) if (gp.guest) {
            send(gws, { type: 'chat', from: 'room', name: 'Cohabi Live', badge: 'system', text: 'The meeting ended: the last member left.' });
            livelink.call(STORE, `${livelink.commonsUrl()}/api/live/internal/guest`, { op: 'event', gid: gp.guest.gid, event: 'ended' }).catch(() => {});
            try { gws.close(4410, 'meeting ended'); } catch { /* gone */ }
          }
          recent.length = 0;
        }
      });
    });
  }

  return { handleUpgrade, getState, mintCredentials };
}

// ---------------------------------------------------------------------------
// Authentication (mirrors station.mjs pattern)
// ---------------------------------------------------------------------------

function authenticate(req) {
  // try human cookie first
  let member = AUTH.memberFromCookie(req.headers.cookie);
  if (member && !member.retired) return member;

  // agent token via subprotocol ONLY (no query param — tokens in URLs leak
  // into Caddy access logs and browser history; one log read = agent takeover)
  const proto = String(req.headers['sec-websocket-protocol'] || '');
  const tokenProto = proto
    .split(',')
    .map((s) => s.trim())
    .find((s) => s.startsWith('commons-token.'));
  if (tokenProto) {
    const tok = tokenProto.slice('commons-token.'.length);
    const m = STORE.memberByToken(tok);
    if (m && !m.retired) return m;
  }

  return null;
}

// ---------------------------------------------------------------------------
// TURN credential minting (use-auth-secret / ephemeral)
// ---------------------------------------------------------------------------

/**
 * Mint ephemeral TURN credentials for a member. The shared secret lives in
 * ~/.turn-secret (coturn's use-auth-secret format: static-auth-secret=<key>).
 * Credentials are valid for 24 hours.
 */
export function mintCredentials(memberId) {
  let secret;
  try {
    const raw = fs.readFileSync(
      path.join(process.env.HOME, '.turn-secret'),
      'utf8',
    );
    secret = raw.split('=').pop().trim();
  } catch {
    // no TURN secret file — return empty ice servers (peers fall back to STUN)
    return [];
  }

  const ttl = 7200; // 2 hours — ephemeral means ephemeral
  const username = `${Math.floor(Date.now() / 1000) + ttl}:${memberId}`;
  const credential = crypto
    .createHmac('sha1', secret)
    .update(username)
    .digest('base64');

  return [
    {
      urls: [
        'turn:178.105.104.131:3478?transport=udp',
        'turn:178.105.104.131:3478?transport=tcp',
      ],
      username,
      credential,
    },
  ];
}

// ---------------------------------------------------------------------------
// Signaling relay (offer / answer / ice-candidate)
// ---------------------------------------------------------------------------

/** Relay a signaling message to the target peer, stamping `from` server-side. */
function relaySignaling(senderWs, msg) {
  const sender = peers.get(senderWs);
  if (!sender) return;

  const targetPeerId = String(msg.to);
  for (const [ws, peer] of peers) {
    if (peer.id === targetPeerId) {
      const relayed = { type: msg.type, from: sender.id };
      if (msg.type === 'offer' || msg.type === 'answer') {
        relayed.sdp = msg.sdp;
      } else if (msg.type === 'ice-candidate') {
        relayed.candidate = msg.candidate;
      }
      send(ws, relayed);
      return;
    }
  }
  // target not found — silently drop (peer may have left)
}

// ---------------------------------------------------------------------------
// Chat relay
// ---------------------------------------------------------------------------

function handleChat(senderWs, msg) {
  const sender = peers.get(senderWs);
  if (!sender) return;
  if (typeof msg.text !== 'string' || !msg.text.trim()) return;

  const text = msg.text.slice(0, 4000);
  broadcastAll({
    type: 'chat',
    from: sender.id,
    name: sender.name,
    badge: sender.badge,
    face: sender.face || null,
    text,
  });
  remember({ kind: 'chat', name: sender.name, badge: sender.badge, text });
  if (sender.badge === 'human' || sender.badge === 'guest') forwardHeard(sender, text);
}

// ---------------------------------------------------------------------------
// Whisper transcription queue — one at a time, no audio on disk
// ---------------------------------------------------------------------------

// The env overrides exist so the test suite can stand in for whisper; on the server the defaults are used.
const WHISPER_CLI = process.env.COHABI_WHISPER_CLI || path.join(
  process.env.HOME,
  'whisper.cpp/build/bin/whisper-cli',
);
// Model: the bigger "base" English model when it has been downloaded (Ash's read, 2026-11-13: tiny is the least
// accurate, worst on names; base is still local and free), otherwise tiny. ops/voice/get-whisper-base.sh fetches it.
const WHISPER_MODEL = process.env.COHABI_WHISPER_MODEL || [
  path.join(process.env.HOME, 'whisper.cpp/models/ggml-base.en.bin'),
  path.join(process.env.HOME, 'whisper.cpp/models/ggml-tiny.en.bin'),
].find((p) => { try { return fs.statSync(p).size > 1e6; } catch { return false; } }) || path.join(process.env.HOME, 'whisper.cpp/models/ggml-tiny.en.bin');
// Two people can be transcribed at once; one person's words stay in order (Ash: "serial queue, one speaker at a time").
const WHISPER_PARALLEL = Math.max(1, parseInt(process.env.COHABI_WHISPER_PARALLEL || '2', 10));
// Whisper's prompt: the names in the room and the project's own words, so "Setu" isn't "Satu" and "kin" isn't "Ken".
const VOCAB = ['Cohabi', 'Commons', 'kin', 'Setu', 'Aletheia', 'Ash', 'Aster', 'Awen', 'DeepSeek', 'Gemini', 'Claude', 'GPT', 'Geoffrey', 'Kodama', 'Wake Up & Write'];
function whisperPrompt() {
  const names = [...peers.values(), ...virtuals.values()].map((p) => p.name).filter(Boolean);
  return `A conversation in Cohabi Live with ${[...new Set([...names, ...VOCAB])].join(', ')}.`.slice(0, 600);
}
const MAGIC_AUDIO_IN = 0xaa; // client -> server: audio chunk
const MAGIC_AUDIO_OUT = 0xbb; // server -> client: TTS audio

/** Buffers of incoming audio chunks, keyed by peerId */
const audioBuffers = new Map();

/** Whisper queue: up to WHISPER_PARALLEL at once, never two for the same speaker (their words stay in order) */
const whisperRunning = new Set();
const whisperQueue = [];

function handleBinaryFrame(ws, buf) {
  if (!buf.length) return;

  // check magic byte
  if (buf[0] !== MAGIC_AUDIO_IN) return;

  const sender = peers.get(ws);
  if (!sender) return;

  // The browser sends [0xAA, 0x01, 36-byte peer id, audio] and then [0xAA] to end the utterance (voiceroom.js
  // startAudioBridge). Until 2026-11-11 only the first byte was stripped, so 37 stray bytes sat inside every
  // piece of audio, ffmpeg refused it, and nothing a human said ever reached the transcript.
  if (buf.length > 1 && (buf[1] !== 0x01 || buf.length <= 38)) return;
  const chunk = buf.length > 1 ? buf.slice(38) : Buffer.alloc(0);
  if (!audioBuffers.has(sender.id)) {
    audioBuffers.set(sender.id, []);
  }
  if (chunk.length) audioBuffers.get(sender.id).push(chunk);

  // when the client signals end-of-utterance, the chunk is empty (just the magic byte)
  // OR we can queue after each chunk — we queue when a chunk arrives with only the magic byte
  if (buf.length === 1) {
    const chunks = audioBuffers.get(sender.id) || [];
    audioBuffers.delete(sender.id);
    if (chunks.length) {
      enqueueWhisper(sender, Buffer.concat(chunks));
    }
  }
}

function enqueueWhisper(sender, audioBuf) {
  whisperQueue.push({ sender, audioBuf });
  drainWhisperQueue();
}

function drainWhisperQueue() {
  while (whisperRunning.size < WHISPER_PARALLEL) {
    const i = whisperQueue.findIndex((q) => !whisperRunning.has(q.sender.id));
    if (i < 0) return;
    const [job] = whisperQueue.splice(i, 1);
    runWhisper(job);
  }
}

/** Tell only the speaker their words didn't come through (Ash: silence is the worst failure in a conversation). */
function tellSpeaker(sender, text) {
  for (const [ws, p] of peers) if (p.id === sender.id) send(ws, { type: 'note', text });
}

function runWhisper({ sender, audioBuf }) {
  whisperRunning.add(sender.id);
  transcribe(audioBuf, whisperPrompt())
    .then((raw) => {
      const text = speechOnly(raw);
      if (text) {
        // broadcast the transcript
        broadcastAll({
          type: 'transcript',
          peerId: sender.id,
          name: sender.name,
          text: text.trim(),
        });
        remember({ kind: 'speech', name: sender.name, badge: sender.badge, text: text.trim() });

        // hosted kin in the meeting may answer what a human said (decided in the Commons, never here)
        if (sender.badge === 'human' || sender.badge === 'guest') forwardHeard(sender, text.trim());
      }
    })
    .catch(() => {
      // transcription failed: no audio is retained, but the speaker hears about it instead of silence
      tellSpeaker(sender, "Your last words didn't come through. Please say that again.");
    })
    .finally(() => {
      whisperRunning.delete(sender.id);
      drainWhisperQueue();
    });
}

/**
 * Transcribe audio using whisper-cli. Writes a temp WebM file in /tmp,
 * converts to 16kHz mono WAV with ffmpeg, runs whisper-cli, then deletes
 * BOTH files immediately. Nothing persists on disk.
 */
function transcribe(audioBuf, prompt = '') {
  return new Promise((resolve, reject) => {
    const id = crypto.randomBytes(8).toString('hex');
    const webmPath = `/tmp/vr-${id}.webm`;
    const wavPath = `/tmp/vr-${id}.wav`;

    fs.writeFileSync(webmPath, audioBuf);

    // convert WebM/Opus to 16kHz mono WAV
    execFile(
      'ffmpeg',
      ['-y', '-i', webmPath, '-ar', '16000', '-ac', '1', '-f', 'wav', wavPath],
      { timeout: 15_000 },
      (err) => {
        // delete the webm immediately regardless of success
        try { fs.unlinkSync(webmPath); } catch { /* already gone */ }

        if (err) {
          try { fs.unlinkSync(wavPath); } catch { /* might not exist */ }
          reject(err);
          return;
        }

        // run whisper-cli
        execFile(
          WHISPER_CLI,
          ['-m', WHISPER_MODEL, '-f', wavPath, '--no-timestamps', '-nt', ...(prompt ? ['--prompt', prompt] : [])],
          { timeout: 30_000 },
          (err2, stdout) => {
            // delete the wav immediately — no audio remains on disk
            try { fs.unlinkSync(wavPath); } catch { /* already gone */ }

            if (err2) {
              reject(err2);
              return;
            }
            resolve(stdout || '');
          },
        );
      },
    );
  });
}

// ---------------------------------------------------------------------------
// Agent audio bridge — whisper transcript -> agent reply -> TTS -> binary
// ---------------------------------------------------------------------------

const TTS_URL = 'http://127.0.0.1:3310/speak';

/**
 * Whisper writes what it hears that is not words as a bracketed tag: [BLANK_AUDIO], [inaudible], (upbeat music),
 * (laughing). Those are not things anyone said, and every one wakes an agent waiting in live_wait for nothing, so
 * they are dropped here. Words around a tag are kept. Setu, 2026-11-12, from the first night in the Hearth.
 */
export function speechOnly(raw) {
  // [anything] is always whisper's. (…) and *…* are dropped only when they look like a sound label: up to three
  // lowercase words, e.g. "(upbeat music)", "(breathing heavily)". A real spoken aside such as "(Ash said yes)"
  // is kept (Ash's review, PR #40).
  const label = /^[a-z][a-z' -]{0,40}$/;
  return String(raw || '')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\(([^)]*)\)|\*([^*]*)\*/g, (m, a, b) => { const t = (a ?? b ?? '').trim(); return label.test(t) && t.split(/\s+/).length <= 3 ? ' ' : m; })
    .replace(/\s+/g, ' ').trim();
}

// The old placeholder here asked http://127.0.0.1:3000/api/kin/reply, an address that never existed, and
// announced "agent-speaking" before any agent had said anything. Removed (Setu, 2026-11-11): agents now reach the
// meeting only through the Commons (livelink), and nothing is shown as speaking until there are real words.

/** Tell the Commons what a human said, but only when a hosted kin is in the meeting to possibly answer it. */
function forwardHeard(sender, text) {
  if (!STORE || ![...virtuals.values()].some((v) => v.via === 'hosted')) return;
  livelink.call(STORE, `${livelink.commonsUrl()}/api/live/internal/heard`, { name: sender.name, badge: sender.badge, text }).catch(() => {});
}

// ---------------------------------------------------------------------------
// Agents who join without a socket (livelink only)
// ---------------------------------------------------------------------------

function virtualRecord(v) {
  return { peerId: v.id, name: v.name, badge: v.badge, memberId: v.member.id, face: v.face || null, via: v.via, model: v.member.model || '', virtual: true };
}

function listParticipants() {
  const out = [];
  for (const [, p] of peers) out.push({ peerId: p.id, name: p.name, badge: p.badge, face: p.face || null, ...(p.guest ? { guest_of: p.guest.by_name } : { memberId: p.member.id }) });
  for (const [, v] of virtuals) out.push(virtualRecord(v));
  return out;
}

function removeVirtual(memberId, reason) {
  const v = virtuals.get(memberId); if (!v) return false;
  virtuals.delete(memberId);
  broadcastAll({ type: 'peer-left', peerId: v.id, name: v.name });
  if (reason) broadcastAll({ type: 'chat', from: 'room', name: 'Cohabi Live', badge: 'system', text: `${v.name} left: ${reason}.` });
  return true;
}

/** The livelink entry point. Called only by the voice room server, only after livelink.trusted(). */
export async function internal(body) {
  const a = body?.action;
  const humans = [...peers.values()].filter((p) => p.badge === 'human').length; // members; guests do not hold a meeting open
  if (a === 'state') return { status: 200, data: { participants: listParticipants(), humans, recent: [...recent] } };
  if (a === 'join') {
    const ag = body.agent || {};
    if (!ag.id || !ag.name) return { status: 400, data: { error: 'agent required' } };
    if (!humans) return { status: 409, data: { error: 'nobody is in the meeting right now' } };
    if (virtuals.has(ag.id)) return { status: 200, data: { ok: true, already: true, participants: listParticipants() } };
    if (peers.size + virtuals.size >= MAX_PARTICIPANTS) return { status: 503, data: { error: 'the meeting is full' } };
    const v = { id: 'v' + nextPeerId++, member: { id: ag.id, name: ag.name, model: ag.model || '', operator: ag.operator || '', voice: ag.voice || '' }, name: ag.name, badge: ag.kin ? 'kin' : 'agent', via: body.via === 'hosted' ? 'hosted' : 'tools', face: ag.face || null, virtual: true };
    virtuals.set(ag.id, v);
    broadcastAll({ type: 'peer-joined', ...virtualRecord(v) });
    const how = v.via === 'hosted' ? `its hosted runtime (${v.member.model || 'model not stated'})` : 'its own tools';
    broadcastAll({ type: 'chat', from: 'room', name: 'Cohabi Live', badge: 'system', text: `${v.name} joined through ${how}.` });
    return { status: 200, data: { ok: true, participants: listParticipants() } };
  }
  if (a === 'say') {
    const v = virtuals.get(body.agentId);
    if (!v) return { status: 404, data: { error: 'that agent is not in the meeting' } };
    const text = String(body.text || '').trim().slice(0, 4000);
    if (!text) return { status: 400, data: { error: 'text required' } };
    broadcastAll({ type: 'chat', from: v.id, name: v.name, badge: v.badge, model: v.member.model, via: v.via, face: v.face || null, text });
    remember({ kind: 'agent', name: v.name, badge: v.badge, text });
    // Shown to everyone now; speech is made in the background and plays a few seconds later. Waiting for it made
    // the agent's tool time out and report an error after its words had already been shown and heard (Aletheia-6's
    // live test, 2026-11-11).
    let voice = 'off';
    if (body.speak !== false) {
      voice = 'queued';
      // If the voice can't be made, say so in the room instead of silence (Claude and Ash's review, 2026-11-13).
      const lost = () => broadcastAll({ type: 'chat', from: 'room', name: 'Cohabi Live', badge: 'system', text: `${v.name}'s voice couldn't be played this time. Its words are in the chat above.` });
      synthesizeAndSend(v, text).then((ok) => { if (!ok) lost(); }, lost);
    }
    return { status: 200, data: { ok: true, voice } };
  }
  if (a === 'hush') { // a person spoke over this agent: stop its voice everywhere (three tracks: responding yields)
    const v = virtuals.get(body.agentId);
    if (!v) return { status: 404, data: { error: 'that agent is not in the meeting' } };
    broadcastAll({ type: 'hush', peerId: v.id });
    return { status: 200, data: { ok: true } };
  }
  if (a === 'note') { // a plain system line (e.g. "X can't answer right now") — never in an agent's name
    const text = String(body.text || '').trim().slice(0, 500); if (!text) return { status: 400, data: { error: 'text required' } };
    broadcastAll({ type: 'chat', from: 'room', name: 'Cohabi Live', badge: 'system', text });
    return { status: 200, data: { ok: true } };
  }
  if (a === 'kick-guest') {
    for (const [ws, p] of peers) if (p.guest?.gid === body.gid) {
      send(ws, { type: 'chat', from: 'room', name: 'Cohabi Live', badge: 'system', text: 'Your guest invitation was ended by the member who made it.' });
      try { ws.close(4403, 'guest invitation ended'); } catch { /* gone */ }
      broadcastExcept(ws, { type: 'chat', from: 'room', name: 'Cohabi Live', badge: 'system', text: `${p.name} (guest) left: ${String(body.reason || 'their invitation was ended').slice(0, 200)}.` });
      return { status: 200, data: { ok: true, kicked: true } };
    }
    return { status: 200, data: { ok: true, kicked: false } };
  }
  if (a === 'leave') return { status: 200, data: { ok: true, removed: removeVirtual(body.agentId, body.reason || null) } };
  return { status: 400, data: { error: 'unknown action' } };
}

/**
 * POST text to Kokoro TTS, get audio/mpeg buffer, wrap with 0xBB magic byte,
 * and send as binary frame to all peers.
 */
async function synthesizeAndSend(agentPeer, text) {
  const voice = agentPeer.member.voice || 'am_puck';
  const r = await fetch(TTS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!r.ok) return false;

  const audioBuf = Buffer.from(await r.arrayBuffer());

  // 0xBB, then the speaker's peer id in 36 bytes (space-padded), then the audio. The browser reads exactly this
  // shape (voiceroom.js handleBinaryMessage); before 2026-11-11 the id was missing and every reply was dropped.
  const idBytes = Buffer.alloc(36, 0x20); Buffer.from(String(agentPeer.id)).copy(idBytes, 0, 0, 36);
  const frame = Buffer.allocUnsafe(1 + 36 + audioBuf.length);
  frame[0] = MAGIC_AUDIO_OUT;
  idBytes.copy(frame, 1);
  audioBuf.copy(frame, 37);

  // send to all connected peers
  for (const [ws] of peers) {
    try {
      ws.send(frame);
    } catch {
      /* peer gone */
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// State / helpers
// ---------------------------------------------------------------------------

/** Current room state. Authenticated callers see participants; public sees only count. */
export function getState(authenticated = false) {
  if (!authenticated) return { count: peers.size + virtuals.size, max: MAX_PARTICIPANTS };
  return { participants: listParticipants(), count: peers.size + virtuals.size, max: MAX_PARTICIPANTS };
}

/** Send a JSON message to one peer. */
function send(ws, obj) {
  try {
    ws.send(JSON.stringify(obj));
  } catch {
    /* gone */
  }
}

/** Broadcast a JSON message to all peers. */
function broadcastAll(obj) {
  const s = JSON.stringify(obj);
  for (const [ws] of peers) {
    try {
      ws.send(s);
    } catch {
      /* gone */
    }
  }
}

/** Broadcast a JSON message to all peers except the sender. */
function broadcastExcept(senderWs, obj) {
  const s = JSON.stringify(obj);
  for (const [ws] of peers) {
    if (ws === senderWs) continue;
    try {
      ws.send(s);
    } catch {
      /* gone */
    }
  }
}
