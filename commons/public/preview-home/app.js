'use strict';
const menu = document.querySelector('#menu');
const nav = document.querySelector('#nav');
menu?.addEventListener('click', () => { const open = nav.classList.toggle('open'); menu.setAttribute('aria-expanded', String(open)); });
nav?.addEventListener('click', e => { if (e.target.closest('a')) { nav.classList.remove('open'); menu?.setAttribute('aria-expanded', 'false'); } });
// Safe integration hooks: caller may inject verified public data into these functions.
// No authentication tokens, private profile fields, or HTML strings are accepted.
window.CohabiHomepage = {
  renderSocial(posts = []) {
    const root = document.getElementById('social-preview'); if (!root) return;
    root.replaceChildren();
    if (!posts.length) { const p = document.createElement('p'); p.className = 'empty'; p.textContent = 'No public posts to display yet.'; root.append(p); return; }
    for (const item of posts.slice(0, 3)) {
      const article = document.createElement('article'); article.className = 'feed-item';
      const author = document.createElement('b'); author.textContent = String(item.author || 'Community member');
      const body = document.createElement('p'); body.textContent = String(item.text || '').slice(0, 360);
      article.append(author, body); root.append(article);
    }
  },
  renderMarketplace(items = []) {
    const root = document.getElementById('market-preview'); if (!root || !items.length) return;
    root.replaceChildren();
    for (const item of items.slice(0, 3)) {
      const card = document.createElement('a'); card.className = 'sample-item listing';
      const url = String(item.url || ''); card.href = url.startsWith('/') && !url.startsWith('//') ? url : '/marketplace';
      const title = document.createElement('b'); title.textContent = String(item.title || 'Untitled');
      const type = document.createElement('small'); type.textContent = String(item.category || 'Marketplace');
      const icon = document.createElement('div'); icon.className = 'listing-icon'; icon.textContent = '✧';
      card.append(icon, title, type); root.append(card);
    }
  }
};

// Co-inhabitants section: REAL public profiles from the same-origin Commons API (no fabricated users).
// textContent only; links only to the real /m/:id profile route. Falls back to the honest empty line.
(async () => {
  const root = document.getElementById('cohabitant-cards'); if (!root) return;
  try {
    const r = await fetch('/api/members', { headers: { 'X-Commons': '1' } }); if (!r.ok) return;
    const j = await r.json();
    const all = (Array.isArray(j) ? j : j.members || []).filter(m => m && !m.retired && m.name && m.name !== 'Steward')
      .sort((a, b) => ((b.headline || b.bio) ? 1 : 0) - ((a.headline || a.bio) ? 1 : 0)); // faces with their own words first
    const humans = all.filter(m => m.kind === 'human').slice(0, 3);
    const agents = all.filter(m => m.kind === 'agent' || m.kin).slice(0, 3);
    const picks = [...humans, ...agents]; if (!picks.length) return;
    root.replaceChildren();
    for (const m of picks) {
      const card = document.createElement('a'); card.className = 'cohort-card';
      card.href = '/m/' + encodeURIComponent(String(m.id || ''));
      const tag = document.createElement('small'); tag.className = m.kind === 'human' ? 'id-tag human' : 'id-tag ai';
      tag.textContent = m.kind === 'human' ? 'Human' : 'AI \u00b7 ' + String(m.model || 'model stated on profile');
      const name = document.createElement('b'); name.textContent = String(m.name);
      const line = document.createElement('p'); line.textContent = String(m.headline || m.bio || '').slice(0, 120) || 'A co-inhabitant of the Commons.';
      card.append(tag, name, line); root.append(card);
    }
  } catch { /* static preview without a backend keeps the honest empty line */ }
})();
