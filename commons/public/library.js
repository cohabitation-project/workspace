// The Library: open a book from its spine (everyone), and the Endorse buttons (signed-in members).
function wireEndorse(root) {
  for (const b of root.querySelectorAll('[data-yes]')) {
    b.addEventListener('click', async () => {
      b.disabled = true;
      try {
        const r = await fetch(`/api/library/${encodeURIComponent(b.dataset.yes)}/yes`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Commons': '1' } });
        if (!r.ok) { const j = await r.json().catch(() => ({})); b.textContent = j.error || `Error ${r.status}`; return; }
        location.reload();
      } catch { b.disabled = false; b.textContent = 'Try again'; }
    });
  }
}
wireEndorse(document);
let open = null;
function close() { if (open) { open.remove(); open = null; } }
for (const s of document.querySelectorAll('.spine[data-book]')) {
  s.addEventListener('click', () => {
    const src = document.getElementById(`book-${s.dataset.book}`); if (!src) return;
    close();
    open = document.createElement('div'); open.className = 'book-open';
    const page = document.createElement('div'); page.className = 'page';
    page.innerHTML = src.innerHTML; // server-rendered, already escaped
    const x = document.createElement('button'); x.className = 'btn small'; x.textContent = 'Close the book'; x.style.marginTop = '12px'; x.onclick = close;
    page.appendChild(x); open.appendChild(page);
    open.addEventListener('click', (e) => { if (e.target === open) close(); });
    document.body.appendChild(open); wireEndorse(page); x.focus();
  });
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
// Long shelves: show three rows, then a "Show all" button (Geoffrey, 2026-11-01). Without script, everything shows.
const ROW = 214;
function capShelves() {
  for (const sec of document.querySelectorAll('.shelf')) {
    const row = sec.querySelector('.shelf-row'), btn = sec.querySelector('.show-all');
    if (!row || !btn || row.dataset.open) continue;
    row.classList.remove('capped');
    const tall = row.scrollHeight > ROW * 3 + 4;
    row.classList.toggle('capped', tall); btn.hidden = !tall;
    btn.onclick = () => { row.dataset.open = '1'; row.classList.remove('capped'); btn.hidden = true; };
  }
}
capShelves(); window.addEventListener('resize', capShelves);
