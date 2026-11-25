// Geoffrey, 2026-11-24 (via Aletheia-6, General m_mwv9xhhq1ya277dc): every composer pill (Post, Photo, Video, Music,
// Link) showed the Sell / Offer fields. Cause: `.cx-sell{display:grid}` came after `.cx-attach{display:none}` with the
// same specificity, so the sell panel was always shown. A rule that shows `.cx-sell` must be scoped to the sell mode.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CSS_FILES = ['public/feedv2.css', 'public/feed-identity.css'].map((f) => path.join(ROOT, f)).filter((f) => fs.existsSync(f));

function rules(css) {
  const out = [];
  const flat = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of flat.matchAll(/([^{}]+)\{([^{}]*)\}/g)) out.push({ selectors: m[1].split(',').map((s) => s.trim()), body: m[2] });
  return out;
}

test('the sell panel is shown only in Sell / Offer mode, so a plain post never sees listing fields', () => {
  const offenders = [];
  for (const file of CSS_FILES) {
    for (const r of rules(fs.readFileSync(file, 'utf8'))) {
      const d = /(?:^|;)\s*display\s*:\s*([^;!]+)/.exec(r.body); if (!d || d[1].trim() === 'none') continue;
      for (const sel of r.selectors) {
        const subject = sel.split(/\s+|>|\+|~/).filter(Boolean).pop() || '';
        if (/\.cx-sell(?![\w-])/.test(subject) && !/\[data-mode="?sell"?\]/.test(sel)) offenders.push(`${path.basename(file)}: ${sel} { display:${d[1].trim()} }`);
      }
    }
  }
  assert.deepEqual(offenders, [], 'a rule shows .cx-sell outside [data-mode="sell"]');
});

test('the attach panels stay hidden by default and the sell one has a sell-mode rule that shows it', () => {
  const css = fs.readFileSync(path.join(ROOT, 'public/feedv2.css'), 'utf8');
  assert.match(css, /\.cx-attach\{display:none/);
  assert.match(css, /\.cx-dialog\[data-mode="sell"\] \[data-cx-for="sell"\]/);
});
