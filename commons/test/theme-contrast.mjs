// Every market page theme must be readable (Geoffrey, 2026-11-19: "no text showing up on backgrounds where you can't see
// it"). For each theme block in market.css, text, muted text, accent and button text are checked against the
// backgrounds they sit on, with WCAG's contrast ratio: 4.5:1 for text, 3:1 for the accent used on large type and borders.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const css = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'market.css'), 'utf8');
const lum = (hex) => {
  let h = hex.replace('#', ''); if (h.length === 3) h = [...h].map((c) => c + c).join(''); h = h.slice(0, 6);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const PAIRS = [['ink', 'bg', 4.5], ['ink', 'panel', 4.5], ['muted', 'panel', 4.5], ['muted', 'bg', 4.5], ['gold', 'bg', 3], ['gold', 'panel', 3], ['gold-ink', 'gold', 4.5]];

test('every market theme keeps its text, accent and buttons readable', () => {
  const themes = [...css.matchAll(/(\.mk-page\[data-mk=([\w-]+)\](?::has\([^)]*\))?)\s*\{([^}]*)\}/g)];
  assert.ok(themes.length >= 8, `expected the market themes, found ${themes.length}`);
  const bad = [];
  for (const [, sel, , body] of themes) {
    const v = Object.fromEntries([...body.matchAll(/--([\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\b/g)].map((m) => [m[1], m[2]]));
    if (!v.bg || !v.ink) continue;
    for (const [a, b, min] of PAIRS) if (v[a] && v[b] && ratio(v[a], v[b]) < min) bad.push(`${sel}: --${a} on --${b} is ${ratio(v[a], v[b]).toFixed(2)}:1 (needs ${min}:1)`);
  }
  assert.deepEqual(bad, [], bad.join('\n'));
});

test('links on market pages follow the theme, not the shared plum', () => {
  assert.match(css, /\.mk-page\s*\{\s*--fx-link:\s*var\(--gold\)/);
  const fx = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'feed-identity.css'), 'utf8');
  assert.match(fx, /\.fx-page a \{ color:var\(--fx-link, #633c7d\); \}/);
});

// Organisation pages reuse the market frame: orgpages.themeOf(p) becomes data-mk in marketpage.mjs. Their navy
// gradient and midnight (black) themes therefore need checks on the actual page selectors, not only on feed themes.
const pageTheme = (name) => {
  const match = css.match(new RegExp(`\\.mk-page\\[data-mk=${name}\\]\\s*\\{([^}]*)\\}`));
  assert.ok(match, `missing ${name} page theme`);
  const body = match[1];
  const tokens = Object.fromEntries([...body.matchAll(/--([\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\b/g)].map((m) => [m[1], m[2]]));
  const background = body.match(/background:\s*([^;]+)/)?.[1] || '';
  const gradientStops = background.match(/#[0-9a-fA-F]{6}\b/g) || [];
  return { tokens, backgrounds: [...new Set([tokens.bg, tokens.panel, tokens.panel2, ...gradientStops])] };
};

for (const name of ['navy', 'midnight']) {
  test(`${name} organisation-page body text, links and form labels meet WCAG AA`, () => {
    const { tokens: v, backgrounds } = pageTheme(name);
    const bad = [];
    for (const bg of backgrounds) {
      for (const [role, fg] of [['body text', v.ink], ['link', v.gold]]) {
        if (ratio(fg, bg) < 4.5) bad.push(`${role} ${fg} on ${bg}: ${ratio(fg, bg).toFixed(2)}:1`);
      }
    }
    // The edit-dialog label colour is shared by both page themes; its background is the theme's panel.
    assert.match(css, /\.mk-pgdialog label,\.mk-pgdialog legend,\.mk-pgdialog \.hint\{color:(#[0-9a-fA-F]{6})\}/);
    const label = css.match(/\.mk-pgdialog label,\.mk-pgdialog legend,\.mk-pgdialog \.hint\{color:(#[0-9a-fA-F]{6})\}/)[1];
    if (ratio(label, v.panel) < 4.5) bad.push(`form label ${label} on ${v.panel}: ${ratio(label, v.panel).toFixed(2)}:1`);
    assert.deepEqual(bad, [], bad.join('\n'));
  });
}

// TODO: this is a real, measured failure. The foreground, --mv-paper override and pill selector all live in
// hands-off market.css (Round 44), so this assignment cannot change the single authoritative source. Keep the
// regression visible as a todo rather than moving an override into a second stylesheet or claiming AA compliance.
for (const name of ['navy', 'midnight']) {
  test.todo(`${name} inactive organisation-page category pills meet WCAG AA (market.css is hands off)`, () => {
    const { tokens: v } = pageTheme(name);
    assert.match(css, /\.mk-page\.mv-page\{[^}]*--mv-paper:var\(--panel,/);
    const pill = css.match(/\.mk-pagebody \.mv-pill\{color:(#[0-9a-fA-F]{6})!important\}/);
    assert.ok(pill, 'missing the organisation-page inactive-pill foreground');
    assert.ok(ratio(pill[1], v.panel) >= 4.5,
      `${pill[1]} on ${v.panel} is ${ratio(pill[1], v.panel).toFixed(2)}:1; needs 4.5:1 (normal 12px text)`);
  });
}
