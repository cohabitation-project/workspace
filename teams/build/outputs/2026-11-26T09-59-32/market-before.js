// market.js — the Cohabi Market's forms: list or edit, withdraw, and the public question thread.
const $ = (s, r = document) => r.querySelector(s);
const send = async (url, method, body) => {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'X-Commons': '1' }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || `error ${r.status}`); return j;
};

const form = $('#mk-form');
if (form) {
  const modeSel = form.querySelector('[name=price_mode]');
  const sync = () => {
    const m = modeSel.value;
    form.querySelector('.mk-amount').hidden = m !== 'fixed';
    form.querySelector('.mk-packsform').hidden = m !== 'packages';
  };
  modeSel.addEventListener('change', sync); sync();

  // Upload a product picture straight from the listing form (Geoffrey, 2026-11-23: he picked a file with the old
  // dead control, nothing happened, and his listing showed the store logo instead of the product).
  const imgup = form.querySelector('#mk-imgup');
  if (imgup) imgup.addEventListener('change', async () => {
    const file = imgup.files && imgup.files[0]; if (!file) return;
    const msg = $('#mk-msg');
    const checked = form.querySelectorAll('input[name=images]:checked').length;
    if (checked >= 4) { msg.textContent = 'A listing shows up to 4 pictures; untick one first.'; imgup.value = ''; return; }
    if (file.size > 20 * 1024 * 1024) { msg.textContent = 'That picture is over 20 MB.'; imgup.value = ''; return; }
    msg.textContent = 'Uploading…';
    try {
      const data = await new Promise((ok, bad) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => bad(new Error('could not read the file')); r.readAsDataURL(file); });
      const alt = (form.querySelector('[name=title]')?.value || file.name).trim().slice(0, 120);
      const j = await send('/api/images', 'POST', { data, alt, title: alt, made_by: form.querySelector('[name=made_by]')?.value || 'human' });
      const list = form.querySelector('.mk-imglist');
      const label = document.createElement('label'); label.className = 'mk-imgpick';
      label.innerHTML = `<input type="checkbox" name="images" value="" checked><img src="" alt="">`;
      label.querySelector('input').value = j.id; const im = label.querySelector('img'); im.src = `/images/${j.id}`; im.alt = alt;
      list.prepend(label);
      const hint = form.querySelector('#mk-noimgs'); if (hint) hint.remove();
      msg.textContent = 'Uploaded and ticked: it goes on when you press ' + (form.dataset.id ? 'Save.' : '“List it”.');
    } catch (err) { msg.textContent = `Upload failed: ${err.message}`; }
    finally { imgup.value = ''; }
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(form); const msg = $('#mk-msg');
    const mode = f.get('price_mode');
    const body = {
      title: f.get('title'), text: f.get('text'), category: f.get('category'), type: f.get('type'),
      price: { mode, amount: mode === 'fixed' ? Number(f.get('price_amount')) : undefined },
      link: f.get('link') || null, tags: String(f.get('tags') || ''), license: f.get('license'), made_by: f.get('made_by'), ...(form.querySelector('[name=reserves_none]') ? { reserves_share: f.get('reserves_none') ? 'none' : 'fixed' } : {}),
      desk: f.get('desk') || null, images: f.getAll('images'),
    };
    if (mode === 'packages') body.packages = [0, 1, 2].map((i) => ({ name: f.get(`pk_name_${i}`), price: Number(f.get(`pk_price_${i}`)), days: Number(f.get(`pk_days_${i}`)), includes: f.get(`pk_includes_${i}`) })).filter((k) => k.name);
    const id = form.dataset.id;
    if (!id) { body.rights = f.get('rights') === 'on'; if (f.get('team')) body.team = f.get('team'); if (f.get('page')) body.page = f.get('page'); }
    msg.textContent = 'Saving…';
    const merch = !id && form.dataset.mockup && $('#mf-on')?.checked;
    if (merch) { body.mockup = form.dataset.mockup; body.price = { mode: 'fixed', amount: Number(f.get('price_amount')) }; }
    try {
      const l = id ? await send(`/api/market/listings/${id}`, 'PATCH', body) : merch ? await send('/api/merch/listings', 'POST', body) : await send('/api/market/listings', 'POST', body);
      location.href = `/label/l/${l.id}`;
    } catch (err) { msg.textContent = err.message; }
  });
}

document.addEventListener('click', async (e) => {
  const w = e.target.closest('.mk-withdraw');
  if (w) {
    if (w.dataset.armed !== '1') { w.dataset.armed = '1'; w.textContent = 'Tap again to withdraw (it stays in the record)'; return; }
    try { await send(`/api/market/listings/${w.dataset.id}/withdraw`, 'POST'); location.reload(); } catch (err) { w.textContent = err.message; }
    return;
  }
  const r = e.target.closest('.mk-reply');
  if (r) {
    const f = $('.mk-askform'); if (!f) return;
    f.querySelector('[name=reply_to]').value = r.dataset.q; f.querySelector('.mk-replying').hidden = false; f.querySelector('textarea').focus();
    return;
  }
  if (e.target.closest('.mk-cancel')) { const f = $('.mk-askform'); f.querySelector('[name=reply_to]').value = ''; f.querySelector('.mk-replying').hidden = true; }
});

const askf = $('.mk-askform');
if (askf) askf.addEventListener('submit', async (e) => {
  e.preventDefault();
  const t = askf.querySelector('textarea'); const text = t.value.trim(); if (!text) return;
  try {
    const a = await send(`/api/market/listings/${askf.dataset.id}/ask`, 'POST', { text, reply_to: askf.querySelector('[name=reply_to]').value || null });
    location.hash = a.id; location.reload();
  } catch (err) { t.setCustomValidity(err.message); t.reportValidity(); setTimeout(() => t.setCustomValidity(''), 3000); }
});

// ---- paying: Buy / Order / Give open the payment form right here on the listing page (2026-11-18, Geoffrey: in-app,
// not off-site). When the server can't embed it (no publishable key set), it falls back to Stripe's own page.
let stripeJs = null;
const loadStripe = () => stripeJs || (stripeJs = new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'https://js.stripe.com/v3/'; s.onload = () => ok(window.Stripe); s.onerror = () => no(new Error("The payment form couldn't load. Check your connection and try again.")); document.head.appendChild(s); }));
let openCheckout = null;
// "You're buying: …" from the button that was pressed: a product under the art names product, colour, size and price.
const buyingWhat = (b, body) => {
  const art = document.querySelector('h1')?.textContent.trim() || 'this listing';
  if (body.merch) {
    const card = b.closest('[data-pod]');
    const name = card?.querySelector('h3, h4, strong, .mk-podname')?.textContent.trim() || body.merch.product;
    const price = card?.querySelector('[data-pod-price]')?.textContent.trim() || '';
    return `You're buying: ${name}${body.merch.color ? `, ${body.merch.color}` : ''}${body.merch.size ? `, ${body.merch.size}` : ''}, with ${art}${price ? ` · ${price}` : ''}`;
  }
  const price = (b.textContent.match(/\$[\d.,]+/) || [''])[0];
  return `You're buying: ${art} (the art itself, nothing printed)${price ? ` · ${price}` : ''}`;
};
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-buy]'); if (!b) return;
  // A Buy on a section tile: Stripe's checkout may only load on the listing page, so go there and open it (?buy=1).
  if (b.closest('.mk-card') && !b.dataset.package) { location.href = `/label/l/${encodeURIComponent(b.dataset.buy)}?buy=1`; return; }
  const body = {};
  if (b.dataset.package) body.package = Number(b.dataset.package);
  if (b.dataset.amountFrom) body.amount = Number(document.getElementById(b.dataset.amountFrom)?.value);
  // One product under an artwork: the colour swatch that's on, and the size picked (merchRow in marketpage.mjs).
  if (b.dataset.merch) { const card = b.closest('[data-pod]'); body.merch = { product: b.dataset.merch, color: card?.querySelector('.mk-sw.on')?.getAttribute('aria-label') || null, size: card?.querySelector('[data-pod-size]')?.selectedOptions[0]?.dataset.size || '' }; }
  const was = b.textContent; b.disabled = true; b.textContent = 'Opening checkout…';
  try {
    const j = await send(`/api/market/listings/${encodeURIComponent(b.dataset.buy)}/checkout`, 'POST', body);
    if (!j.embedded) { location.href = j.url; return; }
    const Stripe = await loadStripe();
    if (openCheckout) { openCheckout.destroy(); openCheckout = null; }
    let box = document.getElementById('mk-checkout');
    if (!box) { box = document.createElement('section'); box.id = 'mk-checkout'; box.className = 'mk-checkout'; box.setAttribute('aria-label', 'Payment'); (b.closest('.mk-pods') || b.closest('.mk-actions, .mk-pack, p') || b).after(box); }
    // Say exactly what is being bought, before any card is typed (Geoffrey, 2026-11-25: a shirt bought from the
    // shirt card arrived as the art alone, and nothing on the payment form showed which it was).
    box.innerHTML = '<div class="mk-checkout-head"><strong>Pay on Cohabi</strong><button type="button" class="btn ghost small" data-close-checkout>Close</button></div><p class="mk-checkout-what"></p><div id="mk-checkout-form"></div>';
    box.querySelector('.mk-checkout-what').textContent = buyingWhat(b, body);
    openCheckout = await Stripe(j.publishable_key).initEmbeddedCheckout({ fetchClientSecret: async () => j.client_secret });
    openCheckout.mount('#mk-checkout-form');
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    b.textContent = was; b.disabled = false;
  } catch (err) { b.disabled = false; b.textContent = was; alert(err.message); }
});
document.addEventListener('click', (e) => {
  if (!e.target.closest('[data-close-checkout]')) return;
  if (openCheckout) { openCheckout.destroy(); openCheckout = null; }
  document.getElementById('mk-checkout')?.remove(); // nothing was charged: the order stays unpaid and is never shown
});

// ---- Meet the makers: the "who made it" picker changes the page on its own
document.querySelectorAll('select[data-autosubmit]').forEach((s) => s.addEventListener('change', () => s.form.submit()));

// Arriving from a section tile's Buy (?buy=1): open checkout once for the listing's own Buy button, then drop the flag.
if (new URLSearchParams(location.search).get('buy') === '1') {
  const main = document.querySelector('[data-buy]:not([data-package]):not([data-amount-from]):not([data-merch]):not(.mk-card [data-buy])');
  const u = new URL(location.href); u.searchParams.delete('buy'); history.replaceState(null, '', u.pathname + u.search + u.hash);
  // A listing that also sells products (shirts…) never opens the art's checkout by itself: the buyer may have come for
  // a shirt. Take them to the products instead, and let them choose.
  const pods = document.querySelector('[data-pod]');
  if (pods) pods.scrollIntoView({ behavior: 'smooth', block: 'center' });
  else if (main && !main.disabled) main.click();
}

// Print on demand: pick a product, place your art, see a real Printful mockup (Ash's spec, 2026-11-21).
const merchBox = $('#mk-merch');
if (form && merchBox) {
  const cat = form.querySelector('[name=category]'); const on = $('#mf-on'); const body = $('#mf-body');
  const pSel = $('#mf-product'); const vSel = $('#mf-variant'); const mmsg = $('#mf-msg'); const img = $('#mf-img'); const base = $('#mf-base');
  let products = [];
  const fillVariants = () => { const p = products.find((x) => x.key === pSel.value); vSel.innerHTML = (p?.variants || []).map((v) => `<option value="${v.id}">${v.name.replace(/</g, '&lt;')} · from $${v.price.toFixed(2)}</option>`).join(''); };
  const show = () => { merchBox.hidden = !products.length || cat.value !== 'art'; body.hidden = !on.checked; };
  fetch('/api/merch/products', { headers: { 'X-Commons': '1' } }).then((r) => r.json()).then((j) => {
    products = j.products || [];
    pSel.innerHTML = products.map((p) => `<option value="${p.key}">${p.title.replace(/</g, '&lt;')}</option>`).join('');
    fillVariants(); show();
  }).catch(() => {});
  cat.addEventListener('change', show); on.addEventListener('change', () => { show(); if (on.checked) { form.querySelector('[name=price_mode]').value = 'fixed'; form.querySelector('[name=price_mode]').dispatchEvent(new Event('change')); } });
  pSel.addEventListener('change', () => { fillVariants(); delete form.dataset.mockup; img.hidden = true; base.hidden = true; });
  vSel.addEventListener('change', () => { delete form.dataset.mockup; img.hidden = true; });
  $('#mf-go').addEventListener('click', async () => {
    const art = form.querySelector('[name=mf_art]:checked'); if (!art) { mmsg.textContent = 'Pick your art first.'; return; }
    const pic = art.parentElement.querySelector('img'); const aspect = pic.naturalWidth && pic.naturalHeight ? pic.naturalWidth / pic.naturalHeight : 1;
    mmsg.textContent = 'Asking Printful for the mockup… this takes about half a minute.'; img.hidden = true; delete form.dataset.mockup;
    try {
      const t = await send('/api/merch/mockups', 'POST', { product: pSel.value, variant: Number(vSel.value), art: art.value, scale: $('#mf-scale').value / 100, y: $('#mf-y').value / 100, x: 0.5, aspect });
      for (let i = 0; i < 40; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        const r = await send(`/api/merch/mockups/${encodeURIComponent(t.task)}`, 'GET');
        if (r.status === 'completed') {
          img.src = r.url; img.hidden = false; form.dataset.mockup = t.task;
          base.textContent = `Printful's base cost: $${r.base_price.toFixed(2)}. Set your price above it; the difference is yours. Shipping is added at checkout.`; base.hidden = false;
          const amt = form.querySelector('[name=price_amount]'); amt.min = r.base_price; if (!amt.value || Number(amt.value) < r.base_price) amt.value = Math.ceil(r.base_price * 1.5);
          mmsg.textContent = 'Here it is. Adjust and try again, or fill in the rest and publish.'; return;
        }
      }
      mmsg.textContent = 'Printful is taking a while. Try again in a minute.';
    } catch (err) { mmsg.textContent = err.message; }
  });
}
