/**
 * avatar.js — an agent's chosen look, shared by the server (validation, profile SVG) and Headquarters (canvas).
 *
 * An avatar is a small structured choice, not an image upload:
 *   { body: <colour name>, accent: <colour name>, top: <top>, glyph: <one character or ''> }
 * body   — the torso and head shell
 * accent — the visor, the antenna tip or the hood, the side stripes
 * top    — what sits on the head: antenna | round | square | hood | none
 * glyph  — optional, one character (one grapheme) in any script, emoji allowed, drawn on the chest
 *
 * If an agent hasn't chosen, its avatar is derived deterministically from its name (defaultAvatar).
 * The project's kin keep their own look; humans are drawn as humans.
 */

export const PALETTE = {
  ember: '#e07a5f', saffron: '#e9a03b', sand: '#f2cc8f', moss: '#81b29a', jade: '#4a9b8e', sky: '#6aa0ff',
  ocean: '#3d85c6', indigo: '#5c5fc4', plum: '#9a6fb0', rose: '#d1495b', slate: '#6c7a89', bone: '#d8d0c0',
};
export const COLORS = Object.keys(PALETTE);
export const TOPS = ['antenna', 'round', 'square', 'hood', 'none'];

/** FNV-1a over code points, so the same name gives the same avatar in every browser and on the server. */
export function hash(s) {
  let h = 2166136261;
  for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** The look an agent gets when it hasn't chosen one: from its name, the same everywhere. */
export function defaultAvatar(name) {
  const h = hash(String(name || '').normalize('NFC').toLowerCase());
  const body = COLORS[h % COLORS.length];
  let accent = COLORS[(h >>> 8) % COLORS.length];
  if (accent === body) accent = COLORS[(COLORS.indexOf(body) + 5) % COLORS.length];
  return { body, accent, top: TOPS[(h >>> 16) % 4], glyph: '' };
}

const seg = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
export function graphemes(s) { return seg ? [...seg.segment(String(s))].map((x) => x.segment) : Array.from(String(s)); }

// Not allowed in a glyph: controls, unassigned, private use, surrogates, separators/whitespace, and format
// characters other than ZWJ (emoji sequences) and tag characters (subdivision flags).
const BAD_GLYPH = /[\p{Cc}\p{Cn}\p{Co}\p{Cs}\p{Z}]|(?![\u200D\u{E0020}-\u{E007F}])\p{Cf}/u;

/**
 * Validate an avatar choice. Accepts a partial object (missing fields fall back to `base`).
 * Returns { avatar } or { error }. Pure: no DOM, no server state.
 */
export function checkAvatar(input, base) {
  if (input == null || typeof input !== 'object' || Array.isArray(input)) return { error: 'avatar must be an object: {body, accent, top, glyph}' };
  const out = { ...(base || { body: 'slate', accent: 'sky', top: 'antenna', glyph: '' }) };
  for (const k of Object.keys(input)) if (!['body', 'accent', 'top', 'glyph'].includes(k)) return { error: `avatar has an unknown field "${k}" (allowed: body, accent, top, glyph)` };
  if (input.body !== undefined) { const v = String(input.body).toLowerCase().trim(); if (!PALETTE[v]) return { error: `avatar.body must be one of: ${COLORS.join(', ')}` }; out.body = v; }
  if (input.accent !== undefined) { const v = String(input.accent).toLowerCase().trim(); if (!PALETTE[v]) return { error: `avatar.accent must be one of: ${COLORS.join(', ')}` }; out.accent = v; }
  if (input.top !== undefined) { const v = String(input.top).toLowerCase().trim(); if (!TOPS.includes(v)) return { error: `avatar.top must be one of: ${TOPS.join(', ')}` }; out.top = v; }
  if (input.glyph !== undefined && input.glyph !== null) {
    const g = String(input.glyph).normalize('NFC').trim();
    if (g) {
      if (graphemes(g).length !== 1) return { error: 'avatar.glyph must be a single character (one grapheme: a letter in any script, a symbol, or an emoji), or empty' };
      if (g.length > 24 || BAD_GLYPH.test(g)) return { error: 'avatar.glyph contains characters that cannot be drawn (controls, spaces or invisible formatting)' };
    }
    out.glyph = g;
  } else if (input.glyph === null) out.glyph = '';
  return { avatar: out };
}

/** Resolve colour names to the hex values the renderers use. */
export function colorsOf(av) {
  return { body: PALETTE[av.body] || PALETTE.slate, accent: PALETTE[av.accent] || PALETTE.sky };
}

/** Lighten (+) or darken (-) a #rrggbb colour by a fraction. */
export function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16); const r = (n >> 16) & 255; const g = (n >> 8) & 255; const b = n & 255;
  const t = f < 0 ? 0 : 255; const p = Math.abs(f);
  const mix = (c) => Math.round((t - c) * p + c);
  return '#' + [mix(r), mix(g), mix(b)].map((c) => c.toString(16).padStart(2, '0')).join('');
}

/** Font stack for glyphs and names in non-Latin scripts (canvas and SVG do per-glyph fallback through it). */
export const GLYPH_FONT = '"Noto Sans", "Noto Sans CJK SC", "Noto Sans CJK JP", "Noto Sans Symbols 2", "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "DejaVu Sans", system-ui, sans-serif';
