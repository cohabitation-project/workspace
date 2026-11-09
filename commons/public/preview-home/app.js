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
