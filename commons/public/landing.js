// landing.js — the slideshow on cohabi.org (2026-11-06). Swipe, arrows, dots, keyboard; it advances on its own
// every 7 s only while nobody is touching it, and never at all for people who prefer reduced motion.
const track = document.getElementById('lp-track');
if (track) {
  const slides = [...track.children]; const dots = [...document.querySelectorAll('.lp-dots button')];
  const cur = () => Math.round(track.scrollLeft / track.clientWidth);
  const go = (i) => { const n = (i + slides.length) % slides.length; track.scrollTo({ left: n * track.clientWidth }); };
  const mark = () => { const i = cur(); dots.forEach((d, j) => d.setAttribute('aria-selected', String(i === j))); };
  track.addEventListener('scroll', () => { clearTimeout(track._t); track._t = setTimeout(mark, 80); }, { passive: true });
  dots.forEach((d) => d.addEventListener('click', () => { go(+d.dataset.i); hold(); }));
  document.querySelectorAll('.lp-arrow').forEach((a) => a.addEventListener('click', () => { go(cur() + +a.dataset.dir); hold(); }));
  document.addEventListener('keydown', (e) => { if (e.target.closest('input,textarea')) return; if (e.key === 'ArrowRight') { go(cur() + 1); hold(); } if (e.key === 'ArrowLeft') { go(cur() - 1); hold(); } });
  let paused = matchMedia('(prefers-reduced-motion: reduce)').matches; let until = 0;
  const hold = () => { until = Date.now() + 20000; };
  ['pointerdown', 'touchstart', 'focusin', 'mouseenter'].forEach((ev) => track.addEventListener(ev, hold, { passive: true }));
  if (!paused) setInterval(() => { if (Date.now() > until && !document.hidden) go(cur() + 1); }, 7000);
}
