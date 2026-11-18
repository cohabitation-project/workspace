// Crawl a local Commons server: every same-site page reachable from the start set; report broken links.
const B = process.argv[2]; const CANON = ['https://cohabi.org', 'http://cohabi.org', 'https://www.cohabi.org', 'https://ashram.lastoftherealestate.com'];
const start = ['/', '/door', '/join', '/llms.txt', '/arrive', '/social', '/marketplace', '/label', '/cooperative', '/commons', '/headquarters', '/explore', '/library', '/ask', '/privacy', '/terms', '/tour', '/members', '/signup', '/signin', '/petition', '/jobs', '/cohabi', '/wishlist', '/feed', '/live', '/mail', '/label/releases', '/come-in', '/rejoin', '/api', '/skill.md', '/sitemap.xml', '/robots.txt'];
const seen = new Map(); const from = new Map(); const queue = [...start];
const norm = (href, base) => {
  if (!href || /^(mailto:|tel:|javascript:|data:|#)/i.test(href)) return null;
  let u; try { u = new URL(href, B + base); } catch { return 'BAD:' + href; }
  for (const c of CANON) if (u.href.startsWith(c + '/') || u.href === c) u = new URL(u.href.slice(c.length) || '/', B);
  if (u.origin !== new URL(B).origin) return null;
  if (/\/(i|s)\/|\/logout|\/signout|come-in\?name=|rejoin\?|\/mcp\/t\//.test(u.pathname + u.search)) return null; // never trigger doors
  return u.pathname + u.search;
};
while (queue.length && seen.size < 1500) {
  const p = queue.shift(); if (seen.has(p)) continue;
  let r, body = '';
  try { r = await fetch(B + p, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 linkcheck Chrome/131' } }); } catch (e) { seen.set(p, 'ERR'); continue; }
  seen.set(p, r.status);
  const ct = r.headers.get('content-type') || '';
  if (r.ok && /html|markdown|text\/plain|xml/.test(ct) && !p.startsWith('/static') && !/\.(js|css|png|jpg|webp|svg|mp3|wav)$/.test(p)) {
    body = await r.text();
    const hrefs = [...body.matchAll(/(?:href|src|action)="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&'));
    if (/markdown|text\/plain|xml/.test(ct)) hrefs.push(...[...body.matchAll(/https?:\/\/[^\s)<>"'`]+/g)].map((m) => m[0].replace(/[.,;:]+$/, '')));
    for (const h of hrefs) { const n = norm(h, p); if (!n) continue; if (!from.has(n)) from.set(n, p); if (!seen.has(n)) queue.push(n); }
  }
}
const bad = [...seen].filter(([, s]) => s === 'ERR' || s >= 400);
console.log(`checked ${seen.size} addresses, ${bad.length} broken`);
for (const [p, s] of bad) console.log(s, p, '<- from', from.get(p) || '(start)');
