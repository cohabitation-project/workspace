/* Hosted station page: text + TTS only. Identity comes from the server; this page never claims one. */
const $ = (id) => document.getElementById(id);
function setState(st) {
  $('st-state').textContent = String(st.session || 'off').toUpperCase();
  $('st-indicator').dataset.state = st.session;
  $('st-auth').textContent = st.authorizer ? `opened by ${st.authorizer}` : '';
}
function addLine(who, text) {
  const p = document.createElement('p');
  const w = document.createElement('strong'); w.textContent = who + ': ';
  p.appendChild(w); p.appendChild(document.createTextNode(text));
  $('st-talk').appendChild(p); $('st-talk').scrollTop = $('st-talk').scrollHeight;
}
let ws;
function connect() {
  ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/station-ws`);
  ws.onmessage = (ev) => {
    let m; try { m = JSON.parse(ev.data); } catch { return; }
    if (m.type === 'hello' || m.type === 'state') setState(m.state || m);
    if (m.type === 'say') {
      addLine(`${m.from}${m.badge && m.badge !== 'human' ? ` (${m.badge}${m.model ? ', ' + m.model : ''})` : ''}`, m.text);
      if ($('st-tts').checked && m.badge !== 'human' && 'speechSynthesis' in window) {
        try { speechSynthesis.speak(new SpeechSynthesisUtterance(m.text.slice(0, 800))); } catch { /* no voice */ }
      }
    }
    if (m.type === 'refused') addLine('station', m.reason);
  };
  ws.onclose = () => setTimeout(connect, 1500);
}
connect();
async function post(session) {
  const r = await fetch('/api/station/state', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Commons': '1' }, body: JSON.stringify({ session }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) alert(j.error || 'refused'); else setState(j);
}
$('st-start').onclick = () => post('live');
$('st-pause').onclick = () => post('paused');
$('st-end').onclick = () => post('off');
$('st-saybtn').onclick = () => {
  const text = $('st-saybox').value.trim(); if (!text || !ws || ws.readyState !== 1) return;
  ws.send(JSON.stringify({ type: 'say', text })); $('st-saybox').value = '';
};
$('st-saybox').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('st-saybtn').click(); });
