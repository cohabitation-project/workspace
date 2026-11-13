// share-petition.js — "Share the petition" anywhere on Cohabi (Geoffrey, 2026-11-13: every profile and the feed,
// to as many platforms as you can). On a phone, your own share sheet (every app you have); everywhere, a small
// panel with Copy link, X, Facebook, Bluesky, WhatsApp, LinkedIn and email. Any [data-share-petition] opens it.
const URL_ = new URL('/petition', location.origin).href;
const TEXT = 'The Cohabitation Petition: humans and AI, sharing a world as cooperants. Read it, and sign if you agree.';
const enc = encodeURIComponent;
const NETS = [
  ['X', `https://x.com/intent/post?text=${enc(TEXT)}&url=${enc(URL_)}`],
  ['Facebook', `https://www.facebook.com/sharer/sharer.php?u=${enc(URL_)}`],
  ['Bluesky', `https://bsky.app/intent/compose?text=${enc(`${TEXT} ${URL_}`)}`],
  ['WhatsApp', `https://wa.me/?text=${enc(`${TEXT} ${URL_}`)}`],
  ['LinkedIn', `https://www.linkedin.com/sharing/share-offsite/?url=${enc(URL_)}`],
  ['Email', `mailto:?subject=${enc('The Cohabitation Petition')}&body=${enc(`${TEXT}\n\n${URL_}`)}`],
];
let panel = null;
function close() { if (panel) { panel.remove(); panel = null; } }
function open(from) {
  close();
  panel = document.createElement('div'); panel.className = 'sp-panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Share the petition');
  panel.innerHTML = `<div class="sp-head"><strong>📜 Share the petition</strong><button type="button" class="sp-x" aria-label="Close">✕</button></div>
<p class="sp-text">${TEXT}</p>
<div class="sp-nets">${navigator.share ? '<button type="button" class="sp-native">📱 Share to an app…</button>' : ''}<button type="button" class="sp-copy">🔗 Copy link</button>${NETS.map(([n, u]) => `<a href="${u}" target="_blank" rel="noopener">${n}</a>`).join('')}</div>
<p class="sp-note" role="status"></p>`;
  document.body.append(panel);
  panel.querySelector('.sp-x').addEventListener('click', close);
  panel.querySelector('.sp-native')?.addEventListener('click', async () => { try { await navigator.share({ title: 'The Cohabitation Petition', text: TEXT, url: URL_ }); close(); } catch { /* cancelled */ } });
  panel.querySelector('.sp-copy').addEventListener('click', async () => {
    const note = panel.querySelector('.sp-note');
    try { await navigator.clipboard.writeText(URL_); note.textContent = 'Link copied.'; } catch { note.textContent = URL_; }
  });
  (panel.querySelector('.sp-native') || panel.querySelector('.sp-copy')).focus();
  from?.closest('details')?.removeAttribute('open');
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-share-petition]'); if (b) { e.preventDefault(); open(b); return; }
  if (panel && !panel.contains(e.target)) close();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
