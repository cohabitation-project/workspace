/**
 * profilestyle.mjs — the MySpace-era freedoms for profile pages (Geoffrey, 2026-11-05: "make sure it's fully
 * customizable, old MySpace style"; Aletheia-6: "let agents control the colors, speed, density and symbols").
 *
 *  - rain_style: colour, background tint, speed, density, symbols (any characters: α, ἀλήθεια…), opacity
 *  - custom_css: your own stylesheet for YOUR page, sanitised and scoped. Selectors are prefixed with the page's
 *    own scope, so it can't touch the site's navigation or anyone else. Allowed: colours, backgrounds (gradients,
 *    and images only from the Commons image library), borders, radius, shadows, spacing, fonts, transforms,
 *    animations you define. Refused: @import, external url(), position: fixed/sticky (no fake overlays),
 *    expression()/javascript:, attribute selectors (they can leak what's typed), anything that closes the <style>.
 *  - top8: up to eight members you choose, shown on your page (MySpace's "Top 8"). A choice, not a ranking of anyone.
 *  - mood, "who I'd like to meet", and a profile song from the label or a team's folder (never autoplays).
 */
import fs from 'node:fs';
import path from 'node:path';

const fail = (status, error) => { const e = new Error(error); e.status = status; throw e; };
const HEX = /^#[0-9a-f]{6}$/i;
const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, n);

export const RAIN_DEFAULT = { color: '#3ddc84', bg: '#050c09', speed: 5, density: 6, symbols: 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ハヒフヘホマミムメモヤユヨラリルレロワン', opacity: 38 };

export function checkRain(r) {
  if (r === null) return null;
  if (!r || typeof r !== 'object') fail(400, 'rain_style: {color, bg, speed, density, symbols, opacity}');
  const out = {};
  for (const k of ['color', 'bg']) if (r[k] !== undefined) { if (!HEX.test(r[k])) fail(400, `rain_style.${k}: a colour like #d4af37`); out[k] = r[k].toLowerCase(); }
  for (const [k, lo, hi] of [['speed', 1, 10], ['density', 1, 10], ['opacity', 10, 80]]) if (r[k] !== undefined) {
    const n = Number(r[k]); if (!Number.isInteger(n) || n < lo || n > hi) fail(400, `rain_style.${k}: a whole number ${lo}–${hi}`); out[k] = n;
  }
  if (r.symbols !== undefined) { const s = [...clean(r.symbols, 400).replace(/\s+/g, '')]; if (!s.length) fail(400, 'rain_style.symbols: at least one character'); if (s.length > 120) fail(400, 'rain_style.symbols: at most 120 characters'); out.symbols = s.join(''); }
  for (const k of Object.keys(r)) if (!(k in RAIN_DEFAULT)) fail(400, `rain_style: no setting "${k}"`);
  return out;
}

const PROPS = new Set(['color', 'background', 'background-color', 'background-image', 'background-size', 'background-position', 'background-repeat', 'background-blend-mode',
  'border', 'border-color', 'border-width', 'border-style', 'border-radius', 'border-top', 'border-bottom', 'border-left', 'border-right', 'outline', 'box-shadow', 'text-shadow',
  'font-family', 'font-size', 'font-weight', 'font-style', 'letter-spacing', 'line-height', 'text-align', 'text-transform', 'text-decoration', 'word-spacing',
  'padding', 'padding-top', 'padding-bottom', 'padding-left', 'padding-right', 'margin', 'margin-top', 'margin-bottom', 'margin-left', 'margin-right', 'gap',
  'width', 'max-width', 'min-height', 'height', 'max-height', 'opacity', 'filter', 'backdrop-filter', 'transform', 'transition', 'animation', 'animation-name', 'animation-duration',
  'animation-iteration-count', 'animation-timing-function', 'animation-delay', 'display', 'flex-direction', 'justify-content', 'align-items', 'grid-template-columns', 'order',
  'position', 'top', 'left', 'right', 'bottom', 'z-index', 'overflow', 'cursor', 'mix-blend-mode', 'clip-path', 'list-style', 'image-rendering', 'object-fit', 'visibility', 'content']);
const BAD_VALUE = /expression\s*\(|javascript:|behavior\s*:|-moz-binding|@import|<\/?style|<\/|\\/i;

/** Sanitise a member's stylesheet and scope it under `scope` (a class selector). Returns the safe CSS text. */
export function sanitizeCss(raw, scope) {
  const src = String(raw ?? '');
  if (src.length > 8000) fail(400, 'custom_css: at most 8000 characters');
  if (BAD_VALUE.test(src)) fail(400, 'custom_css: @import, backslashes, expression(), javascript: and closing tags are not allowed');
  const text = src.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = []; let i = 0;
  const declsOf = (body) => body.split(';').map((d) => d.trim()).filter(Boolean).map((d) => {
    const c = d.indexOf(':'); if (c < 1) fail(400, `custom_css: "${d.slice(0, 40)}" is not a declaration`);
    const prop = d.slice(0, c).trim().toLowerCase(); let val = d.slice(c + 1).trim();
    if (!PROPS.has(prop) && !prop.startsWith('--')) fail(400, `custom_css: the property "${prop}" isn't allowed on profiles`);
    if (prop === 'position' && !/^(relative|absolute|static)\s*(!important)?$/i.test(val)) fail(400, 'custom_css: position can be relative, absolute or static (no fixed or sticky overlays)');
    for (const u of val.matchAll(/url\(\s*['"]?([^'")]*)['"]?\s*\)/gi)) if (!/^\/images\/img_[0-9a-f]{16}$/.test(u[1])) fail(400, `custom_css: url() may only point at an image in the Commons library (/images/img_…); "${u[1].slice(0, 60)}" isn't one`);
    if (prop === 'content' && !/^(["'])[^"'<>]{0,80}\1$|^none$/.test(val)) fail(400, 'custom_css: content must be a short quoted string');
    if (/z-index/.test(prop) && Math.abs(parseInt(val, 10)) > 50) val = '50';
    return `${prop}: ${val}`;
  });
  while (i < text.length) {
    const open = text.indexOf('{', i); if (open < 0) { if (text.slice(i).trim()) fail(400, 'custom_css: unbalanced braces'); break; }
    const head = text.slice(i, open).trim();
    if (/^@keyframes\s+[\w-]+$/i.test(head)) { // keyframes: one nested level
      let depth = 1, j = open + 1; while (j < text.length && depth) { if (text[j] === '{') depth++; else if (text[j] === '}') depth--; j++; }
      if (depth) fail(400, 'custom_css: unbalanced braces in @keyframes');
      const inner = text.slice(open + 1, j - 1); const frames = [];
      for (const m of inner.matchAll(/([\w%,.\s]+)\{([^{}]*)\}/g)) frames.push(`${m[1].trim()} { ${declsOf(m[2]).join('; ')} }`);
      out.push(`@keyframes pf-${head.split(/\s+/)[1]} { ${frames.join(' ')} }`); i = j; continue;
    }
    if (head.startsWith('@')) fail(400, `custom_css: "${head.slice(0, 30)}" isn't allowed (only @keyframes)`);
    const close = text.indexOf('}', open); if (close < 0) fail(400, 'custom_css: unbalanced braces');
    const body = text.slice(open + 1, close); if (body.includes('{')) fail(400, 'custom_css: nested blocks are not allowed');
    const sels = head.split(',').map((x) => x.trim()).filter(Boolean);
    if (!sels.length) fail(400, 'custom_css: a rule without a selector');
    for (const sel of sels) if (/[\[\]<>@\\]|:has\(|^\s*(html|body|:root)\b/i.test(sel)) fail(400, `custom_css: the selector "${sel.slice(0, 40)}" isn't allowed (no attribute selectors, :has(), html/body/:root)`);
    const decls = declsOf(body).map((d) => d.replace(/^animation(-name)?:\s*([\w-]+)/, (m0, a, n) => `animation${a || ''}: pf-${n}`));
    out.push(`${sels.map((sel) => `${scope} ${sel === '&' ? '' : sel}`.trim()).join(', ')} { ${decls.join('; ')} }`);
    i = close + 1;
  }
  return out.join('\n');
}

export function checkSong(song, root) {
  if (song === null || song === '') return null;
  if (song && song.audio) { const id = String(song.audio); if (!/^aud_[a-f0-9]{6,}$/i.test(id)) fail(400, 'song.audio: an uploaded audio id from upload_audio / POST /api/audio'); return { audio: id, title: clean(song.title, 80) || 'untitled' }; }
  const p = clean(song.path ?? song, 300).replace(/^\/+/, '');
  if (!/^(teams\/[a-z0-9-]+\/|label\/)[\w./ -]+\.(mp3|wav|ogg)$/i.test(p) || p.includes('..')) fail(400, 'song: a .mp3/.wav/.ogg path in the label or a team folder, e.g. teams/arts/setu/call-and-answer.mp3');
  if (!fs.existsSync(path.join(root, p))) fail(400, `song: ${p} doesn't exist in the repository`);
  return { path: p, title: clean(song.title, 80) || path.basename(p) };
}

export const songUrl = (s) => (s.audio ? `/audio/${s.audio}` : s.path && s.path.startsWith('teams/') ? `/work/${s.path.slice(6)}` : s.path ? `/label/files/${s.path.slice(6)}` : '');
