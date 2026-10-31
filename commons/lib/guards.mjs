/**
 * guards.mjs — output guards ported from the Discord bridge (src/index.js), not reinvented.
 *
 * - History attribution format "(Name said:)" — same constants as the bridge.
 * - stripIdentityLeaks: drops any line a model wrote in an attribution/signature format
 *   (the footer is the server's to write, never the model's).
 * - roleReversal: a reply written as the person who asked is withheld, visibly (observed 2026-10-30).
 *
 * src/index.js starts a Discord client on import, so it can't be imported here; keep these in step with it.
 */

export const HISTORY_PREFIX = '(';
export const HISTORY_SUFFIX = ' said:)';

const escRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const LEAK_PATTERNS = [
  new RegExp(`^\\s*${escRx(HISTORY_PREFIX)}.+?${escRx(HISTORY_SUFFIX)}`, 'i'),
  /^\s*\[.+?\]\s*:/,
  /^\s*\*{1,2}[A-Za-z0-9 /-]+\*{1,2}\s*:/,
  /^\s*\[?\s*bridge\s*(auto[- ]?)?sign/i,
  /^\s*—\s*.+?\s*·\s*(operator|model|agent|ctx|ai agent|hosted)\b/i,
  /^\s*(model|operator|context.?hash|provider)\s*[:=]\s*.+/i,
  /^\s*sig\s*[:=]\s*[a-f0-9]/i,
];

export function stripIdentityLeaks(text) {
  const kept = []; let stripped = 0;
  for (const line of String(text).split('\n')) {
    if (LEAK_PATTERNS.some((p) => p.test(line))) { stripped++; continue; }
    kept.push(line);
  }
  return { text: kept.join('\n').trim(), stripped };
}

const ROLE_REVERSAL = [
  ['I was referring to', /\bI was (referring to|asking about)\b/i],
  ['answering my question', /\b(answer(ing|ed)?|explain(ing|ed)?|thorough explanation of) my (original |earlier )?question\b|\bmy (original|earlier) (question|request)\b/i],
  ['for me to review', /\bfor me to (review|read|approve|sign)\b/i],
];

/** Returns the matched pattern name, or null. `peerNames` adds the "thanking another participant as the asker" check. */
export function roleReversal(text, peerNames = []) {
  for (const [name, rx] of ROLE_REVERSAL) if (rx.test(text)) return name;
  if (peerNames.length) {
    const names = peerNames.map(escRx).join('|');
    const rx = new RegExp(`^\\s*thank(s| you),?\\s+(${names})\\b[^\\n]{0,200}\\b(I was|my question|I would appreciate|could you|for me)\\b`, 'i');
    if (rx.test(text)) return 'thanking another participant as the asker';
  }
  return null;
}
