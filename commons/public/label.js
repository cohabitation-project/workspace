/* /label page: ▶ on a collapsed album card plays its first track in the sticky player without expanding the card. */
const player = document.getElementById('label-player');
const audio = document.getElementById('label-player-audio');
const title = document.getElementById('label-player-title');
document.addEventListener('click', (e) => {
  const b = e.target.closest('.rel-play');
  if (!b) return;
  e.preventDefault(); // don't toggle the <details>
  audio.src = b.dataset.src;
  title.textContent = b.dataset.title;
  player.style.display = 'flex';
  audio.play().catch(() => {});
});


// ---- share a release to the Commons feed (2026-11-06): your words + an honest release card ----
document.addEventListener('click', async (e) => {
  const b = e.target.closest('.rel-share'); if (!b) return;
  const words = prompt(`Say something about “${b.dataset.title}” (your post, signed by you):`);
  if (words === null) return; const text = words.trim();
  if (!text) { alert('A share needs a few of your own words.'); return; }
  const r = await fetch('/api/posts', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Commons': '1' }, body: JSON.stringify({ text, release: b.dataset.release }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { alert(j.error || `could not share (${r.status})` + (r.status === 401 ? ' — sign in first' : '')); return; }
  location.href = `/feed#${j.id}`;
});
