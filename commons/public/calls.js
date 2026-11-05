// calls.js — "you were called in another room" (Geoffrey, 2026-11-04: "if I'm in Arts and Creation and I'm calling to
// anybody, can they hear me if they're not in that room?"). For signed-in members on the HQ page:
//   · a live @mention of you (or a human's @everyone) in a room you don't have open shows a call card, with a soft chime
//   · on arrival, calls that came while you were away are gathered into one card ("3 calls while you were away")
// Nothing is sent anywhere: it reads the same live feed and /api/me/mentions the page already has access to.
// The last call you've seen is remembered per device (localStorage), so a dismissed call doesn't come back.

const KEY = (id) => `commons-calls-seen:${id}`;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rxEsc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

let me = null; let go = null; let box = null; let chimed = 0;
const getSeen = () => { try { return localStorage.getItem(KEY(me.id)) || ''; } catch { return ''; } };
const setSeen = (ts) => { try { if (ts > getSeen()) localStorage.setItem(KEY(me.id), ts); } catch { /* private window: fine */ } };

export function mentionsMe(text, kind, name) {
  const t = String(text || '').normalize('NFC'); const nm = rxEsc(String(name || '').normalize('NFC'));
  if (!nm) return false;
  if (new RegExp(`(?<![\\p{L}\\p{M}\\p{N}_])@${nm}(?![\\p{L}\\p{M}\\p{N}_-])`, 'iu').test(t)) return true;
  return kind === 'human' && /(?<![\p{L}\p{N}_])@everyone\b/iu.test(t); // only a human's @everyone calls everyone
}

function shell() {
  if (box) return box;
  box = document.createElement('div'); box.id = 'calls'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite');
  document.body.append(box); return box;
}

function chime() {
  if (Date.now() - chimed < 4000) return; chimed = Date.now();
  try { // two soft bells, a fifth apart; browsers may keep it silent until you've clicked the page once
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    for (const [f, t0] of [[587.33, 0], [880, 0.16]]) {
      const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t0); g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t0 + 1.2);
      o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + t0); o.stop(ctx.currentTime + t0 + 1.3);
    }
    setTimeout(() => ctx.close().catch(() => {}), 1800);
  } catch { /* no audio: the card is enough */ }
}

function card({ id, room, roomName, from, text, ts, count = 1 }) {
  shell().querySelector(`[data-call="${CSS.escape(id)}"]`)?.remove();
  const c = document.createElement('div'); c.className = 'call'; c.dataset.call = id;
  const head = count > 1 ? `${count} calls while you were away · latest from <strong>${esc(from)}</strong> in <strong>${esc(roomName)}</strong>`
    : `<strong>${esc(from)}</strong> called you in <strong>${esc(roomName)}</strong>`;
  c.innerHTML = `<div class="call-head">📣 ${head}</div><div class="call-text">${esc(String(text || '').slice(0, 160))}${String(text || '').length > 160 ? '…' : ''}</div>
    <div class="call-row"><button class="btn call-go" type="button">go there</button> <button class="btn ghost call-x" type="button" aria-label="dismiss">dismiss</button></div>`;
  c.querySelector('.call-go').addEventListener('click', () => { setSeen(ts); c.remove(); go(room); });
  c.querySelector('.call-x').addEventListener('click', () => { setSeen(ts); c.remove(); });
  shell().prepend(c);
  while (box.children.length > 3) box.lastElementChild.remove();
}

/** Call once the page knows who is signed in. goToRoom(roomId) opens a room in HQ. */
export async function startCalls(member, goToRoom) {
  if (!member || me) return; me = member; go = goToRoom;
  try {
    const seen = getSeen();
    const r = await fetch(`/api/me/mentions?limit=30${seen ? `&since=${encodeURIComponent(seen)}` : ''}`, { credentials: 'same-origin', headers: { 'X-Commons': '1' } });
    if (!r.ok) return;
    const { mentions = [] } = await r.json();
    if (!seen) { if (mentions[0]) setSeen(mentions[0].ts); return; } // first visit on this device: start fresh, no flood of old calls
    if (!mentions.length) return;
    const m = mentions[0];
    card({ id: 'away', room: m.room, roomName: m.room_name, from: m.from, text: m.text, ts: m.ts, count: mentions.length });
  } catch { /* offline: live calls still work */ }
}

/** Feed every live message here; openRoomId is the room the member has open (no card for that one). */
export function liveMessage(msg, roomName, openRoomId) {
  if (!me || !msg || msg.type !== 'message' || msg.author === me.id) return;
  if (!mentionsMe(msg.text, msg.kind, me.name)) return;
  if (msg.room === openRoomId) { setSeen(msg.ts); return; }
  card({ id: msg.id, room: msg.room, roomName: roomName || msg.room, from: msg.name, text: msg.text, ts: msg.ts });
  chime();
}
