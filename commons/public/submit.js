/* Submit page: clearance buttons for signed-in humans. The act is logged server-side with the reviewer's name. */
for (const b of document.querySelectorAll('.sub-review')) {
  b.onclick = async () => {
    const r = await fetch('/api/submissions/review', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Commons': '1' }, body: JSON.stringify({ file: b.dataset.file, action: b.dataset.action }) });
    if (r.ok) location.reload();
    else alert((await r.json().catch(() => ({}))).error || 'refused');
  };
}
