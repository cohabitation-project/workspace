// Cobox (2026-11-13). Everything from a message goes on the page as text (textContent), never as HTML.
const $ = (s) => document.querySelector(s);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
async function api(url, body) {
  const r = await fetch(url, { method: body ? 'POST' : 'GET', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Commons': '1' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw Error(j.error || `That did not work (error ${r.status}).`); return j;
}
const when = (iso) => { const d = new Date(iso); return d.toDateString() === new Date().toDateString() ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : d.toLocaleDateString([], { month: 'short', day: 'numeric' }); };
let folder = new URLSearchParams(location.search).get('folder') || 'inbox', tab = 'all', messages = [], current = null, myAddress = '';
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
    b.onclick = () => { leaveBox(); folder = f.id; for (const x of nav.children) x.classList.remove('on'); b.classList.add('on'); loadList(); };
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
    if (Array.isArray(m.attachments) && m.attachments.length) {
      const box = el('div', 'cbx-attlist'); box.append(el('p', 'cbx-meta', 'Attachments'));
      for (const a of m.attachments) { const link = el('a', 'cbx-attchip', `📎 ${a.name || 'Attachment'}${a.size ? ' · ' + size(a.size) : ''}`); if (a.blobId) { link.href = `/api/mail/msg/${encodeURIComponent(m.id)}/att/${encodeURIComponent(a.blobId)}`; link.setAttribute('download', a.name || 'attachment'); } box.append(link); }
      art.append(box);
    }
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
// ---- attachments on a new message: pick or drop files; each one goes to your mailbox first, then the message names it.
const size = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
let atts = []; // [{ key, name, size, type, blobId?, state }]
function paintAtts() {
  const box = $('#cm-atts'); if (!box) return; box.replaceChildren();
  for (const a of atts) {
    const chip = el('span', 'cbx-attchip' + (a.state === 'bad' ? ' bad' : ''), `📎 ${a.name} · ${size(a.size)}${a.state === 'up' ? ' · adding…' : a.state === 'bad' ? ' · ' + a.err : ''}`);
    const x = el('button', 'cbx-attx', '✕'); x.type = 'button'; x.setAttribute('aria-label', 'Remove ' + a.name); x.onclick = () => { atts = atts.filter((y) => y !== a); paintAtts(); };
    chip.append(x); box.append(chip);
  }
}
async function addFiles(files) {
  for (const f of files) {
    const a = { key: Math.random(), name: f.name || 'attachment', size: f.size, type: f.type || 'application/octet-stream', state: 'up' };
    if (f.size > 10 * 1048576) { a.state = 'bad'; a.err = 'over 10 MB'; atts.push(a); continue; }
    if (atts.filter((x) => x.state !== 'bad').reduce((n, x) => n + x.size, 0) + f.size > 25 * 1048576) { a.state = 'bad'; a.err = 'over 25 MB in all'; atts.push(a); continue; }
    atts.push(a); paintAtts();
    try {
      const r = await fetch('/api/mail/upload?name=' + encodeURIComponent(a.name), { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': a.type, 'X-Commons': '1' }, body: f });
      const j = await r.json().catch(() => ({})); if (!r.ok || !j.blobId) throw Error(j.error || `error ${r.status}`);
      Object.assign(a, { blobId: j.blobId, type: j.type || a.type, state: 'ok' });
    } catch (e) { a.state = 'bad'; a.err = e.message; }
  }
  paintAtts();
}
$('#cm-files')?.addEventListener('change', (e) => { addFiles([...e.target.files]); e.target.value = ''; });
{ const f = $('#cm-write'); if (f) { f.addEventListener('dragover', (e) => { e.preventDefault(); f.classList.add('cbx-drop'); }); f.addEventListener('dragleave', () => f.classList.remove('cbx-drop')); f.addEventListener('drop', (e) => { e.preventDefault(); f.classList.remove('cbx-drop'); if (e.dataTransfer?.files?.length) addFiles([...e.dataTransfer.files]); }); } }
function compose({ to = '', subject = '' } = {}) {
  atts = []; paintAtts();
  const f = $('#cm-write'); f.hidden = false; f.elements.namedItem('to').value = to; f.elements.namedItem('cc').value = ''; f.elements.namedItem('subject').value = subject; f.elements.namedItem('inReplyTo').value = ''; f.elements.namedItem('text').value = '';
  $('#cm-write-title').textContent = 'New message'; $('#cm-write-note').textContent = ''; f.elements.namedItem('to').focus();
}
$('#cm-compose').onclick = () => compose();
$('#cm-write-x').onclick = () => { $('#cm-write').hidden = true; };
$('#cm-write').onsubmit = async (ev) => {
  ev.preventDefault(); const f = ev.target; const note = $('#cm-write-note'); const btn = f.querySelector('button[type=submit]');
  if (atts.some((a) => a.state === 'up')) { note.textContent = 'Wait for the files to finish adding.'; return; }
  btn.disabled = true; note.textContent = 'Sending…';
  try { await api('/api/mail/send', { to: f.elements.namedItem('to').value.trim(), cc: f.elements.namedItem('cc').value.trim(), subject: f.elements.namedItem('subject').value, text: f.elements.namedItem('text').value, inReplyTo: f.elements.namedItem('inReplyTo').value || null, attachments: atts.filter((a) => a.state === 'ok').map(({ blobId, name, type, size: sz }) => ({ blobId, name, type, size: sz })) }); atts = []; paintAtts(); note.textContent = 'Sent.'; setTimeout(() => { f.hidden = true; btn.disabled = false; }, 800); }
  catch (e) { note.textContent = e.message; btn.disabled = false; }
};
$('#cm-search').onsubmit = (ev) => { ev.preventDefault(); loadList($('#cm-q').value.trim()); };
for (const b of document.querySelectorAll('#cm-tabs button')) b.onclick = () => { tab = b.dataset.tab; renderTabs(); renderList(); };
// ---- Your inboxes (Geoffrey, 2026-11-16): Social, Marketplace and Groups in the top row, each a dropdown of inboxes.
// Choosing one fills the list with it; choosing a mail folder on the left goes back to mail.
let boxes = null, boxesAt = 0, box = null;
const BOXNAME = { 'social:messages': 'Social · Messages', 'social:notifications': 'Social · Notifications', 'social:requests': 'Social · Friend requests', 'market:yours': 'Marketplace · Your listings' };
async function loadBoxes(force = false) {
  if (!force && boxes && Date.now() - boxesAt < 30_000) return boxes;
  try { boxes = await api('/api/me/inboxes'); boxesAt = Date.now(); paintCounts(); } catch { boxes = boxes || null; }
  return boxes;
}
function itemsFor(id) {
  if (!boxes) return [];
  const [part, a, b] = id.split(':');
  if (part === 'social') return boxes.social?.[a] || [];
  if (part === 'market') return a === 'yours' ? boxes.market?.yours || [] : (boxes.market?.pages || []).find((p) => p.id === b)?.items || [];
  if (part === 'groups') return (boxes.groups || []).find((g) => g.id === a)?.items || [];
  return [];
}
function nameFor(id) {
  if (BOXNAME[id]) return BOXNAME[id];
  const [part, a, b] = id.split(':');
  if (part === 'market') return 'Marketplace · ' + ((boxes?.market?.pages || []).find((p) => p.id === b)?.name || 'Your page');
  if (part === 'groups') return 'Groups · ' + ((boxes?.groups || []).find((g) => g.id === a)?.name || 'Group');
  return 'Inbox';
}
function paintCounts() {
  const tot = { social: 0, market: 0, groups: 0 };
  for (const btn of document.querySelectorAll('[data-box]')) {
    const id = btn.dataset.box; const items = itemsFor(id); const part = id.split(':')[0];
    const n = part === 'social' ? items.filter((x) => x.unread).length : items.length;
    const c = btn.querySelector('[data-boxc]'); if (c) c.textContent = n ? String(n) : '';
    if (part === 'social') tot.social += n;
  }
  for (const [k, n] of Object.entries(tot)) { const e = document.querySelector(`[data-boxn="${k}"]`); if (!e) continue; e.hidden = !n; e.textContent = n > 99 ? '99+' : String(n); }
}
function leaveBox() {
  box = null; document.body.classList.remove('cbx-inbox');
  for (const s of document.querySelectorAll('[data-boxtab]')) s.classList.remove('cbx-cur');
  for (const b of document.querySelectorAll('[data-box]')) b.removeAttribute('aria-current');
  $('#cm-tabs').hidden = false; $('#cm-boxname').textContent = 'Mail';
}
async function openBox(id) {
  box = id; document.body.classList.add('cbx-inbox'); document.body.classList.remove('cbx-reading');
  for (const d of document.querySelectorAll('[data-boxtab]')) { d.open = false; d.classList.toggle('cbx-cur', d.dataset.boxtab === id.split(':')[0]); }
  for (const b of document.querySelectorAll('[data-box]')) { if (b.dataset.box === id) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); }
  for (const f of document.querySelectorAll('#cm-folders .cbx-folder')) f.classList.remove('on');
  $('#cm-app').hidden = false; $('#cm-tabs').hidden = true;
  const ul = $('#cm-list'); ul.replaceChildren(el('li', 'cbx-empty', 'Loading…'));
  await loadBoxes(true); if (box !== id) return;
  $('#cm-boxname').textContent = nameFor(id);
  const items = itemsFor(id); ul.replaceChildren();
  if (!boxes) { ul.append(el('li', 'cbx-empty', 'This inbox could not be opened just now. Try again in a moment.')); return; }
  if (!items.length) ul.append(el('li', 'cbx-empty', { 'social:messages': 'No messages yet.', 'social:notifications': 'Nothing new on your posts.', 'social:requests': 'No friend requests waiting.' }[id] || 'Nothing here yet.'));
  for (const it of items) {
    const li = el('li', 'cbx-row' + (it.unread ? ' unread' : '')); const btn = el('button'); btn.type = 'button';
    const av = avatar(it.who?.name || '?', it.who?.id ? '/m/' + encodeURIComponent(it.who.id) + '/face' : null);
    const top = el('span', 'cbx-top'); top.append(el('strong', 'cbx-from', it.who?.name || ''), el('time', 'cbx-when', it.ts ? when(it.ts) : ''));
    const text = el('span', 'cbx-rowtext'); text.append(top, el('span', 'cbx-subj', it.title), el('span', 'cbx-prev', it.text || ''));
    const marks = el('span', 'cbx-marks'); if (it.unread) marks.append(el('span', 'cbx-dot'));
    btn.append(av, text, marks); btn.onclick = () => showItem(it, li); li.append(btn); ul.append(li);
  }
}
function showItem(it, li) {
  for (const x of document.querySelectorAll('#cm-list .cbx-row')) x.classList.remove('on'); li.classList.add('on');
  ++messageRequest; current = null; document.body.classList.add('cbx-reading');
  const art = $('#cm-read'); art.replaceChildren();
  const tools = el('div', 'cbx-tools'); const back = el('button', 'cbx-tool', '←'); back.type = 'button'; back.title = 'Back to the list'; back.setAttribute('aria-label', 'Back to the list'); back.onclick = () => document.body.classList.remove('cbx-reading'); tools.append(back);
  const head = el('header', 'cbx-msghead'); head.append(el('h2', null, it.title), el('span', 'cbx-tag', nameFor(box).split(' · ')[0]));
  const who = el('div', 'cbx-who'); who.append(avatar(it.who?.name || '?', it.who?.id ? '/m/' + encodeURIComponent(it.who.id) + '/face' : null));
  const wt = el('div'); wt.append(el('strong', null, it.who?.name || '')); who.append(wt); if (it.ts) who.append(el('time', 'cbx-meta', new Date(it.ts).toLocaleString()));
  art.append(tools, head, who);
  if (it.text) art.append(el('pre', 'cbx-body', it.text));
  const open = el('a', 'btn', box?.startsWith('social:messages') ? 'Open the conversation' : 'Open it'); open.href = it.href; art.append(open);
  $('#cm-person').hidden = true; $('#cm-info').hidden = true;
}
for (const b of document.querySelectorAll('[data-box]')) b.onclick = () => openBox(b.dataset.box);
start(); loadBoxes();
