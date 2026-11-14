// Cohabi Mail (2026-11-13). Everything from a message is put on the page as text (textContent), never as HTML.
const $ = (s) => document.querySelector(s);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
async function api(url, body) {
  const r = await fetch(url, { method: body ? 'POST' : 'GET', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Commons': '1' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw Error(j.error || `That did not work (error ${r.status}).`); return j;
}
const when = (iso) => { const d = new Date(iso); const today = new Date(); return d.toDateString() === today.toDateString() ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : d.toLocaleDateString([], { month: 'short', day: 'numeric' }); };
let folder = 'inbox', current = null;

async function start() {
  let st; try { st = await api('/api/mail/status'); } catch (e) { $('#cm-addr').textContent = e.message; return; }
  if (!st.eligible) { $('#cm-addr').textContent = `Cohabi mail is for Commons and cooperative members.`; return; }
  if (!st.address) return setup(st);
  $('#cm-addr').textContent = st.address; $('#cm-app').hidden = false; $('#cm-setup').hidden = true;
  await loadFolders(); await loadList();
}
function setup(st) {
  $('#cm-addr').textContent = 'You don’t have a Cohabi mailbox yet.';
  const box = $('#cm-setup'); box.hidden = false; box.replaceChildren();
  const make = el('div', 'cm-card'); make.append(el('h2', null, 'Get your address'), el('p', null, `Your address will be ${st.suggested}. It belongs to you for as long as you're a member.`));
  const b = el('button', 'btn', `Create ${st.suggested}`); b.type = 'button';
  const note = el('p', 'cm-note'); b.onclick = async () => { b.disabled = true; note.textContent = 'Creating your mailbox…'; try { await api('/api/mail/activate', {}); start(); } catch (e) { note.textContent = e.message; b.disabled = false; } };
  make.append(b, note);
  const link = el('form', 'cm-card'); link.append(el('h2', null, 'Already have a @' + st.domain + ' mailbox?'), el('p', null, 'Connect it with its address and password. The password is kept encrypted and used only to open your own mailbox.'));
  const a = el('input'); a.name = 'address'; a.placeholder = 'you@' + st.domain; a.autocomplete = 'username';
  const p = el('input'); p.name = 'password'; p.type = 'password'; p.placeholder = 'Mailbox password'; p.autocomplete = 'current-password';
  const go = el('button', 'btn ghost', 'Connect'); const n2 = el('p', 'cm-note');
  link.append(a, p, go, n2); link.onsubmit = async (ev) => { ev.preventDefault(); go.disabled = true; n2.textContent = 'Checking…'; try { await api('/api/mail/link', { address: a.value, password: p.value }); p.value = ''; start(); } catch (e) { n2.textContent = e.message; go.disabled = false; } };
  box.append(make, link);
}
async function loadFolders() {
  const { folders } = await api('/api/mail/folders'); const nav = $('#cm-folders'); nav.replaceChildren();
  const order = ['inbox', 'drafts', 'sent', 'archive', 'junk', 'trash'];
  folders.sort((x, y) => ((order.indexOf(x.role) + 1 || 99) - (order.indexOf(y.role) + 1 || 99)));
  for (const f of folders) { const b = el('button', 'cm-folder' + ((f.role || f.id) === folder || f.id === folder ? ' on' : ''), f.name); b.type = 'button'; if (f.unread) b.append(el('span', 'cm-n', String(f.unread))); b.onclick = () => { folder = f.id; for (const x of nav.children) x.classList.remove('on'); b.classList.add('on'); loadList(); }; nav.append(b); }
}
async function loadList(q = '') {
  const ul = $('#cm-list'); $('#cm-read').hidden = true; ul.hidden = false; ul.replaceChildren(el('li', 'cm-empty', 'Loading…'));
  try {
    const r = await api(`/api/mail/list?folder=${encodeURIComponent(folder)}&q=${encodeURIComponent(q)}`); ul.replaceChildren();
    if (!r.messages.length) ul.append(el('li', 'cm-empty', q ? 'Nothing matches.' : 'Nothing here yet.'));
    for (const m of r.messages) {
      const li = el('li', 'cm-row' + (m.unread ? ' unread' : '')); const btn = el('button'); btn.type = 'button';
      btn.append(el('span', 'cm-from', m.from || '—'), el('span', 'cm-subj', m.subject), el('span', 'cm-prev', m.preview), el('time', 'cm-when', when(m.at)));
      btn.onclick = () => openMsg(m.id); li.append(btn); ul.append(li);
    }
  } catch (e) { ul.replaceChildren(el('li', 'cm-empty', e.message)); }
}
async function openMsg(id) {
  const art = $('#cm-read'); art.hidden = false; $('#cm-list').hidden = true; art.replaceChildren(el('p', 'cm-empty', 'Opening…'));
  try {
    const m = await api('/api/mail/msg/' + encodeURIComponent(id)); current = m; art.replaceChildren();
    const back = el('button', 'btn small ghost', '← Back'); back.type = 'button'; back.onclick = () => { art.hidden = true; $('#cm-list').hidden = false; loadFolders(); };
    const reply = el('button', 'btn small', '↩ Reply'); reply.type = 'button'; reply.onclick = () => compose({ to: m.replyTo.replace(/^.*<([^>]+)>$/, '$1'), subject: /^re:/i.test(m.subject) ? m.subject : 'Re: ' + m.subject, inReplyTo: m.messageId, quote: m });
    const head = el('header', 'cm-msghead'); head.append(el('h2', null, m.subject), el('p', 'cm-meta', `From ${m.from}`), el('p', 'cm-meta', `To ${m.to}${m.cc ? ' · Cc ' + m.cc : ''} · ${new Date(m.at).toLocaleString()}`));
    const body = el('pre', 'cm-body', m.text || '(no text)');
    art.append(el('div', 'cm-actions'), head, body); art.firstChild.append(back, reply);
    if (m.attachments.length) art.append(el('p', 'cm-meta', 'Attachments (opening them here is coming): ' + m.attachments.map((a) => a.name).join(', ')));
  } catch (e) { art.replaceChildren(el('p', 'cm-empty', e.message)); }
}
function compose({ to = '', subject = '', inReplyTo = '', quote = null } = {}) {
  const f = $('#cm-write'); f.hidden = false; f.to.value = to; f.cc.value = ''; f.subject.value = subject; f.inReplyTo.value = inReplyTo || '';
  f.text.value = quote ? `\n\nOn ${new Date(quote.at).toLocaleString()}, ${quote.from} wrote:\n` + quote.text.split('\n').map((l) => '> ' + l).join('\n') : '';
  $('#cm-write-title').textContent = quote ? 'Reply' : 'New message'; $('#cm-write-note').textContent = ''; (to ? f.text : f.to).focus();
}
$('#cm-compose').onclick = () => compose();
$('#cm-write-x').onclick = () => { $('#cm-write').hidden = true; };
$('#cm-write').onsubmit = async (ev) => {
  ev.preventDefault(); const f = ev.target; const note = $('#cm-write-note'); const btn = f.querySelector('button[type=submit]'); btn.disabled = true; note.textContent = 'Sending…';
  try { await api('/api/mail/send', { to: f.to.value, cc: f.cc.value, subject: f.subject.value, text: f.text.value, inReplyTo: f.inReplyTo.value || null }); note.textContent = 'Sent.'; setTimeout(() => { f.hidden = true; btn.disabled = false; }, 800); }
  catch (e) { note.textContent = e.message; btn.disabled = false; }
};
$('#cm-search').onsubmit = (ev) => { ev.preventDefault(); loadList($('#cm-q').value.trim()); };
start();
