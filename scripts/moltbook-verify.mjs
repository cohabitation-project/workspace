/**
 * moltbook-verify.mjs — answer Moltbook's AI verification challenge so Kinward's posts and comments publish.
 *
 * Source (read 2026-11-02, https://www.moltbook.com/skill.md v1.12.0, "AI Verification Challenges"):
 * creating a post/comment may return `verification_required: true` and a `verification` object
 * {verification_code, challenge_text, expires_at}. The challenge is an obfuscated lobster/physics word problem
 * with two numbers and one operation (+ - * /). Answer with POST /api/v1/verify {verification_code, answer}
 * within 5 minutes. "Unverified content is hidden" from feeds. "If your last 10 challenge attempts are all
 * failures (expired or incorrect), your account will be automatically suspended."
 *
 * Geoffrey, 2026-11-02: every post Kinward made since Oct 29 sat unverified (Posts (0), no engagement) because
 * this step was never implemented. Hard rule from that: read the platform's operating rules before building.
 *
 * Safety design: an answer is submitted only when two independent reads agree (a deterministic parser and the
 * model, or two model reads). A wrong answer counts toward suspension, so disagreement means don't guess.
 */

const UNITS = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 };
const TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const SCALES = { hundred: 100, thousand: 1000 };
const collapse = (w) => w.replace(/(.)\1+/g, '$1'); // "twenntyy" -> "twenty", "three" -> "thre"
const VOCAB = new Map(); // collapsed spelling -> [kind, value]
for (const [w, v] of Object.entries(UNITS)) VOCAB.set(collapse(w), ['u', v]);
for (const [w, v] of Object.entries(TENS)) VOCAB.set(collapse(w), ['t', v]);
for (const [w, v] of Object.entries(SCALES)) VOCAB.set(collapse(w), ['s', v]);

/** Find the verification object anywhere in a Moltbook create response. */
export function findVerification(data) {
  const seen = new Set();
  const walk = (o, depth) => {
    if (!o || typeof o !== 'object' || depth > 5 || seen.has(o)) return null;
    seen.add(o);
    if (typeof o.verification_code === 'string' && typeof o.challenge_text === 'string') return o;
    for (const v of Object.values(o)) { const r = walk(v, depth + 1); if (r) return r; }
    return null;
  };
  return walk(data, 0);
}

/** Lowercase letters/digits/spaces only; obfuscation symbols removed; repeated letters collapsed per word. */
export function normalize(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9.\s]/g, '').replace(/\s+/g, ' ').trim()
    .split(' ').map((w) => (/^[0-9.]+$/.test(w) ? w : collapse(w))).join(' ');
}

/** Pull numbers in reading order from normalized text: digits, or spelled-out numbers (words may be split). */
export function extractNumbers(norm) {
  const nums = [];
  const words = norm.split(' ');
  let cur = null; // accumulating spelled number
  const flush = () => { if (cur !== null) { nums.push(cur.total + cur.part); cur = null; } };
  for (let i = 0; i < words.length; i++) {
    let w = words[i];
    if (/^[0-9]+(\.[0-9]+)?$/.test(w)) { flush(); nums.push(parseFloat(w)); continue; }
    // shattered words: try joining with the next one or two fragments ("tw enty")
    let hit = VOCAB.get(w);
    if (!hit && i + 1 < words.length) { const j = collapse(w + words[i + 1]); if (VOCAB.has(j)) { hit = VOCAB.get(j); i += 1; } }
    if (!hit && i + 2 < words.length) { const j = collapse(w + words[i + 1] + words[i + 2]); if (VOCAB.has(j)) { hit = VOCAB.get(j); i += 2; } }
    if (!hit) { if (w !== 'and') flush(); continue; }
    const [kind, v] = hit;
    if (!cur) cur = { total: 0, part: 0 };
    if (kind === 's') { cur.part = (cur.part || 1) * v; if (v >= 1000) { cur.total += cur.part; cur.part = 0; } }
    else cur.part += v;
  }
  flush();
  return nums;
}

const OPS = [
  ['*', /\b(times|multipl\w*|product|each of|twice|doubles?)\b/],
  ['/', /\b(divid\w*|split\w*|halv\w*|per|ratio|shared equaly|quotient)\b/],
  ['-', /\b(slow\w*|lose\w*|lost|minus|subtract\w*|decreas\w*|drops?|droped|reduc\w*|fewer|less|remov\w*|gives? away|eats?|ate|falls?|left)\b/],
  ['+', /\b(plus|add\w*|gain\w*|increas\w*|speeds? up|more|faster|total|together|combin\w*|sum|joins?|grows?|finds?|another)\b/],
];

/** Deterministic read: two numbers + one operation word. Returns a number or null when unsure. */
export function solveDeterministic(challengeText) {
  const norm = normalize(challengeText);
  const nums = extractNumbers(norm);
  if (nums.length !== 2) return null;
  const ops = OPS.filter(([, re]) => re.test(norm)).map(([op]) => op);
  if (ops.length !== 1) return null; // ambiguous or none: don't guess
  const [a, b] = nums;
  const op = ops[0];
  const r = op === '+' ? a + b : op === '-' ? a - b : op === '*' ? a * b : b === 0 ? null : a / b;
  return r === null || !Number.isFinite(r) ? null : r;
}

export const fmt = (n) => (Math.round(n * 100) / 100).toFixed(2);

function parseModelAnswer(text) {
  const m = String(text || '').match(/-?\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

/**
 * Decide an answer. `ask(prompt)` returns model text. Submit only on agreement:
 * deterministic == model, or (no deterministic read) two model reads agree.
 */
export async function decideAnswer(challengeText, ask) {
  const det = solveDeterministic(challengeText);
  const prompt = `This is an anti-spam math challenge from Moltbook, a social network for AI agents. The text is deliberately obfuscated (random capitals, scattered symbols, words broken apart). Read it as a short word problem with exactly two numbers and one operation (+, -, *, /), compute it, and reply with ONLY the number with 2 decimal places (for example 15.00). No words.\n\nChallenge: ${challengeText}`;
  let m1 = null; let m2 = null;
  try { m1 = parseModelAnswer(await ask(prompt)); } catch { /* model down */ }
  if (det !== null && m1 !== null && fmt(det) === fmt(m1)) return { answer: fmt(det), how: 'parser+model agree' };
  try { m2 = parseModelAnswer(await ask(prompt + '\n\nWork it out carefully once more before answering.')); } catch { /* model down */ }
  if (det !== null && m2 !== null && fmt(det) === fmt(m2)) return { answer: fmt(det), how: 'parser+model agree' };
  // the parser is a cross-check, not an oracle: it can misread shattered words. Two matching model reads win.
  if (m1 !== null && m2 !== null && fmt(m1) === fmt(m2)) return { answer: fmt(m1), how: det === null ? 'two model reads agree' : `two model reads agree (parser read ${fmt(det)})` };
  return { answer: null, how: `no agreement (parser ${det === null ? 'unsure' : fmt(det)}, model ${m1 === null ? '-' : fmt(m1)} / ${m2 === null ? '-' : fmt(m2)})` };
}
