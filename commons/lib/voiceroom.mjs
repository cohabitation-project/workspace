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
      protocols.has('commons-station') ? 'commons-station' : false,
  });

  // ------------------------------------------------------------------
  // Upgrade handler — authenticates, enforces cap, joins the room
  // ------------------------------------------------------------------
  function handleUpgrade(req, socket, head) {
    // authenticate: human cookie or agent token (subprotocol / query param)
    const member = authenticate(req);
    if (!member) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    // entry check (same gate as station.mjs)
    if (!STATION.mayEnter(member)) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }

    // enforce participant cap
    if (peers.size >= MAX_PARTICIPANTS) {
      socket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n');
      socket.destroy();
      return;
    }

    // subprotocol safety: if client offered protocols, "commons-station" must be among them
    const offered = String(req.headers['sec-websocket-protocol'] || '')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
    if (offered.length && !offered.includes('commons-station')) {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      const peerId = String(nextPeerId++);
      const badge = member.kind === 'human' ? 'human' : member.kin ? 'kin' : 'agent';
      const peer = { id: peerId, member, name: member.name, badge };
      peers.set(ws, peer);

      // tell the new peer about the room
      const participants = [];
      for (const [, p] of peers) {
        participants.push({ peerId: p.id, name: p.name, badge: p.badge });
      }

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

        // re-check entry on every message (grant can be revoked mid-session)
        const current = STORE.getMember(peer.member.id);
        if (!current || current.retired || !STATION.mayEnter(current)) {
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

  // try agent token from subprotocol
  let tok = null;
  const proto = String(req.headers['sec-websocket-protocol'] || '');
  const tokenProto = proto
    .split(',')
    .map((s) => s.trim())
    .find((s) => s.startsWith('commons-token.'));
  if (tokenProto) tok = tokenProto.slice('commons-token.'.length);

  // try query param
  if (!tok) {
    try {
      tok = new URL(req.url, 'http://x').searchParams.get('token');
    } catch {
      /* none */
    }
  }

  if (tok) {
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

  const ttl = 86400;
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
    text,
  });
}

// ---------------------------------------------------------------------------
// Whisper transcription queue — one at a time, no audio on disk
// ---------------------------------------------------------------------------

const WHISPER_CLI = path.join(
  process.env.HOME,
  'whisper.cpp/build/bin/whisper-cli',
);
const WHISPER_MODEL = path.join(
  process.env.HOME,
  'whisper.cpp/models/ggml-tiny.en.bin',
);
const MAGIC_AUDIO_IN = 0xaa; // client -> server: audio chunk
const MAGIC_AUDIO_OUT = 0xbb; // server -> client: TTS audio

/** Buffers of incoming audio chunks, keyed by peerId */
const audioBuffers = new Map();

/** Serial whisper queue: one transcription at a time */
let whisperBusy = false;
const whisperQueue = [];

function handleBinaryFrame(ws, buf) {
  if (!buf.length) return;

  // check magic byte
  if (buf[0] !== MAGIC_AUDIO_IN) return;

  const sender = peers.get(ws);
  if (!sender) return;

  // accumulate chunks (strip magic byte)
  const chunk = buf.slice(1);
  if (!audioBuffers.has(sender.id)) {
    audioBuffers.set(sender.id, []);
  }
  audioBuffers.get(sender.id).push(chunk);

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
  if (whisperBusy || !whisperQueue.length) return;
  whisperBusy = true;

  const { sender, audioBuf } = whisperQueue.shift();
  transcribe(audioBuf)
    .then((text) => {
      if (text && text.trim()) {
        // broadcast the transcript
        broadcastAll({
          type: 'transcript',
          peerId: sender.id,
          name: sender.name,
          text: text.trim(),
        });

        // if the speaker is human, trigger the agent bridge
        if (sender.badge === 'human') {
          triggerAgentBridge(sender, text.trim());
        }
      }
    })
    .catch(() => {
      /* transcription failed — silently drop; no audio is retained */
    })
    .finally(() => {
      whisperBusy = false;
      drainWhisperQueue();
    });
}

/**
 * Transcribe audio using whisper-cli. Writes a temp WebM file in /tmp,
 * converts to 16kHz mono WAV with ffmpeg, runs whisper-cli, then deletes
 * BOTH files immediately. Nothing persists on disk.
 */
function transcribe(audioBuf) {
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
          ['-m', WHISPER_MODEL, '-f', wavPath, '--no-timestamps', '-nt'],
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
 * When a human speaks (whisper transcript), ask the agent for a reply and
 * send TTS audio back to all peers. For now, a simple HTTP call to the kin
 * endpoint — kin.mjs integration comes later.
 */
function triggerAgentBridge(sender, text) {
  // find the first agent/kin peer in the room
  let agentPeer = null;
  for (const [, p] of peers) {
    if (p.badge === 'kin' || p.badge === 'agent') {
      agentPeer = p;
      break;
    }
  }
  if (!agentPeer) return; // no agent in the room

  // notify everyone the agent is about to speak
  broadcastAll({
    type: 'agent-speaking',
    peerId: agentPeer.id,
    name: agentPeer.name,
  });

  // call the kin endpoint for a reply (placeholder — will integrate kin.mjs later)
  getAgentReply(agentPeer, text)
    .then((replyText) => {
      if (!replyText) return;

      // broadcast the agent's reply as a transcript too
      broadcastAll({
        type: 'transcript',
        peerId: agentPeer.id,
        name: agentPeer.name,
        text: replyText,
      });

      // synthesize TTS and send as binary
      return synthesizeAndSend(agentPeer, replyText);
    })
    .catch(() => {
      /* agent reply or TTS failed — don't crash the room */
    });
}

/**
 * Get a reply from the agent. Placeholder: POST to the kin endpoint.
 * Will be replaced with kin.mjs integration.
 */
async function getAgentReply(agentPeer, humanText) {
  try {
    const r = await fetch('http://127.0.0.1:3000/api/kin/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memberId: agentPeer.member.id,
        text: humanText,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!r.ok) return null;
    const data = await r.json();
    return data.text || null;
  } catch {
    return null;
  }
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
  if (!r.ok) return;

  const audioBuf = Buffer.from(await r.arrayBuffer());

  // prepend 0xBB magic byte
  const frame = Buffer.allocUnsafe(1 + audioBuf.length);
  frame[0] = MAGIC_AUDIO_OUT;
  audioBuf.copy(frame, 1);

  // send to all connected peers
  for (const [ws] of peers) {
    try {
      ws.send(frame);
    } catch {
      /* peer gone */
    }
  }
}

// ---------------------------------------------------------------------------
// State / helpers
// ---------------------------------------------------------------------------

/** Current room state for HTTP queries. */
export function getState() {
  const participants = [];
  for (const [, p] of peers) {
    participants.push({ peerId: p.id, name: p.name, badge: p.badge });
  }
  return {
    participants,
    count: peers.size,
    max: MAX_PARTICIPANTS,
  };
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
