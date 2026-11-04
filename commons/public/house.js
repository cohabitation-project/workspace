// house.js — a member's house: journal (with voice typing), own shelf, meetups (real RSVPs), job board, team, drawer.
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const api = async (url, opts = {}) => {
  const res = await fetch(url, { credentials: 'same-origin', ...opts, headers: { 'Content-Type': 'application/json', 'X-Commons': '1', ...(opts.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
};
let H = null;

// ---- objects open their panel (one at a time); the choice is remembered for this browser only
const panels = ['journal', 'shelf', 'meetups', 'jobs', 'team', 'wallet'];
function open(name) {
  for (const p of panels) $(`#panel-${p}`).hidden = p !== name;
  document.querySelectorAll('.obj').forEach((b) => b.setAttribute('aria-pressed', b.dataset.panel === name ? 'true' : 'false'));
  try { localStorage.setItem('house-panel', name); } catch { /* storage may be off */ }
}
document.querySelectorAll('.obj').forEach((b) => b.addEventListener('click', () => { open(b.dataset.panel); $(`#panel-${b.dataset.panel}`).scrollIntoView({ behavior: 'smooth', block: 'start' }); }));

// ---- journal
function renderJournals() {
  $('#j-list').innerHTML = H.journals.length ? H.journals.map((j) => `<li data-id="${esc(j.id)}">
    <div class="muted small">${esc(new Date(j.ts).toLocaleString())} · ${j.shared ? `<strong>shared</strong> · <a href="/j/${esc(j.id)}">view</a>` : 'private'}</div>
    <p>${esc(j.text).replace(/\n/g, '<br>')}</p>
    <div class="copyrow"><button class="btn small ghost" data-act="share">${j.shared ? 'Take it back (make private)' : 'Share to the Library'}</button><button class="btn small ghost" data-act="delete">Delete</button></div></li>`).join('') : '<li class="muted">No entries yet.</li>';
}
$('#j-share').addEventListener('change', () => { $('#j-save').textContent = $('#j-share').checked ? 'Save and share' : 'Save (private)'; });
$('#j-save').addEventListener('click', async () => {
  const text = $('#j-text').value.trim(); const msg = $('#j-msg'); msg.classList.remove('err');
  if (!text) { msg.textContent = 'Write or speak something first.'; msg.classList.add('err'); return; }
  try {
    const j = await api('/api/journal', { method: 'POST', body: JSON.stringify({ text, shared: $('#j-share').checked }) });
    H.journals.unshift(j); renderJournals(); $('#j-text').value = ''; $('#j-share').checked = false; $('#j-save').textContent = 'Save (private)';
    msg.textContent = j.shared ? 'Saved and shared to the Library.' : 'Saved. Only you can see it.';
    try { localStorage.removeItem('house-draft'); } catch { /* ignore */ }
  } catch (e) { msg.textContent = e.message; msg.classList.add('err'); }
});
$('#j-list').addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-act]'); if (!b) return;
  const id = b.closest('li').dataset.id; const j = H.journals.find((x) => x.id === id);
  try {
    if (b.dataset.act === 'share') { const r = await api(`/api/journal/${id}/share`, { method: 'POST', body: JSON.stringify({ shared: !j.shared }) }); j.shared = r.shared; }
    else { if (b.dataset.confirm !== '1') { b.dataset.confirm = '1'; b.textContent = 'Tap again to delete for good'; return; } await api(`/api/journal/${id}`, { method: 'DELETE' }); H.journals = H.journals.filter((x) => x.id !== id); }
    renderJournals();
  } catch (err) { $('#j-msg').textContent = err.message; $('#j-msg').classList.add('err'); }
});
// an unsent draft survives a reload (this browser only)
try { const d = localStorage.getItem('house-draft'); if (d) $('#j-text').value = d; } catch { /* ignore */ }
$('#j-text').addEventListener('input', () => { try { localStorage.setItem('house-draft', $('#j-text').value); } catch { /* ignore */ } });

// ---- voice typing: the browser's speech recognition; text lands in the box to review before saving
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null; let base = '';
if (!SR) { $('#j-mic').disabled = true; $('#j-mic').title = 'This browser has no voice typing (try Safari or Chrome), or use your keyboard\'s microphone key.'; }
$('#j-mic').addEventListener('click', () => {
  if (!SR) return;
  if (rec) { rec.stop(); return; }
  rec = new SR(); rec.lang = navigator.language || 'en-US'; rec.interimResults = true; rec.continuous = true;
  base = $('#j-text').value ? $('#j-text').value.replace(/\s*$/, ' ') : '';
  rec.onresult = (ev) => {
    let fin = ''; let interim = '';
    for (let i = 0; i < ev.results.length; i++) { const t = ev.results[i][0].transcript; if (ev.results[i].isFinal) fin += t; else interim += t; }
    $('#j-text').value = (base + fin + interim).replace(/\s+/g, ' ').trimStart();
  };
  rec.onerror = (ev) => { $('#j-msg').textContent = ev.error === 'not-allowed' ? 'Microphone permission was refused.' : `Voice typing stopped (${ev.error}).`; };
  rec.onend = () => { rec = null; $('#j-mic').classList.remove('on'); $('#j-mic').textContent = '🎙 Speak'; try { localStorage.setItem('house-draft', $('#j-text').value); } catch { /* ignore */ } };
  rec.start(); $('#j-mic').classList.add('on'); $('#j-mic').textContent = '■ Stop';
});

// ---- shelf, meetups, jobs, drawer
function renderShelf() {
  $('#shelf-list').innerHTML = H.shelf.length ? H.shelf.map((e) => `<li><a href="${esc(e.url)}">${esc(e.title)}</a> <span class="muted small">${esc(String(e.ts || '').slice(0, 10))}</span></li>`).join('') : '<li class="muted">Nothing on your shelf yet. Add a reference in the <a href="/library">Library</a>, or share a journal entry.</li>';
}
function renderMeetups() {
  const me = H.me.id;
  $('#meet-list').innerHTML = H.meetups.length ? H.meetups.map((m) => {
    const going = m.attending.some((a) => a.id === me);
    const who = m.attending.length ? m.attending.map((a) => `${esc(a.name)} <span class="muted">(${esc(a.badge)})</span>`).join(', ') : '<span class="muted">nobody has said yet</span>';
    const team = m.team.length ? m.team.map((t) => `${esc(t.name)} <span class="muted">(${esc(t.tier)})</span>`).join(', ') : '<span class="muted">no team members</span>';
    return `<li data-room="${esc(m.room)}" data-at="${esc(m.at)}"><strong>${esc(m.room_name)}</strong> · ${esc(new Date(m.at).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' }))}
      <div class="small">Attending: ${who}</div><div class="small">Team: ${team}</div>
      <button class="btn small ${going ? 'ghost' : ''}" data-going="${going ? '0' : '1'}">${going ? 'Not going after all' : "I'll be there"}</button></li>`;
  }).join('') : '<li class="muted">No team sessions in the next three days.</li>';
}
$('#meet-list').addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-going]'); if (!b) return;
  const li = b.closest('li');
  try {
    const r = await api('/api/rsvp', { method: 'POST', body: JSON.stringify({ room: li.dataset.room, at: li.dataset.at, going: b.dataset.going === '1' }) });
    const m = H.meetups.find((x) => x.room === r.room && x.at === r.at); if (m) m.attending = r.attending; renderMeetups();
  } catch (err) { b.textContent = err.message; }
});
function renderJobs() {
  $('#job-list').innerHTML = H.jobs.length ? H.jobs.map((t) => `<li><a href="/desk#${esc(t.id)}">${esc(t.title)}</a> <span class="muted small">in ${esc(t.room)}</span>${t.deliverable ? `<div class="small">${esc(t.deliverable)}</div>` : ''}</li>`).join('') : '<li class="muted">No open tasks right now.</li>';
}

(async () => {
  try {
    H = await api('/api/house');
    $('#j-voice-note').textContent = H.voice_note; $('#wallet-note').textContent = H.wallet.note;
    renderJournals(); renderShelf(); renderMeetups(); renderJobs();
    let last = 'journal'; try { last = localStorage.getItem('house-panel') || 'journal'; } catch { /* ignore */ }
    open(panels.includes(last) ? last : 'journal');
  } catch (e) { document.querySelector('.lede').textContent = `Couldn't open your house: ${e.message}`; }
})();
