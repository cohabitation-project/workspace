/* Station page logic. Hard rules enforced here:
   - getUserMedia runs ONLY after the human presses Start with a name; tracks are stopped (not just hidden) on End.
   - The media stream is attached to the local <video> element and NOWHERE else: no recording, no frame grabs,
     no upload, no peer streaming. The test suite greps this file for the relevant APIs and fails if any appear.
     The agent socket is text only.
   - The indicator changes before anything else, so the state is visible first.
   - Devices: camera/mic/speaker selection (Aletheia's device-settings layer). The microphone defaults OFF and,
     when enabled, feeds a LOCAL level meter only (AudioContext analyser) — it is never recorded and never reaches
     the agent socket, which stays text-only. The speaker choice drives the test tone via setSinkId where the
     browser supports it; TTS may ignore it, and the page says so instead of promising otherwise. */
const $ = (id) => document.getElementById(id);
const indicator = $('indicator'), itext = $('indicator-text'), video = $('preview');
let stream = null, ws = null;
let micStream = null, micCtx = null, meterTimer = null;

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

// ---- device selection (camera / microphone / speaker) ----
const camSel = $('dev-cam'), micSel = $('dev-mic'), spkSel = $('dev-spk');
async function listDevices() {
  try {
    const devs = await navigator.mediaDevices.enumerateDevices();
    const fill = (sel, kind, label) => {
      const cur = sel.value;
      sel.innerHTML = '';
      devs.filter((d) => d.kind === kind).forEach((d, i) => {
        const o = document.createElement('option');
        o.value = d.deviceId; o.textContent = d.label || `${label} ${i + 1}`;
        sel.appendChild(o);
      });
      if (cur && [...sel.options].some((o) => o.value === cur)) sel.value = cur;
      if (!sel.options.length) { const o = document.createElement('option'); o.value = ''; o.textContent = `no ${label}`; sel.appendChild(o); }
    };
    fill(camSel, 'videoinput', 'camera');
    fill(micSel, 'audioinput', 'microphone');
    fill(spkSel, 'audiooutput', 'speaker');
  } catch (e) { /* enumeration unavailable; selects stay empty */ }
}
if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) navigator.mediaDevices.addEventListener('devicechange', listDevices);
listDevices();

async function openCamera() {
  const id = camSel.value;
  const next = await navigator.mediaDevices.getUserMedia({ video: id ? { deviceId: { exact: id } } : true, audio: false });
  if (stream) stream.getTracks().forEach((t) => t.stop());
  stream = next; video.srcObject = stream; // local preview only; the stream object is used nowhere else
  listDevices(); // labels become available after first permission
}
camSel.addEventListener('change', async () => {
  if (indicator.dataset.state !== 'live') return; // a non-live choice is picked up on the next Start
  try { await openCamera(); } catch (e) { alert('Could not switch camera: ' + e.message); }
});

// microphone: OFF by default; local meter only; never recorded, never sent anywhere
async function micStop() {
  if (meterTimer) { cancelAnimationFrame(meterTimer); meterTimer = null; }
  if (micCtx) { try { micCtx.close(); } catch { /* already closed */ } micCtx = null; }
  if (micStream) { micStream.getTracks().forEach((t) => t.stop()); micStream = null; }
  $('mic-meter').value = 0;
}
$('mic-on').addEventListener('change', async (e) => {
  if (!e.target.checked) { await micStop(); return; }
  if (indicator.dataset.state !== 'live') { alert('Open the window (Start) before enabling the microphone.'); e.target.checked = false; return; }
  try {
    const id = micSel.value;
    micStream = await navigator.mediaDevices.getUserMedia({ audio: id ? { deviceId: { exact: id } } : true, video: false });
    micCtx = new AudioContext();
    const src = micCtx.createMediaStreamSource(micStream);
    const an = micCtx.createAnalyser(); an.fftSize = 512;
    src.connect(an); // connected to the analyser ONLY — not to any destination, recorder or socket
    const data = new Uint8Array(an.frequencyBinCount);
    const tick = () => { an.getByteTimeDomainData(data); let peak = 0; for (const v of data) peak = Math.max(peak, Math.abs(v - 128) / 128); $('mic-meter').value = peak; meterTimer = requestAnimationFrame(tick); };
    tick();
    listDevices();
  } catch (err) { alert('Microphone unavailable: ' + err.message); e.target.checked = false; await micStop(); }
});
micSel.addEventListener('change', async () => { if ($('mic-on').checked) { await micStop(); $('mic-on').checked = false; } });

// speaker: the test tone respects the selection where setSinkId exists; TTS may not, and the page says so
$('spk-test').addEventListener('click', async () => {
  const ctx = new AudioContext();
  const dest = ctx.createMediaStreamDestination();
  const osc = ctx.createOscillator(); const g = ctx.createGain();
  osc.frequency.value = 523.25; g.gain.value = 0.15;
  osc.connect(g); g.connect(dest); osc.start(); osc.stop(ctx.currentTime + 0.5);
  const a = new Audio(); a.srcObject = dest.stream;
  if (a.setSinkId && spkSel.value) { try { await a.setSinkId(spkSel.value); } catch { $('spk-note').textContent = 'This browser refused the speaker choice; using the default output.'; } }
  a.play().catch(() => {});
  setTimeout(() => { a.pause(); ctx.close(); }, 800);
});

// ---- session controls ----
// Failure-safe rule (Aletheia's review, finding 2): the indicator always reflects ACTUAL device state.
// Devices are changed first; the server is told second. If the server call fails, the indicator still shows
// the device truth and a visible warning says the server record disagrees — capture is never left running
// under a CLOSED or PAUSED label, and a refused Start shuts the camera again.
function serverWarn(on) { itext.textContent += on ? '  ⚠ server record out of sync — see logs' : ''; }
function stopAllCapture() {
  if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; video.srcObject = null; }
  return micStop().then(() => { $('mic-on').checked = false; });
}
$('start').onclick = async () => {
  if (!$('authorizer').value.trim()) { alert('Put your name in first — a human opens the window.'); return; }
  try {
    if (!stream) await openCamera(); // the selected camera; local preview only
    else stream.getTracks().forEach((t) => { t.enabled = true; });
  } catch (e) { alert('Camera not available or permission refused: ' + e.message); return; }
  const ok = await setServerState('live').catch(() => false);
  if (ok) setIndicator('live');
  else { await stopAllCapture(); setIndicator('off'); } // refused session = no capture stays on
};
$('pause').onclick = async () => {
  // Pause pauses ALL capture (review finding 1): camera tracks disabled, microphone fully stopped.
  if (stream) stream.getTracks().forEach((t) => { t.enabled = false; });
  await micStop(); $('mic-on').checked = false; // resuming leaves the mic off; the human re-enables deliberately
  setIndicator('paused'); // device truth first
  const ok = await setServerState('paused').catch(() => false);
  if (!ok) serverWarn(true);
};
$('end').onclick = async () => {
  await stopAllCapture();
  setIndicator('off'); // device truth first
  const ok = await setServerState('off').catch(() => false);
  if (!ok) serverWarn(true);
};

// ---- conversation ----
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
