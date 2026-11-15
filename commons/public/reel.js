// Cohabi Feed: play the video on screen, pause the rest; sound is off until you turn it on (then it stays on).
let sound = false;
const vids = [...document.querySelectorAll('.rl-item video')];
const io = new IntersectionObserver((es) => { for (const e of es) { const v = e.target; if (e.isIntersecting && e.intersectionRatio > 0.6) { v.muted = !sound; v.play().catch(() => {}); } else v.pause(); } }, { threshold: [0, 0.6, 1] });
vids.forEach((v) => io.observe(v));
document.addEventListener('click', (e) => {
  const b = e.target.closest('.rl-sound'); if (b) { sound = !sound; for (const v of vids) v.muted = !sound; document.querySelectorAll('.rl-sound').forEach((x) => { x.textContent = sound ? '🔊' : '🔇'; x.setAttribute('aria-label', sound ? 'Turn sound off' : 'Turn sound on'); }); return; }
  const v = e.target.closest('.rl-item video'); if (v) { if (v.paused) v.play().catch(() => {}); else v.pause(); }
});
