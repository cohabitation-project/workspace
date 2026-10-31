/* Hosted station page: text + TTS only. Identity comes from the server; this page never claims one. */
const $ = (id) => document.getElementById(id);
function setState(st) {
  if (!$('st-state')) return; // ungranted join screen has no window UI
  $('st-state').textContent = String(st.session || 'off').toUpperCase();
  $('st-indicator').dataset.state = st.session;
  $('st-auth').textContent = st.authorizer ? `opened by ${st.authorizer}` : '';
  if ($('st-present')) $('st-present').textContent = (st.present || []).map((p) => `${p.name} (${p.badge})`).join(', ') || 'nobody connected';
}
function addLine(who, text) {
  const p = document.createElement('p');
  const w = document.createElement('strong'); w.textContent = who + ': ';
  p.appendChild(w); p.appendChild(document.createTextNode(text));
  $('st-talk').appendChild(p); $('st-talk').scrollTop = $('st-talk').scrollHeight;
}
/* guest list (invitation-only): grant/revoke are explicit, logged acts */
async function setGrant(body) {
  const r = await fetch('/api/station/grants', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Commons': '1' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) alert(j.error || 'refused'); else location.reload();
}
if ($('st-grant-add')) $('st-grant-add').onclick = () => { const id = $('st-grant-pick').value; if (id) setGrant({ member_id: id, on: true }); };
for (const b of document.querySelectorAll('.st-revoke')) b.onclick = () => setGrant({ member_id: b.dataset.id, on: false });

let ws;
function connect() {
  if (!$('st-talk')) return; // join screen: no socket
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
if ($('st-start')) {
  $('st-start').onclick = () => post('live');
  $('st-pause').onclick = () => post('paused');
  $('st-end').onclick = () => post('off');
  $('st-saybtn').onclick = () => {
    const text = $('st-saybox').value.trim(); if (!text || !ws || ws.readyState !== 1) return;
    ws.send(JSON.stringify({ type: 'say', text })); $('st-saybox').value = '';
  };
  $('st-saybox').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('st-saybtn').click(); });

  /* voice input: browser speech recognition. Audio stays in this browser; only TEXT is sent to the room. */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { $('st-voice').disabled = true; $('st-voice').title = 'This browser has no speech recognition — Chrome and Edge do.'; }
  else {
    let rec = null; let on = false;
    const stop = () => { on = false; $('st-voice').textContent = '🎤 Talk'; try { rec && rec.stop(); } catch { /* idle */ } };
    $('st-voice').onclick = () => {
      if (on) return stop();
      rec = new SR(); rec.lang = navigator.language || 'en-US'; rec.continuous = true; rec.interimResults = true;
      on = true; $('st-voice').textContent = '● listening… (click to stop)';
      rec.onresult = (ev) => {
        let finals = '';
        for (let i = ev.resultIndex; i < ev.results.length; i++) if (ev.results[i].isFinal) finals += ev.results[i][0].transcript;
        if (finals.trim() && ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'say', text: finals.trim() }));
      };
      rec.onerror = () => stop();
      rec.onend = () => { if (on) { try { rec.start(); } catch { stop(); } } }; // keep listening until clicked off
      try { rec.start(); } catch { stop(); }
    };
  }
}
