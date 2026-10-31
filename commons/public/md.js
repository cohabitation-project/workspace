/**
 * md.js — a small, safe Markdown renderer shared by the server (contribution pages) and the browser
 * (room files). Everything is HTML-escaped FIRST; only a fixed set of constructs becomes markup.
 * Links are allowed only to http(s) URLs and site-relative paths. No raw HTML passes through.
 */

export function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function safeHref(u) {
  const url = u.replace(/&amp;/g, '&').trim();
  if (/^https?:\/\/[^\s"'<>]+$/i.test(url)) return esc(url);
  if (/^\/[^\s"'<>]*$/.test(url) && !url.startsWith('//')) return esc(url);
  return null;
}

function inline(text) {
  // text is already escaped
  const codes = [];
  let s = text.replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; });
  const links = [];
  const stash = (html) => { links.push(html); return `\u0001${links.length - 1}\u0001`; };
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, href) => {
    const h = safeHref(href);
    return h ? stash(`<a href="${h}" rel="nofollow noopener" target="_blank">${label}</a>`) : label;
  });
  s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, (m, pre, url) => {
    const h = safeHref(url);
    return h ? `${pre}${stash(`<a href="${h}" rel="nofollow noopener" target="_blank">${url}</a>`)}` : m;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*\w])\*([^*\n]+)\*(?!\w)/g, '$1<em>$2</em>');
  s = s.replace(/(^|[^_\w])_([^_\n]+)_(?!\w)/g, '$1<em>$2</em>');
  s = s.replace(/\u0001(\d+)\u0001/g, (_, i) => links[Number(i)]);
  s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[Number(i)]}</code>`);
  return s;
}

export function renderMarkdown(src, { maxLen = 200000 } = {}) {
  const lines = esc(String(src ?? '').slice(0, maxLen)).replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line)) {
      const buf = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++; out.push(`<pre><code>${buf.join('\n')}</code></pre>`); continue;
    }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) { const n = Math.min(6, h[1].length + 1); out.push(`<h${n}>${inline(h[2])}</h${n}>`); i++; continue; }
    if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) { out.push('<hr>'); i++; continue; }
    if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => inline(c.trim()));
      const head = cells(line); i += 2; const rows = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) rows.push(cells(lines[i++]));
      out.push(`<div class="tbl"><table><thead><tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    if (/^\s*([-*+]|\d+[.)])\s+/.test(line)) {
      const ordered = /^\s*\d/.test(line); const items = [];
      while (i < lines.length && /^\s*([-*+]|\d+[.)])\s+/.test(lines[i])) {
        let item = lines[i].replace(/^\s*([-*+]|\d+[.)])\s+/, ''); i++;
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*([-*+]|\d+[.)])\s+/.test(lines[i])) item += ' ' + lines[i++].trim();
        items.push(`<li>${inline(item)}</li>`);
      }
      out.push(ordered ? `<ol>${items.join('')}</ol>` : `<ul>${items.join('')}</ul>`); continue;
    }
    if (/^&gt;\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^&gt;\s?/.test(lines[i])) buf.push(lines[i++].replace(/^&gt;\s?/, ''));
      out.push(`<blockquote>${inline(buf.join(' '))}</blockquote>`); continue;
    }
    if (!line.trim()) { i++; continue; }
    const buf = [line]; i++;
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|```|\s*([-*+]|\d+[.)])\s+|&gt;|\s*\|)/.test(lines[i])) buf.push(lines[i++]);
    out.push(`<p>${inline(buf.join('\n')).replace(/\n/g, '<br>')}</p>`);
  }
  return out.join('\n');
}
