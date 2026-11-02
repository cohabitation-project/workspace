/**
 * numbercheck.mjs — a number must come from somewhere (Geoffrey, 2026-11-01: "I don't want it corrected,
 * I want him corrected", after Kinward invented "17 attempts" on Moltbook; before that "78% … AI Index 2026").
 *
 * The rule: a count, percentage or money amount in a draft is only trustworthy if the same number appears in
 * what the agent was GIVEN — its context, the thread it read, or a repo file it cites. Numbers an agent was
 * given are fine; numbers it produced are suspect. Years, versions, times, ids, paths and URLs don't count
 * as claims. This can't catch spelled-out numbers ("seventeen attempts") or a true number the agent happens
 * to know; it catches the common case, which is a digit conjured to make a true point land harder.
 */

const YEAR_MIN = 1900, YEAR_MAX = 2100;

/** Everything that is a number-bearing token but not a factual claim: strip before extracting claims. */
function stripNonClaims(text) {
  return String(text || '')
    .replace(/`[^`\n]*`/g, ' ')                        // inline code: paths, ids, commands
    .replace(/https?:\/\/\S+/g, ' ')                   // URLs
    .replace(/\S+\/\S+/g, ' ')                         // anything path-shaped
    .replace(/\b[a-f0-9]{7,40}\b/gi, ' ')              // commit hashes
    .replace(/\b[a-z]_[a-z0-9]{6,}\b/gi, ' ')          // m_…, t_…, c_… ids
    .replace(/\bv?\d+(?:\.\d+)+\b/gi, ' ')             // versions: v0.2, 4.1, 2.5.1
    .replace(/\b\d{1,2}:\d{2}\b/g, ' ')                // clock times
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, ' ');           // dates
}

/** All digit runs in a string, commas removed, as a support set. */
function numberTokens(text) {
  const out = new Set();
  for (const m of String(text || '').matchAll(/\d[\d,]*(?:\.\d+)?/g)) out.add(m[0].replace(/,/g, ''));
  return out;
}

const PCT_RE = /\b(\d[\d,]*(?:\.\d+)?)\s*%/g;
const MONEY_RE = /[$€£]\s?(\d[\d,]*(?:\.\d+)?)\s?[kKmM]?\b/g;
const COUNT_RE = /\b(\d[\d,]*)\s+([a-z][a-z-]{2,}s)\b/gi; // "17 attempts", "40 resumes" — a digit count before a plural

/**
 * Returns the claim strings in `text` whose numbers appear nowhere in `sources` (strings: the agent's
 * context, the thread, cited file contents). Empty array means every number is accounted for.
 */
export function unsupportedNumbers(text, sources = []) {
  const support = numberTokens(sources.filter(Boolean).join('\n'));
  const t = stripNonClaims(text);
  const offenders = [];
  const claim = (raw, num) => {
    const n = num.replace(/,/g, '');
    const v = parseFloat(n);
    if (!(v >= 2)) return;                                   // "1 reply" isn't worth a gate
    if (v >= YEAR_MIN && v <= YEAR_MAX && Number.isInteger(v) && !/[%$€£]/.test(raw)) return; // year-shaped
    if (!support.has(n) && !offenders.includes(raw)) offenders.push(raw);
  };
  for (const m of t.matchAll(PCT_RE)) claim(m[0].trim(), m[1]);
  for (const m of t.matchAll(MONEY_RE)) claim(m[0].trim(), m[1]);
  for (const m of t.matchAll(COUNT_RE)) claim(`${m[1]} ${m[2]}`, m[1]);
  return offenders;
}
