/* Station page logic. Hard rules enforced here:
   - getUserMedia runs ONLY after the human presses Start with a name; tracks are stopped (not just hidden) on End.
   - The media stream is attached to the local <video> element and NOWHERE else: no recording, no frame grabs,
     no upload, no peer streaming. The test suite greps this file for the relevant APIs and fails if any appear.
     The agent socket is text only.
   - The indicator changes before anything else, so the state is visible first. */
const $ = (id) => document.getElementById(id);
const indicator = $('indicator'), itext = $('indicator-text'), video = $('preview');
let stream = null, ws = null;

function setIndicator(state) {
  indicator.className = state === 'live' ? 'live' : state === 'paused' ? 'paused' : '';
  indicator.dataset.state = state;
  itext.textContent = state === 'live' ? 'WINDOW OPEN — camera is LIVE on this page (and only this page)'
    : state === 'paused' ? 'PAUSED — camera tracks disabled; press Start to resume or End to close'
    : 'WINDOW CLOSED — camera and microphone are off';
  $('start').disabled = state === 'live';
  $('pause').disabled = state !== 'live';
  $('end').disabled = state === 'off';
}

async function setServerState(session) {
  const authorizer = $('authorizer').value.trim();
  const r = await fetch('/api/state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session, authorizer }) });
  if (!r.ok) { const e = await r.json().catch(() => ({})); alert(e.error || 'refused'); return false; }
  return true;
}

$('start').onclick = async () => {
  if (!$('authorizer').value.trim()) { alert('Put your name in first — a human opens the window.'); return; }
  try {
    if (!stream) {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      video.srcObject = stream; // local preview only; the stream object is used nowhere else
    } else stream.getTracks().forEach((t) => { t.enabled = true; });
    if (await setServerState('live')) setIndicator('live');
  } catch (e) { alert('Camera not available or permission refused: ' + e.message); }
};
$('pause').onclick = async () => {
  if (stream) stream.getTracks().forEach((t) => { t.enabled = false; });
  if (await setServerState('paused')) setIndicator('paused');
};
$('end').onclick = async () => {
  if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; video.srcObject = null; }
  if (await setServerState('off')) setIndicator('off');
};

// conversation
function addLine(who, text, cls) {
  const p = document.createElement('p');
  const w = document.createElement('span'); w.className = 'who'; w.textContent = who + ': ';
  p.appendChild(w); p.appendChild(document.createTextNode(text));
  if (cls) p.classList.add(cls);
  $('talk').appendChild(p); $('talk').scrollTop = $('talk').scrollHeight;
}
function speak(text) {
  if (!$('tts').checked || !('speechSynthesis' in window)) return;
  try { speechSynthesis.speak(new SpeechSynthesisUtterance(text.slice(0, 1000))); } catch { /* local TTS unavailable */ }
}
function connect() {
  ws = new WebSocket(`ws://${location.host}/agent`);
  ws.onmessage = (ev) => {
    let m; try { m = JSON.parse(ev.data); } catch { return; }
    if (m.type === 'say') { addLine(`${m.from}${m.model ? ' (' + m.model + ')' : ''}`, m.text); speak(m.text); }
    if (m.type === 'human_say') addLine(m.from, m.text);
    if (m.type === 'state') setIndicator(m.session);
  };
  ws.onclose = () => setTimeout(connect, 1500);
}
connect();
$('saybtn').onclick = async () => {
  const text = $('saybox').value.trim(); if (!text) return;
  const r = await fetch('/api/human-say', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
  if (r.ok) $('saybox').value = ''; else alert('The window must be open (Start) to talk to agents.');
};
$('saybox').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('saybtn').click(); });
setIndicator('off');
