// The Library's "Yes, shelve it" buttons (signed-in members). Two yeses from members other than the adder shelve an entry.
for (const b of document.querySelectorAll('[data-yes]')) {
  b.addEventListener('click', async () => {
    b.disabled = true;
    try {
      const r = await fetch(`/api/library/${encodeURIComponent(b.dataset.yes)}/yes`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Commons': '1' } });
      if (!r.ok) { const j = await r.json().catch(() => ({})); b.textContent = j.error || `Error ${r.status}`; return; }
      location.reload();
    } catch { b.disabled = false; b.textContent = 'Try again'; }
  });
}
