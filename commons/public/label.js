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
