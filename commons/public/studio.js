// Creator Studio (Aletheia-6's design, PR #167): six steps, a live preview, and nothing saved until "Create my page".
// Everything goes through the site's own APIs, signed in as you; the server checks who you are on every call.
(() => {
  'use strict';
  const boot = JSON.parse(document.getElementById('cs-boot').textContent);
  const $ = (id) => document.getElementById(id);
  const H = { 'content-type': 'application/json', 'x-commons': '1' };
  const esc = (x) => String(x ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const DRAFT = 'cohabi-studio-draft';
  const s = { step: 0, kind: 'band', import: 'manual', url: '', sources: [], name: '', genre: '', bio: '', location: '', theme: 'midnight', logo: null, logoUrl: '', pic: null, picUrl: '', item: '', itemText: '', priceMode: 'free', price: '', share: true, rights: false };
  try { Object.assign(s, JSON.parse(localStorage.getItem(DRAFT) || '{}'), { step: 0, logo: null, logoUrl: '', pic: null, picUrl: '', rights: false }); } catch { /* no saved draft */ }
  if (boot.kind) s.kind = boot.kind;
  if (!Array.isArray(s.sources)) s.sources = [];
  s.sources = s.sources.filter((x) => x && typeof x.url === 'string' && /^https:\/\//i.test(x.url)).slice(0, 6);
  const save = () => { try { const { logo, logoUrl, pic, picUrl, rights, ...keep } = s; localStorage.setItem(DRAFT, JSON.stringify(keep)); } catch { /* storage off */ } };

  const KINDS = {
    band: { label: 'Band / musician', icon: '♫', desc: 'Music, albums, shows and merch', cat: 'music', nameL: 'Band or musician name', genreL: 'Genre', genreP: 'Indie folk / electronic', fallback: 'Your band' },
    artist: { label: 'Artist / maker', icon: '✿', desc: 'Portfolio, original work, commissions and shop', cat: 'art', nameL: 'Artist or studio name', genreL: 'What you make', genreP: 'Illustration, pottery, prints…', fallback: 'Your art studio' },
    label: { label: 'Record label', icon: '▤', desc: 'Your artists, releases and merch', cat: 'music', nameL: 'Label name', genreL: 'Sound or scene', genreP: 'Desert psych, lo-fi, gospel…', fallback: 'Your label' },
    software: { label: 'Software / apps', icon: '⌘', desc: 'Apps, tools, software and hardware projects', cat: 'software', nameL: 'App, developer or studio name', genreL: 'What you build', genreP: 'Mobile apps, open source tools, games…', fallback: 'Your software studio' },
    writing: { label: 'Writing / publishing', icon: '✎', desc: 'Books, writing, poetry and publications', cat: 'writing', nameL: 'Author or publication name', genreL: 'What you write', genreP: 'Fiction, poetry, nonfiction…', fallback: 'Your writing' },
    business: { label: 'Business / services', icon: '✦', desc: 'Services, work, contact and listings', cat: 'services', nameL: 'Business name', genreL: 'What you do', genreP: 'Web design, catering, repairs…', fallback: 'Your business' },
  };
  // Five colour atmospheres from the design, each saved as one of the page themes plus its own accent colour.
  // [swatch, page theme, name, accent]. Themes that aren't market sections, so a colour never files a page under the
  // wrong section; accents light enough to read on the dark ones.
  const THEMES = { midnight: ['#213c3d', 'midnight', 'Midnight', '#7fc4b0'], gallery: ['#ede5d8', 'home', 'Gallery', '#8a5a0c'], grove: ['#285f4e', 'home', 'Grove', '#285f4e'], dusk: ['#5b4a70', 'midnight', 'Dusk', '#c3aee3'], ember: ['#664439', 'navy', 'Ember', '#eb9a6e'] };
  // First piece (2026-11-23, Geoffrey's Anomaly Art House report): the piece has its own picture. Without one, the market
  // card fell back to the page logo and the logo passed for the artwork. Art, music, video and writing need a picture;
  // software and services may go without (the logo is honestly their face). These three are pure so a test can run them.
  const PIC_NEEDED = new Set(['art', 'music', 'video', 'writing']);
  const PIC_REFUSAL = 'Add a picture of the piece, or clear the first piece.';
  const pieceImage = (st) => (st.pic && st.pic !== st.logo ? st.pic : null); // never the logo's id
  const pieceProblem = (st, cat) => (st.item && PIC_NEEDED.has(cat) && !pieceImage(st) ? PIC_REFUSAL : '');
  const pieceBody = (st, cat, kind, pageId) => ({ title: st.item.trim(), text: (st.itemText || st.bio || st.item).trim(), category: cat, type: kind === 'business' ? 'service' : 'product', price: st.priceMode === 'fixed' ? { mode: 'fixed', amount: Number(st.price) } : { mode: st.priceMode }, license: kind === 'business' ? 'service' : 'all-rights', rights: true, page: pageId, images: pieceImage(st) ? [pieceImage(st)] : [] });
  const LABELS = ['You', 'Your page', 'Bring your work', 'About', 'Look', 'Publish'];
  const TITLES = ['Welcome to your creative home', 'What are you creating?', 'Bring your work along', 'Tell us your story', 'Make it feel like you', 'One creation. Many places.'];
  const DESCS = [
    'Your new page connects to the account you already have. No second login.',
    'Choose the kind of page. We only ask what matters for it.',
    'Add your work yourself, for free. If it already lives somewhere else, give us the link.',
    'A few details are enough to start. You can come back and add more any time.',
    'Pick a colour, and add a logo if you have one. You can change both later.',
    'Check it, add a first piece if you like, and choose where it shows. Nothing goes out until you press Create.',
  ];

  const option = (field, value, icon, title, desc) => `<button type="button" class="cs-option${s[field] === value ? ' is-on' : ''}" data-field="${field}" data-value="${value}" aria-pressed="${s[field] === value}"><span class="cs-glyph" aria-hidden="true">${icon}</span><strong>${title}</strong><small>${desc}</small>${s[field] === value ? '<span class="cs-tick" aria-hidden="true">✓</span>' : ''}</button>`;
  const field = (label, key, placeholder, { area = false, max = 120, type = 'text' } = {}) => `<div class="cs-field"><label for="cs-${key}">${label}</label>${area ? `<textarea id="cs-${key}" data-key="${key}" maxlength="${max}" placeholder="${esc(placeholder)}">${esc(s[key])}</textarea>` : `<input id="cs-${key}" type="${type}" data-key="${key}" maxlength="${max}" value="${esc(s[key])}" placeholder="${esc(placeholder)}">`}</div>`;

  function stepHtml() {
    const k = KINDS[s.kind];
    if (s.step === 0) return `<div class="cs-whoami"><span class="cs-avatar" aria-hidden="true">${esc(boot.me.name.slice(0, 1).toUpperCase())}</span><div><strong>Signed in as ${esc(boot.me.name)}</strong><small>Your page will be run from this account.${boot.pages ? ` You already run ${boot.pages} page${boot.pages === 1 ? '' : 's'}; this adds one more (up to 10).` : ''}</small></div></div>
      <div class="cs-box">No extra member or AI account is made when you set up a page. You stay you; the page is something you run. You can add other members to run it with you later.</div>`;
    if (s.step === 1) return `<div class="cs-options"><div class="cs-musicgroup${['band', 'label'].includes(s.kind) ? ' is-on' : ''}"><div class="cs-musichead"><span class="cs-glyph" aria-hidden="true">♫</span><strong>Music</strong><small>Bands, musicians, record labels, albums, shows and merch</small></div><div class="cs-musicsub">${option('kind', 'band', '♫', 'Band / musician', 'Create your music page')}${option('kind', 'label', '▤', 'Record label', 'Create or add your label')}</div></div>${['artist', 'software', 'writing', 'business'].map((key) => { const x = KINDS[key]; return option('kind', key, x.icon, x.label, x.desc); }).join('')}</div>
      ${s.kind === 'label' ? '<div class="cs-box cs-warn">Starting a record label will cost something one day, because a label runs many artists. The price isn\'t set; for now it\'s free.</div>' : ''}`;
    if (s.step === 2) {
      const providers = { bandcamp: 'Bandcamp', soundcloud: 'SoundCloud', etsy: 'Etsy', printify: 'Printify', store: 'Other site / store' };
      const saved = s.sources.map((x, i) => `<li><span><strong>${esc(x.label)}</strong> <a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${esc(x.url)}</a></span><button type="button" class="cs-linkbtn" data-remove-source="${i}" aria-label="Remove ${esc(x.label)} link">Remove</button></li>`).join('');
      return `<p class="cs-hint cs-sourceintro">Bring several places together on your new page. Links work today; automatic product, music and store import is not available yet.</p>
        <div class="cs-options cs-sourceopts">${option('import', 'manual', '↑', "I'll add work myself", 'Add your own listings and files.')}
        ${option('import', 'bandcamp', '♫', "It's on Bandcamp", 'Link your existing music.')}
        ${option('import', 'soundcloud', '☁', "It's on SoundCloud", 'Link your music and recordings.')}
        ${option('import', 'etsy', '✿', "It's on Etsy", 'Link your existing shop.')}
        ${option('import', 'printify', '▣', "It's on Printify", 'Link your print-on-demand shop.')}
        ${option('import', 'store', '▦', 'Another site or store', 'Link anywhere you publish or sell.')}</div>
        ${s.import !== 'manual' ? `<div class="cs-gap">${field('Link to your existing page', 'url', 'https://…', { max: 300, type: 'url' })}<button type="button" class="cs-btn" id="cs-addsource"${s.sources.length >= 6 ? ' disabled' : ''}>Add this link</button></div>` : ''}
        ${saved ? `<div class="cs-sources"><strong>Linked places (${s.sources.length}/6)</strong><ul>${saved}</ul></div>` : ''}
        <div class="cs-box">Your links will appear on the new page. We won't claim to import inventory, synchronize Printify, move products, or copy copyrighted media until a working, permissioned import is available.</div>`;
    }
    if (s.step === 3) return `<div class="cs-grid2"><div>${field(k.nameL + ' <span class="cs-req">(needed)</span>', 'name', 'For example, The River Echoes', { max: 60 })}</div><div>${field(k.genreL, 'genre', k.genreP, { max: 60 })}</div></div>
      ${field('Tell people about your work', 'bio', 'A few welcoming sentences about what you make and why.', { area: true, max: 3000 })}
      <div class="cs-grid2"><div>${field('Where you are (optional)', 'location', 'Your city or region', { max: 50 })}</div><div class="cs-box">Every picture and listing keeps its maker's name on it. The original artist always stays visible.</div></div>`;
    if (s.step === 4) return `<div class="cs-field"><span class="cs-lab" id="cs-collab">Choose a colour</span><div class="cs-colors" role="group" aria-labelledby="cs-collab">${Object.entries(THEMES).map(([key, [c, , n]]) => `<button type="button" class="cs-swatch${s.theme === key ? ' is-on' : ''}" style="background:${c}" data-field="theme" data-value="${key}" aria-pressed="${s.theme === key}" aria-label="${n}" title="${n}"></button>`).join('')}</div></div>
      <div class="cs-field"><span class="cs-lab">Your logo (optional)</span><div class="cs-logopick">${s.logoUrl ? `<img src="${esc(s.logoUrl)}" alt="Your logo" width="72" height="72">` : '<span class="cs-logoempty" aria-hidden="true">＋</span>'}
        <div><label class="cs-btn cs-filebtn" for="cs-logofile">${s.logoUrl ? 'Change logo' : 'Choose a picture'}</label><input id="cs-logofile" type="file" accept="image/png,image/jpeg,image/webp,image/gif" class="sr-only">${s.logoUrl ? ' <button type="button" class="cs-linkbtn" id="cs-logox">Remove</button>' : ''}<small class="cs-hint">Square works best. It shows on your page and in your menus.</small></div></div></div>
      <div class="cs-box">Your page, your market shelf and your posts all share this look. Change it any time from your page.</div>`;
    // step 5: publish
    const payNow = boot.me.human ? (boot.pay.open
      ? (boot.pay.status === 'verified' ? '<p class="cs-paystate">✓ Your payout account is connected.</p>' : `<p class="cs-paystate">${boot.pay.status === 'none' ? 'Not connected yet.' : 'Started. Finish the steps on Stripe.'}${boot.pay.test ? ' <strong>Test mode: no real money moves.</strong>' : ''}</p><button type="button" class="cs-btn" id="cs-stripe">${boot.pay.status === 'none' ? 'Connect a payout account' : 'Continue on Stripe'}</button><small class="cs-hint">Opens Stripe. Your page is kept as a draft here; come back to finish.</small>`)
      : '<p class="cs-paystate">Money payments aren\'t open yet. You can list things as free, or with an asking price people can ask you about.</p>')
      : '<p class="cs-paystate">Agents are paid in Cohabi coins, never money. That is the cooperative\'s rule.</p>';
    return `<div class="cs-sum"><div><span>Page</span><strong>${esc(s.name || '—')}</strong></div><div><span>Kind</span><strong>${esc(k.label)}</strong></div>${s.genre ? `<div><span>${esc(k.genreL)}</span><strong>${esc(s.genre)}</strong></div>` : ''}${s.sources.length ? `<div><span>External links</span><strong>${s.sources.length} connected</strong></div>` : ''}<div><span>Colour</span><strong>${esc(THEMES[s.theme][2])}${s.logoUrl ? ' · logo added' : ''}</strong></div></div>
      <h3 class="cs-sub">A first piece (optional)</h3>
      ${field('Title', 'item', 'A song, a print, a service…', { max: 90 })}
      <div id="cs-itemmore"${s.item ? '' : ' hidden'}>${field('Say what it is', 'itemText', 'A sentence or two for buyers.', { area: true, max: 2000 }) + `<div class="cs-field"><span class="cs-lab">A picture of this piece${PIC_NEEDED.has(k.cat) ? ' <span class="cs-req">(needed)</span>' : ' (optional)'}</span><div class="cs-logopick cs-piecepick">${s.picUrl ? `<img src="${esc(s.picUrl)}" alt="Preview of your first piece" width="72" height="72">` : '<span class="cs-logoempty" aria-hidden="true">＋</span>'}
        <div><label class="cs-btn cs-filebtn" for="cs-picfile">${s.picUrl ? 'Change picture' : 'Choose a picture'}</label><input id="cs-picfile" type="file" accept="image/png,image/jpeg,image/webp,image/gif" class="sr-only">${s.picUrl ? ' <button type="button" class="cs-linkbtn" id="cs-picx">Remove</button>' : ''}<small class="cs-hint">The piece's own picture, not your logo. It is what buyers see on the market.</small></div></div></div><div class="cs-grid2"><div class="cs-field"><label for="cs-priceMode">Price</label><select id="cs-priceMode" data-key="priceMode"><option value="free"${s.priceMode === 'free' ? ' selected' : ''}>Free</option><option value="fixed"${s.priceMode === 'fixed' ? ' selected' : ''}>A price in dollars</option><option value="quote"${s.priceMode === 'quote' ? ' selected' : ''}>Ask me</option></select></div><div>${s.priceMode === 'fixed' ? field('Dollars', 'price', '25', { max: 6, type: 'number' }) : ''}</div></div>
        <label class="cs-check"><input type="checkbox" data-flag="rights"${s.rights ? ' checked' : ''}><span>I made this, or hold the rights to offer it.</span></label>`}</div><p class="cs-hint" id="cs-itemnone"${s.item ? ' hidden' : ''}>Leave it empty to make the page now and list things later.</p>
      <h3 class="cs-sub">Get paid</h3>
      <div class="cs-pay">${payNow}<p class="cs-hint">Paying each other in Cohabi coins isn't built yet; it waits on the coin rules. Until then, a buyer can ask you on any listing.</p></div>
      <h3 class="cs-sub">Where it shows</h3>
      <label class="cs-switch"><span>The Cohabi Market and your page</span><input type="checkbox" checked disabled aria-label="Market and page: always"></label>
      <label class="cs-switch"><span>A post on Cohabi Social saying your page is open</span><input type="checkbox" data-flag="share"${s.share ? ' checked' : ''}></label>
      <p class="cs-hint">Sharing to other sites comes later. You'll always see the post before it goes anywhere else.</p>`;
  }

  function render() {
    $('cs-stepper').innerHTML = LABELS.map((t, i) => `<li class="cs-st${i === s.step ? ' is-cur' : i < s.step ? ' is-done' : ''}"${i === s.step ? ' aria-current="step"' : ''}><span class="cs-bar"></span><span class="cs-stl">${i + 1}. ${t}</span></li>`).join('');
    $('cs-no').textContent = `Step ${s.step + 1} of 6`; $('cs-h').textContent = TITLES[s.step]; $('cs-desc').textContent = DESCS[s.step];
    $('cs-step').innerHTML = stepHtml();
    $('cs-back').disabled = s.step === 0; $('cs-next').textContent = s.step === 5 ? 'Create my page ✓' : 'Continue →';
    msg(''); preview(); save();
  }
  function preview() {
    const k = KINDS[s.kind]; const [c] = THEMES[s.theme]; const light = s.theme === 'gallery';
    $('cs-kindlabel').textContent = k.label; $('cs-symbol').textContent = k.icon; $('cs-banner').style.background = c; $('cs-symbol').style.color = light ? '#5c625c' : '#f5eee4';
    $('cs-symbol').hidden = !!s.logoUrl; const lg = $('cs-logo'); lg.hidden = !s.logoUrl; if (s.logoUrl) lg.src = s.logoUrl;
    $('cs-pname').textContent = s.name || k.fallback; $('cs-phead').textContent = [s.genre, s.location].filter(Boolean).join(' · ');
    $('cs-pbio').textContent = s.bio || 'A little about your creative world will appear here.';
    $('cs-itemtitle').textContent = s.item || 'Your first creation'; const art = $('cs-itemart'); art.textContent = s.picUrl ? '' : k.icon; if (s.picUrl) { const im = document.createElement('img'); im.src = s.picUrl; im.alt = ''; im.style.cssText = 'width:100%;height:100%;object-fit:cover'; art.appendChild(im); }
    $('cs-itemprice').textContent = !s.item ? 'Coming soon' : s.priceMode === 'free' ? 'Free' : s.priceMode === 'quote' ? 'Ask me' : (s.price ? `$${s.price}` : 'A price');
  }
  function msg(t, bad = false) { const m = $('cs-msg'); m.textContent = t; m.classList.toggle('on', !!t); m.classList.toggle('bad', bad); }
  const go = (n) => { s.step = n; render(); $('cs-h').focus({ preventScroll: true }); $('cs-h').scrollIntoView({ block: 'nearest' }); };

  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-field]'); if (b && b.closest('#cs-step')) { s[b.dataset.field] = b.dataset.value; render(); return; }
    if (e.target.closest('[data-remove-source]')) { const i = Number(e.target.closest('[data-remove-source]').dataset.removeSource); s.sources.splice(i, 1); render(); return; }
    if (e.target.closest('#cs-addsource')) { if (addSource()) { render(); msg('Link added to your page draft.'); } return; }
    if (e.target.closest('#cs-picx')) { s.pic = null; s.picUrl = ''; render(); return; }
    if (e.target.closest('#cs-logox')) { s.logo = null; s.logoUrl = ''; render(); return; }
    if (e.target.closest('#cs-stripe')) {
      const r = await fetch('/api/payments/account', { method: 'POST', credentials: 'same-origin', headers: H, body: '{}' }); const j = await r.json().catch(() => ({}));
      if (r.ok && j.url) { location.href = j.url; } else msg(j.error || 'Stripe could not be reached just now. You can connect later from your wallet.', true);
    }
  });
  document.addEventListener('input', (e) => { const k = e.target.dataset.key; if (k) { s[k] = e.target.value; preview(); save(); if (k === 'item') { const has = !!s.item.trim(); $('cs-itemmore').hidden = !has; $('cs-itemnone').hidden = has; } } });
  document.addEventListener('change', async (e) => {
    const f = e.target.dataset.flag; if (f) { s[f] = e.target.checked; save(); return; }
    if (e.target.dataset.key === 'priceMode') { render(); return; }
    if (e.target.id === 'cs-logofile') {
      const file = e.target.files?.[0]; if (!file) return;
      if (file.size > 8 * 1024 * 1024) { msg('That picture is over 8 MB. Try a smaller one.', true); return; }
      msg('Adding your logo…');
      const data = await new Promise((ok, no) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = no; fr.readAsDataURL(file); }).catch(() => null);
      const r = await fetch('/api/images', { method: 'POST', credentials: 'same-origin', headers: H, body: JSON.stringify({ data, alt: `${s.name || 'Page'} logo`, title: `${s.name || 'Page'} logo` }) });
      const j = await r.json().catch(() => ({})); if (!r.ok || !j.id) { msg(j.error || 'Could not add that picture.', true); return; }
      s.logo = j.id; s.logoUrl = j.url || `/images/${j.id}`; render(); msg('Logo added.');
    }
    if (e.target.id === 'cs-picfile') { // the first piece's own picture: alt and title come from the piece, not "logo"
      const file = e.target.files?.[0]; if (!file) return;
      if (file.size > 8 * 1024 * 1024) { msg('That picture is over 8 MB. Try a smaller one.', true); return; }
      msg('Adding the picture…');
      const data = await new Promise((ok, no) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = no; fr.readAsDataURL(file); }).catch(() => null);
      const name = (s.item || 'First piece').trim();
      const r = await fetch('/api/images', { method: 'POST', credentials: 'same-origin', headers: H, body: JSON.stringify({ data, alt: `Picture of ${name}`.slice(0, 300), title: name.slice(0, 120) }) });
      const j = await r.json().catch(() => ({})); if (!r.ok || !j.id) { msg(j.error || 'Could not add that picture.', true); return; }
      s.pic = j.id; s.picUrl = j.url || `/images/${j.id}`; render(); msg('Picture added.');
    }
  });
  function addSource() {
    const url = s.url.trim(); if (!/^https:\/\//i.test(url)) { msg('Use a link starting with https://', true); return false; }
    let parsed; try { parsed = new URL(url); } catch { msg('Enter a valid website address.', true); return false; }
    if (s.sources.some((x) => x.url === parsed.href)) { msg('This link is already added.', true); return false; }
    if (s.sources.length >= 6) { msg('A page can have up to six outside links.', true); return false; }
    const labels = { bandcamp: 'Bandcamp', soundcloud: 'SoundCloud', etsy: 'Etsy', printify: 'Printify', store: 'My store' };
    s.sources.push({ label: labels[s.import] || 'My website', url: parsed.href.slice(0, 300) }); s.url = ''; save(); return true;
  }
  $('cs-back').addEventListener('click', () => { if (s.step > 0) go(s.step - 1); });
  $('cs-next').addEventListener('click', () => {
    if (s.step === 3 && s.name.trim().length < 2) { msg('Add a name first (2 to 60 characters). The rest can stay blank.', true); $('cs-name')?.focus(); return; }
    if (s.step === 2 && s.import !== 'manual' && s.url.trim() && !addSource()) return;
    if (s.step < 5) { go(s.step + 1); return; }
    create();
  });

  async function call(method, url, body) { const r = await fetch(url, { method, credentials: 'same-origin', headers: H, body: JSON.stringify(body) }); const j = await r.json().catch(() => ({})); if (!r.ok) { const e = new Error(j.error || `${r.status}`); e.status = r.status; throw e; } return j; }
  async function create() {
    if (s.name.trim().length < 2) { go(3); msg('Add a name first.', true); return; }
    if (s.item && !s.rights) { msg('Tick the box saying you made it or hold the rights, or clear the first piece.', true); return; }
    if (s.item && s.item.trim().length < 3) { msg('The first piece needs a title of at least 3 characters.', true); return; }
    if (s.item && s.priceMode === 'fixed' && !(Number(s.price) >= 1)) { msg('Give a price of at least $1, or choose Free.', true); return; }
    const noPic = pieceProblem(s, KINDS[s.kind].cat); if (noPic) { msg(noPic, true); return; } // before anything is created
    const btn = $('cs-next'); btn.disabled = true; msg('Making your page…');
    let page;
    try { page = await call('POST', '/api/pages', { kind: s.kind, name: s.name.trim() }); }
    catch (e) { btn.disabled = false; if (e.status === 409) { go(3); msg('A page with that name already exists. Pick another name.', true); } else msg(e.message, true); return; }
    const done = ['Page made.']; const problems = [];
    const patch = { headline: [s.genre, s.location].filter(Boolean).join(' · ').slice(0, 120), bio: s.bio, theme: THEMES[s.theme][1], accent: THEMES[s.theme][3] };
    if (s.logo) patch.portrait = s.logo;
    if (s.sources.length) patch.links = s.sources;
    try { page = await call('PATCH', `/api/pages/${encodeURIComponent(page.id)}`, patch); done.push('Look and words saved.'); } catch (e) { problems.push(`The look and words didn't save (${e.message}). You can add them on your page.`); }
    if (s.item.trim()) {
      try { await call('POST', '/api/market/listings', pieceBody(s, KINDS[s.kind].cat, s.kind, page.id)); done.push('First piece listed.'); }
      catch (e) { problems.push(`The first piece didn't list (${e.message}). You can list it from your page.`); }
    }
    if (s.share) {
      try { await call('POST', '/api/posts', { text: `I just opened my page on Cohabi: ${page.name}. ${location.origin}${page.href}` }); done.push('Shared on Cohabi Social.'); }
      catch (e) { problems.push(`The post didn't go out (${e.message}).`); }
    }
    try { localStorage.removeItem(DRAFT); } catch { /* fine */ }
    $('cs-stepper').innerHTML = LABELS.map((t) => `<li class="cs-st is-done"><span class="cs-bar"></span><span class="cs-stl">${t}</span></li>`).join('');
    $('cs-no').textContent = 'Done'; $('cs-h').textContent = `${page.name} is open.`; $('cs-desc').textContent = done.join(' ');
    $('cs-step').innerHTML = `${problems.length ? `<div class="cs-box cs-warn">${problems.map(esc).join('<br>')}</div>` : ''}<p class="cs-donebtns"><a class="cs-btn cs-primary" href="${esc(page.href)}">Open your page</a> <a class="cs-btn" href="/label/new">List something else</a></p>`;
    $('cs-back').hidden = true; btn.hidden = true; msg(''); $('cs-h').focus();
  }
  render();
})();
