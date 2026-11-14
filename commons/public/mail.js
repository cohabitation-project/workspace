// Cobox (2026-11-13). Everything from a message goes on the page as text (textContent), never as HTML.
const $ = (s) => document.querySelector(s);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
async function api(url, body) {
  const r = await fetch(url, { method: body ? 'POST' : 'GET', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Commons': '1' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw Error(j.error || `That did not work (error ${r.status}).`); return j;
}
const when = (iso) => { const d = new Date(iso); return d.toDateString() === new Date().toDateString() ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : d.toLocaleDateString([], { month: 'short', day: 'numeric' }); };
let folder = 'inbox', tab = 'all', messages = [], current = null, myAddress = '';
let listRequest = 0, messageRequest = 0;
const whoCache = new Map();
const contacts = new Map(); // address -> name: people this mailbox writes to or hears from (Geoffrey, 2026-11-13: the rail is mail only)
// Place real mail search in Cohabi's existing header rather than drawing a duplicate white top bar.
function mountCoboxHeader() {
  const header = document.querySelector('.fx-top');
  const actions = header?.querySelector('.fx-topr');
  const tagline = $('#cm-tagline');
  const search = $('#cm-search');
  if (!header || !actions || !tagline || !search) return;
  header.insertBefore(tagline, actions);
  header.insertBefore(search, actions);
}
mountCoboxHeader();
async function whois(address) { if (!address) return null; if (!whoCache.has(address)) whoCache.set(address, api('/api/mail/whois?address=' + encodeURIComponent(address)).then((r) => r.member).catch(() => null)); return whoCache.get(address); }
// Mail categories are based only on actual message attributes, never guessed from an email subject.
function avatar(name, face) {
  const a = el('span', 'cbx-av'); if (face && typeof face === 'string' && face.startsWith('/') && !face.startsWith('//')) { const i = el('img'); i.src = face; i.alt = ''; i.loading = 'lazy'; a.append(i); } else a.textContent = (name || '?').trim().charAt(0).toUpperCase();
  return a;
}

async function start() {
  let st; try { st = await api('/api/mail/status'); } catch (e) { $('#cm-addr').textContent = e.message; return; }
  if (!st.eligible) { $('#cm-addr').textContent = 'Cobox is for Commons and cooperative members.'; return; }
  if (!st.address) return setup(st);
  myAddress = String(st.address).toLowerCase(); $('#cm-addr').textContent = st.address; $('#cm-app').hidden = false; $('#cm-setup').hidden = true;
  loadQuote(); await loadFolders(); await loadList(); loadSentContacts();
}
function setup(st) {
  $('#cm-addr').textContent = 'You don’t have a Cobox address yet.';
  const box = $('#cm-setup'); box.hidden = false; box.replaceChildren();
  const make = el('div', 'cbx-card'); make.append(el('h2', null, 'Get your address'), el('p', null, `Your address will be ${st.suggested}. It's yours for as long as you're a member.`));
  const b = el('button', 'btn', `Create ${st.suggested}`); b.type = 'button';
  const note = el('p', 'cm-note'); b.onclick = async () => { b.disabled = true; note.textContent = 'Creating your mailbox…'; try { await api('/api/mail/activate', {}); start(); } catch (e) { note.textContent = e.message; b.disabled = false; } };
  make.append(b, note);
  const link = el('form', 'cbx-card'); link.append(el('h2', null, 'Already have a @' + st.domain + ' mailbox?'), el('p', null, 'Connect it with its address and password. The password is kept encrypted and used only to open your own mailbox.'));
  const a = el('input'); a.name = 'address'; a.placeholder = 'you@' + st.domain; a.autocomplete = 'username';
  const p = el('input'); p.name = 'password'; p.type = 'password'; p.placeholder = 'Mailbox password'; p.autocomplete = 'current-password';
  const go = el('button', 'btn ghost', 'Connect'); const n2 = el('p', 'cm-note');
  link.append(a, p, go, n2); link.onsubmit = async (ev) => { ev.preventDefault(); go.disabled = true; n2.textContent = 'Checking…'; try { await api('/api/mail/link', { address: a.value, password: p.value }); p.value = ''; start(); } catch (e) { n2.textContent = e.message; go.disabled = false; } };
  box.append(make, link);
}
async function loadFolders() {
  const { folders = [] } = await api('/api/mail/folders'); const nav = $('#cm-folders'); nav.replaceChildren();
  const order = ['inbox', 'drafts', 'sent', 'archive', 'junk', 'trash'];
  folders.sort((x, y) => ((order.indexOf(x.role) + 1 || 99) - (order.indexOf(y.role) + 1 || 99)));
  for (const f of folders) {
    const b = el('button', 'cbx-folder' + (f.role === folder || f.id === folder ? ' on' : '')); b.type = 'button';
    b.append(el('span', null, f.name)); if (f.unread) b.append(el('span', 'cbx-n', String(f.unread)));
    b.onclick = () => { folder = f.id; for (const x of nav.children) x.classList.remove('on'); b.classList.add('on'); loadList(); };
    nav.append(b);
  }
}
async function loadList(q = '') {
  const request = ++listRequest; const ul = $('#cm-list'); ul.replaceChildren(el('li', 'cbx-empty', 'Loading…'));
  try { const r = await api(`/api/mail/list?folder=${encodeURIComponent(folder)}&q=${encodeURIComponent(q)}`); if (request !== listRequest) return; messages = Array.isArray(r.messages) ? r.messages : []; noteContacts(messages); current = null; ++messageRequest; document.body.classList.remove('cbx-reading'); $('#cm-read').replaceChildren(el('p', 'cbx-empty', 'Choose a message to read it.')); $('#cm-person').hidden = true; $('#cm-info').hidden = true; renderTabs(); renderList(); }
  catch (e) { if (request === listRequest) ul.replaceChildren(el('li', 'cbx-empty', e.message)); }
}
function renderTabs() {
  const counts = { all: messages.length, unread: messages.filter(m => m.unread).length, starred: messages.filter(m => m.starred).length };
  for (const b of document.querySelectorAll('#cm-tabs button')) {
    const count = b.querySelector('b');
    if (count) count.textContent = counts[b.dataset.tab] ?? 0;
    b.classList.toggle('on', b.dataset.tab === tab);
    b.setAttribute('aria-pressed', String(b.dataset.tab === tab));
  }
}
function renderList() {
  const ul = $('#cm-list'); ul.replaceChildren();
  const shown = messages.filter((m) => tab === 'all' || (tab === 'unread' && m.unread) || (tab === 'starred' && m.starred));
  if (!shown.length) ul.append(el('li', 'cbx-empty', tab === 'all' ? 'Nothing here yet.' : 'Nothing in this tab yet.'));
  for (const m of shown) {
    const li = el('li', 'cbx-row' + (m.unread ? ' unread' : '') + (current?.id === m.id ? ' on' : '')); const btn = el('button'); btn.type = 'button';
    const sender = String(m.from || m.fromAddress || 'Unknown'); const av = avatar(sender.replace(/<.*>/, '').trim()); whois(m.fromAddress).then((w) => { if (w) { av.replaceWith(avatar(w.name, w.face)); } });
    const top = el('span', 'cbx-top'); top.append(el('strong', 'cbx-from', sender.replace(/\s*<.*>$/, '') || m.fromAddress || '—'), el('time', 'cbx-when', when(m.at)));
    const sub = el('span', 'cbx-subj', m.subject);
    const prev = el('span', 'cbx-prev', m.preview);
    const marks = el('span', 'cbx-marks'); if (m.attachment) marks.append(el('span', null, '📎')); if (m.starred) marks.append(el('span', 'cbx-starred', '★')); if (m.unread) marks.append(el('span', 'cbx-dot'));
    const text = el('span', 'cbx-rowtext'); text.append(top, sub, prev);
    btn.append(av, text, marks); btn.onclick = () => openMsg(m.id); li.append(btn); ul.append(li);
  }
}
async function openMsg(id) {
  const request = ++messageRequest; const art = $('#cm-read'); document.body.classList.add('cbx-reading'); art.replaceChildren(el('p', 'cbx-empty', 'Opening…'));
  try {
    const m = await api('/api/mail/msg/' + encodeURIComponent(id)); if (request !== messageRequest) return; current = m;
    const row = messages.find((x) => x.id === id); if (row) row.unread = false; renderTabs(); renderList();
    art.replaceChildren();
    const tools = el('div', 'cbx-tools');
    const btn = (label, title, fn) => { const b = el('button', 'cbx-tool', label); b.type = 'button'; b.title = title; b.setAttribute('aria-label', title); b.onclick = fn; tools.append(b); return b; };
    btn('←', 'Back to the list', () => document.body.classList.remove('cbx-reading'));
    btn('🗄', 'Archive', () => doAct('archive'));
    btn('🗑', 'Move to Trash', () => doAct('trash'));
    btn('✉', 'Mark unread', () => doAct('unread'));
    const head = el('header', 'cbx-msghead'); const h = el('h2', null, m.subject);
    const star = el('button', 'cbx-star' + (m.starred ? ' on' : ''), m.starred ? '★' : '☆'); star.type = 'button'; star.title = 'Star'; star.onclick = async () => { star.disabled = true; const ok = await doAct(m.starred ? 'unstar' : 'star', true); star.disabled = false; if (!ok) return; m.starred = !m.starred; const row = messages.find(x => x.id === m.id); if (row) row.starred = m.starred; star.textContent = m.starred ? '★' : '☆'; star.classList.toggle('on', m.starred); renderTabs(); renderList(); };
    const tag = 'Email';
    h.append(' ', star); head.append(h, el('span', 'cbx-tag', tag));
    const who = el('div', 'cbx-who'); const av = avatar(m.fromName || m.from); who.append(av);
    const whoText = el('div'); whoText.append(el('strong', null, m.fromName || m.fromAddress), el('span', 'cbx-meta', ` <${m.fromAddress}>`), el('div', 'cbx-meta', `To ${m.to}${m.cc ? ' · Cc ' + m.cc : ''}`));
    who.append(whoText, el('time', 'cbx-meta', new Date(m.at).toLocaleString()));
    const body = el('pre', 'cbx-body', m.text || '(no text)');
    art.append(tools, head, who, body);
    if (Array.isArray(m.attachments) && m.attachments.length) art.append(el('p', 'cbx-meta', 'Attachments: ' + m.attachments.map((a) => a.name || 'Attachment').join(', ') + ' (opening them here is coming)'));
    const reply = el('form', 'cbx-reply'); const ta = el('textarea'); ta.placeholder = 'Write a reply…'; ta.rows = 3; const send = el('button', 'btn', 'Send'); const note = el('span', 'cm-note');
    reply.append(ta, el('div', 'cbx-replybar')); reply.lastChild.append(note, send);
    reply.onsubmit = async (ev) => { ev.preventDefault(); if (!ta.value.trim()) return; send.disabled = true; note.textContent = 'Sending…'; try { await api('/api/mail/send', { to: String(m.replyTo || m.fromAddress || '').replace(/^.*<([^>]+)>$/, '$1'), subject: /^re:/i.test(m.subject) ? m.subject : 'Re: ' + m.subject, text: ta.value + quoteOf(m), inReplyTo: m.messageId }); ta.value = ''; note.textContent = 'Sent.'; } catch (e) { note.textContent = e.message; } send.disabled = false; };
    art.append(reply);
    const quick = el('div', 'cbx-quick'); quick.append(el('h3', null, 'Quick actions'));
    const qa = (label, href) => { const a = el('a', 'cbx-qa', label); a.href = href; quick.append(a); };
    renderSide(m, quick, qa, request);
    art.append(quick);
  } catch (e) { if (request === messageRequest) art.replaceChildren(el('p', 'cbx-empty', e.message)); }
}
const quoteOf = (m) => `\n\nOn ${new Date(m.at).toLocaleString()}, ${m.from} wrote:\n` + String(m.text || '').split('\n').map((l) => '> ' + l).join('\n');
async function renderSide(m, quick, qa, request) {
  const card = $('#cm-person'), info = $('#cm-info'); card.hidden = false; info.hidden = false; card.replaceChildren(); info.replaceChildren();
  const w = await whois(m.fromAddress);
  if (request !== messageRequest) return;
  if (w) {
    const top = el('div', 'cbx-ptop'); const av = avatar(w.name, w.face); av.classList.add('big'); top.append(av);
    const t = el('div'); t.append(el('h3', null, w.name), el('p', 'cbx-online' + (w.online ? ' on' : ''), w.online ? 'Online' : 'Not online'));
    if (w.mood) t.append(el('p', 'cbx-meta', w.mood)); top.append(t); card.append(top);
    const acts = el('div', 'cbx-pacts'); const link = (label, href) => { const a = el('a', 'cbx-pact', label); a.href = href; acts.append(a); };
    link('💬 Message', '/messages?to=' + encodeURIComponent(w.id)); link('🎙 Live', '/live'); link('👤 Profile', w.profile || ('/m/' + encodeURIComponent(w.id))); card.append(acts);
    qa('🎙 Open Cohabi Live', '/live'); qa('👤 View profile', w.profile || ('/m/' + encodeURIComponent(w.id)));
  } else {
    card.append(el('h3', null, m.fromName || m.fromAddress), el('p', 'cbx-meta', m.fromAddress), el('p', 'cbx-meta', 'From outside Cohabi.'));
    qa('↩ Reply', '#'); quick.lastChild.onclick = (e) => { e.preventDefault(); document.querySelector('.cbx-reply textarea')?.focus(); };
  }
  info.append(el('h3', null, 'Conversation'));
  const line = (t) => info.append(el('p', 'cbx-meta', t));
  line(`From ${m.fromName || m.fromAddress}`); line(`To ${m.to}`); line(new Date(m.at).toLocaleString());
}
async function doAct(action, quiet = false) {
  if (!current) return;
  try { await api('/api/mail/act', { id: current.id, action }); if (!quiet) { document.body.classList.remove('cbx-reading'); $('#cm-read').replaceChildren(el('p', 'cbx-empty', { archive: 'Archived.', trash: 'Moved to Trash.', unread: 'Marked unread.' }[action] || 'Done.')); current = null; await loadFolders(); await loadList($('#cm-q')?.value?.trim() || ''); } return true; }
  catch (e) { alertNote(e.message); return false; }
}
function alertNote(t) { const n = $('#cm-read').querySelector('.cm-note') || $('#cm-read').appendChild(el('p', 'cm-note')); n.textContent = t; }
async function loadQuote() {
  try {
    const { quote, bank } = await api('/api/quotes/today'); const box = $('#cm-quote'); box.replaceChildren(el('span', 'cbx-qlabel', 'TODAY IN THE COMMONS'));
    if (!quote) { box.append(el('p', 'cbx-qtext', 'A thought from a Cohabi participant will appear here when the daily quote bank has an entry.'), el('p', 'cbx-qby', bank ? 'No quote selected today.' : 'No contributions in the quote bank yet.')); return; }
    box.append(el('p', 'cbx-qtext', `“${quote.text}”`)); const by = el('a', 'cbx-qby'); if (quote.by?.id) by.href = '/m/' + encodeURIComponent(quote.by.id); else by.removeAttribute('href'); by.append(avatar(quote.by?.name || 'Cohabi', quote.by?.face), document.createTextNode(quote.by?.name || 'Cohabi participant')); box.append(by);
  } catch { const box = $('#cm-quote'); box.replaceChildren(el('span', 'cbx-qlabel', 'TODAY IN THE COMMONS'), el('p', 'cbx-qtext', 'Today’s participant quote is unavailable.')); }
}
function noteContacts(list) {
  const add = (address, name) => { address = String(address || '').toLowerCase(); if (!address || address === myAddress || /^(no-?reply|mailer-daemon|postmaster)@/.test(address)) return; if (!contacts.has(address) || (!contacts.get(address) && name)) contacts.set(address, String(name || '').trim()); };
  for (const m of list) { add(m.fromAddress, m.fromName || String(m.from || '').replace(/\s*<.*>$/, '')); for (const t of m.to || []) add(t.address, t.name); }
  renderContacts();
}
function renderContacts() {
  const nav = $('#cm-contacts'); if (!nav) return;
  const people = [...contacts].map(([address, name]) => ({ address, name: name && name !== address ? name : '' })).sort((x, y) => (x.name || x.address).localeCompare(y.name || y.address)).slice(0, 40);
  if (!people.length) return;
  nav.replaceChildren();
  for (const p of people) { const b = el('button', 'cbx-contact'); b.type = 'button'; b.title = 'Write to ' + p.address; b.append(avatar(p.name || p.address), el('span', 'cbx-cname', p.name || p.address)); b.onclick = () => compose({ to: p.address }); nav.append(b); }
}
async function loadSentContacts() {
  try { const { folders = [] } = await api('/api/mail/folders'); const sent = folders.find((f) => f.role === 'sent'); if (!sent) return; const r = await api(`/api/mail/list?folder=${encodeURIComponent(sent.id)}`); noteContacts(r.messages || []); } catch { /* contacts are a convenience */ }
}
function compose({ to = '', subject = '' } = {}) {
  const f = $('#cm-write'); f.hidden = false; f.elements.namedItem('to').value = to; f.elements.namedItem('cc').value = ''; f.elements.namedItem('subject').value = subject; f.elements.namedItem('inReplyTo').value = ''; f.elements.namedItem('text').value = '';
  $('#cm-write-title').textContent = 'New message'; $('#cm-write-note').textContent = ''; f.elements.namedItem('to').focus();
}
$('#cm-compose').onclick = () => compose();
$('#cm-write-x').onclick = () => { $('#cm-write').hidden = true; };
$('#cm-write').onsubmit = async (ev) => {
  ev.preventDefault(); const f = ev.target; const note = $('#cm-write-note'); const btn = f.querySelector('button[type=submit]'); btn.disabled = true; note.textContent = 'Sending…';
  try { await api('/api/mail/send', { to: f.elements.namedItem('to').value.trim(), cc: f.elements.namedItem('cc').value.trim(), subject: f.elements.namedItem('subject').value, text: f.elements.namedItem('text').value, inReplyTo: f.elements.namedItem('inReplyTo').value || null }); note.textContent = 'Sent.'; setTimeout(() => { f.hidden = true; btn.disabled = false; }, 800); }
  catch (e) { note.textContent = e.message; btn.disabled = false; }
};
$('#cm-search').onsubmit = (ev) => { ev.preventDefault(); loadList($('#cm-q').value.trim()); };
for (const b of document.querySelectorAll('#cm-tabs button')) b.onclick = () => { tab = b.dataset.tab; renderTabs(); renderList(); };
start();
