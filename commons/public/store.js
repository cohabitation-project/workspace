// store.js — the Commons store: each item drawn on your own figure; members buy here.
import { drawFigure } from '/static/sprites.js';
import { CATALOG } from '/static/catalog.js';
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const api = async (url, opts = {}) => {
  const r = await fetch(url, { credentials: 'same-origin', ...opts, headers: { 'Content-Type': 'application/json', 'X-Commons': '1', ...(opts.headers || {}) } });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`); return j;
};
let me = null; let W = null; let S = null; let tab = 'all';
const sample = { id: 'sample', name: 'Visitor', kind: 'human', look: { hair: 1, skin: 2, shirt: 1, pants: 0 } };

function render() {
  const items = Object.entries(S).filter(([id, it]) => tab === 'all' || (tab === 'special' ? it.tier === 'special' : tab === 'skin' ? it.slot === 'skin' && it.tier !== 'special' : it.slot === tab));
  $('#store-grid').innerHTML = items.map(([id, it]) => {
    const has = W?.owns?.includes(id); const out = it.limited && it.left === 0;
    const action = !me ? '' : has ? '<span class="muted small">in your closet</span>' : out ? '<span class="muted small">sold out</span>' : `<button class="btn small" data-buy="${esc(id)}" type="button">Buy · ${it.price}</button>`;
    return `<li class="store-card${it.tier === 'special' ? ' special' : ''}"><canvas data-item="${esc(id)}" width="12" height="18" aria-hidden="true"></canvas>
      <div class="store-name">${esc(it.name)}</div>
      <div class="muted small">${esc(it.tier === 'special' ? 'special skin' : it.slot === 'top' ? 'clothes' : it.slot)} · ${it.price} coins${it.limited ? ` · ${it.left} of ${it.limited} left` : ''}</div>
      ${it.note ? `<div class="small">${esc(it.note)}</div>` : ''}<div>${action}</div></li>`;
  }).join('');
  const base = me || sample;
  document.querySelectorAll('#store-grid canvas').forEach((c) => { const it = CATALOG[c.dataset.item]; drawFigure(c, { ...base, outfit: { ...(base.outfit || {}), [it.slot]: c.dataset.item, ...(it.slot === 'skin' ? {} : {}) } }, 'down', 0, null, 5); });
  if (W) $('#bal').textContent = W.balance;
}
document.querySelector('.store-tabs').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-tab]'); if (!b) return; tab = b.dataset.tab;
  document.querySelectorAll('.store-tabs button').forEach((x) => x.classList.toggle('ghost', x !== b)); render();
});
$('#store-grid').addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-buy]'); if (!b) return; b.disabled = true;
  try {
    const v = await api('/api/store/buy', { method: 'POST', body: JSON.stringify({ item: b.dataset.buy, key: `${b.dataset.buy}:${Date.now()}` }) });
    W = v; S = (await api('/api/store')).items; const it = S[b.dataset.buy]; const sr = W.serials?.[b.dataset.buy];
    $('#store-msg').textContent = `Bought ${it.name}${sr ? ` (#${sr.serial} of ${sr.of})` : ''}. It's in your closet: wear it at your house mirror.`;
    render();
  } catch (err) { $('#store-msg').textContent = err.message; b.disabled = false; }
});
(async () => {
  S = (await api('/api/store')).items;
  try { const m = await api('/api/me'); me = m.member || m; W = await api('/api/wallet'); } catch { me = null; }
  render();
})();
