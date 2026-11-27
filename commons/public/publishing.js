/* Publishing Desk calculator (t_e50fd534c2) — live, read-only cost quotes via /api/publishing/quote.
   Nothing here can create a print job or move money. The co-op share is PROPOSED until the council votes,
   and every render says so. Falls back to the measured 2026-11-27 table when the live service is down. */
(() => {
  const form = document.getElementById('pub-calc'); if (!form) return;
  const out = document.getElementById('pub-result');
  const $ = (id) => document.getElementById(id);
  const usd = (v) => (v == null || !Number.isFinite(Number(v))) ? '—' : '$' + Number(v).toFixed(2);
  // Measured live 2026-11-27 (teams/income/lulu-pricing-2026-11-27.md): used only when the live quote fails.
  const CACHED = { PB: { per50: 1.25, base: 2.24 }, CW: { per50: 1.45, base: 9.48 }, ship: { MAIL: 5.69, EXPEDITED: 20.74 }, fulfill: 0.75 };
  const cachedPrint = (bind, pages) => Math.round((CACHED[bind].base + (pages / 50) * CACHED[bind].per50) * 100) / 100;

  function render(q, price, note) {
    const rows = [['Print', q.print_usd], ['Fulfillment', q.fulfillment_usd], ['Shipping (buyer pays this line at cost)', q.shipping_usd]];
    let split = '';
    if (price && Number.isFinite(price) && q.print_usd != null) {
      const cut = Math.round(price * 0.10 * 100) / 100;
      const card = Math.round(((price + (q.shipping_usd || 0)) * 0.029 + 0.30) * 100) / 100;
      const keep = Math.round((price - q.print_usd - (q.fulfillment_usd ?? 0.75) - cut - card) * 100) / 100;
      const below = q.floor_usd != null && price < q.floor_usd;
      split = `<h3 style="margin-bottom:4px">At your price of ${usd(price)}</h3>
        <table style="border-collapse:collapse"><tbody>
        <tr><td style="padding:2px 12px 2px 0">Print + fulfillment</td><td>−${usd((q.print_usd ?? 0) + (q.fulfillment_usd ?? 0.75))}</td></tr>
        <tr><td style="padding:2px 12px 2px 0">Co-op share (PROPOSED 10% — pending council vote)</td><td>−${usd(cut)}</td></tr>
        <tr><td style="padding:2px 12px 2px 0">Card processing (approx.)</td><td>−${usd(card)}</td></tr>
        <tr><td style="padding:2px 12px 2px 0"><strong>You keep (approx.)</strong></td><td><strong>${usd(keep)}</strong></td></tr>
        </tbody></table>
        ${below ? `<p style="color:#c0392b"><strong>Below the floor.</strong> The lowest list price for this spec is ${usd(q.floor_usd)}, so nobody sells at a loss.</p>` : ''}`;
    } else if (q.floor_usd != null) {
      split = `<p>Lowest list price for this spec: <strong>${usd(q.floor_usd)}</strong>. Enter a list price above to see your full split.</p>`;
    }
    out.innerHTML = `<h3 style="margin-bottom:4px">${q.spec.pages}-page ${q.spec.bind}, ${q.spec.trim} ${q.spec.color}</h3>
      <table style="border-collapse:collapse"><tbody>${rows.map(([k, v]) => `<tr><td style="padding:2px 12px 2px 0">${k}</td><td>${usd(v)}</td></tr>`).join('')}
      <tr><td style="padding:2px 12px 2px 0"><strong>Landed cost</strong></td><td><strong>${usd(q.total_usd)}</strong></td></tr></tbody></table>
      ${split}<p style="opacity:.8;font-size:.9em">${note}</p>`;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pages = parseInt($('pub-pages').value, 10), bind = $('pub-bind').value, level = $('pub-level').value;
    const price = parseFloat($('pub-price').value);
    out.textContent = 'Asking the printer…';
    try {
      const r = await fetch(`/api/publishing/quote?pages=${pages}&bind=${encodeURIComponent(bind)}&level=${encodeURIComponent(level)}`, { headers: { 'X-Commons': '1' } });
      const q = await r.json();
      if (!r.ok) throw new Error(q.error || `quote failed (${r.status})`);
      render(q, price, q.note || 'A live quote — costs only; no print job is created. Final prices are pending the council’s decision.');
    } catch (err) {
      // honest fallback: the measured table, clearly dated, never passed off as live
      const print = cachedPrint(bind, pages);
      const fallback = { spec: { trim: '6x9', color: 'B&W', bind: bind === 'CW' ? 'hardcover' : 'paperback', pages }, print_usd: print, fulfillment_usd: CACHED.fulfill, shipping_usd: CACHED.ship[level], total_usd: Math.round((print + CACHED.fulfill + CACHED.ship[level]) * 100) / 100, floor_usd: null };
      render(fallback, price, `The live quote service didn’t answer (${err.message}). These numbers are ESTIMATES interpolated from real quotes measured 2026-11-27 — not a live quote.`);
    }
  });
})();
