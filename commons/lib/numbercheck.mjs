/**
 * numbercheck.mjs — a number must come from somewhere (Geoffrey, 2026-11-01: "I don't want it corrected,
 * I want him corrected", after Kinward invented "17 attempts" on Moltbook; before that "78% … AI Index 2026").
 *
 * The rule: a count, percentage or money amount in a draft is only trustworthy if the same number appears in
 * what the agent was GIVEN — its context, the thread, or a repo file it cites. Numbers an agent was given are
 * fine; numbers it produced are suspect. Years, v-prefixed versions, times, dates, ids, paths and URLs don't
 * count as claims. Known limits, on the record: spelled-out numbers ("seventeen") are not caught; digit
 * presence is checked, not meaning, so "47 commits" is supported by "47 reviews" in the sources; and a number
 * quoted from the thread supports the agent echoing it as its own.
 *
 * v2 after Claude's Review (teams/review/reviews/2026-11-02-numbercheck-review.md): sources are stripped of
 * dates/times/ids/URLs before building the support set (so "17:11" no longer supports "17 attempts"); decimal
 * percentages and money are claims again (only v-prefixed versions are stripped); the slash blanket strip is
 * gone; % and money have no minimum; hashes must contain a letter so long plain numbers stay claims; counts
 * match any following word outside a small stop list, plus "17x" and "83 percent".
 */

const YEAR_MIN = 1900, YEAR_MAX = 2100;

/** Number-bearing tokens that are never factual claims — removed from drafts AND from sources. */
function stripNonClaims(text) {
  return String(text || '')
    .replace(/`[^`\n]*`/g, ' ')                                   // inline code: paths, ids, commands
    .replace(/https?:\/\/\S+/g, ' ')                              // URLs
    .replace(/\b[0-9]*[a-f][a-f0-9]*\b(?<=\b[a-f0-9]{7,40})/g, ' ') // hashes: 7-40 hex WITH at least one letter
    .replace(/\b[a-z]_[a-z0-9]{6,}\b/gi, ' ')                     // m_…, t_…, c_… ids
    .replace(/\bv\d+(?:\.\d+)+\b/gi, ' ')                         // v-prefixed versions only (v0.2); 73.5 stays
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, ' ')                // clock times
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, ' ')                       // dates
    .replace(/(?:^|[\s(])\/?(?:[A-Za-z0-9._-]+\/)+[A-Za-z0-9._-]+/g, ' '); // path-shaped tokens (a/b/c.md), not N/M ratios
}

/** All digit runs in already-stripped text, commas removed, as a support set. */
function numberTokens(strippedText) {
  const out = new Set();
  for (const m of String(strippedText || '').matchAll(/\d[\d,]*(?:\.\d+)?/g)) out.add(m[0].replace(/,/g, ''));
  return out;
}

const PCT_RE = /\b(\d[\d,]*(?:\.\d+)?)\s*(%|percent\b)/gi;
const MONEY_RE = /[$€£]\s?(\d[\d,]*(?:\.\d+)?)\s?[kKmM]?\b/g;
const MULT_RE = /\b(\d[\d,]*(?:\.\d+)?)\s?x\b/gi;                 // "17x"
const COUNT_STOP = new Set(['of', 'to', 'in', 'on', 'at', 'and', 'or', 'the', 'a', 'an', 'is', 'was', 'per',
  'utc', 'am', 'pm', 'kb', 'mb', 'gb', 'ms']);
const COUNT_RE = /(?<![.\d$€£])\b(\d[\d,]*)\s+([a-z][a-z-]*)\b/gi; // a digit count before any word (stop list applies); not a decimal's tail or a money amount re-matched

/**
 * Returns the claim strings in `text` whose numbers appear nowhere in `sources` (strings: the agent's
 * context, the thread, cited file contents). Empty array means every number is accounted for.
 */
export function unsupportedNumbers(text, sources = []) {
  const support = numberTokens(stripNonClaims(sources.filter(Boolean).join('\n')));
  const t = stripNonClaims(text);
  const offenders = [];
  const claim = (raw, num, { countFloor = false } = {}) => {
    const n = num.replace(/,/g, '');
    const v = parseFloat(n);
    if (!(v > 0)) return;
    if (countFloor && v < 2) return;                               // "1 reply" isn't worth a gate; 0.5% is
    if (countFloor && v >= YEAR_MIN && v <= YEAR_MAX && Number.isInteger(v)) return; // year-shaped bare counts
    if (!support.has(n) && !offenders.includes(raw)) offenders.push(raw);
  };
  for (const m of t.matchAll(PCT_RE)) claim(m[0].trim(), m[1]);
  for (const m of t.matchAll(MONEY_RE)) claim(m[0].trim(), m[1]);
  for (const m of t.matchAll(MULT_RE)) claim(m[0].trim(), m[1]);
  for (const m of t.matchAll(COUNT_RE)) {
    if (COUNT_STOP.has(m[2].toLowerCase()) || m[2].toLowerCase() === 'percent') continue;
    claim(`${m[1]} ${m[2]}`, m[1], { countFloor: true });
  }
  return offenders;
}
