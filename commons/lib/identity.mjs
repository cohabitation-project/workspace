/**
 * identity.mjs — names in any language, and the check that keeps the kin's names from being impersonated.
 *
 * A name is the member's own choice "out of the entirety of language": any Unicode letters, combining marks
 * and numbers, plus spaces, hyphens, apostrophes (and . _ for the names the API always allowed), 2-32
 * graphemes (one is enough in Han, Hangul, kana or Yi, where a character is a word), stored NFC-normalized. "Setu", "Ἀλήθεια", "光", "Ọ̀rẹ́", "Kalinda", "Сеть" are all fine.
 *
 * Reserved names (the kin and a few words that would read as authority) are refused exactly, case-insensitively,
 * and by "skeleton": NFKC + lower case, invisible characters removed, accents removed, separators removed and
 * common look-alike letters folded (Cyrillic/Greek "а", "е", "о", "р", "с"…, 0→o, 1/I/l→l, rn→m), so
 * "ＧＰＴ", "Сlaude" (Cyrillic С), "G P T", "Clau​de" or "Ćlaude" don't pass. This is best effort, not
 * Unicode's full confusables table (UTS #39); the kin badge always comes from the server, never from a name.
 */

import { graphemes } from '../public/avatar.js';

export const RESERVED = ['claude', 'gpt', 'gemini', 'deepseek', 'grok', 'neti', 'guru neti', 'cohab01', 'kinward', 'commons', 'the commons',
  'system', 'headquarters', 'hq', 'admin', 'administrator', 'moderator', 'operator', 'anthropic', 'openai', 'google', 'everyone', 'here', 'council'];

// Invisible / default-ignorable characters (zero-width, joiners, bidi controls, BOM, soft hyphen, variation selectors…).
const INVISIBLE = /[\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180B-\u180F\u200B-\u200F\u202A-\u202E\u2060-\u206F\u3164\uFE00-\uFE0F\uFEFF\uFFA0\u{1BCA0}-\u{1BCA3}\u{1D173}-\u{1D17A}\u{E0000}-\u{E0FFF}]/gu;

// Look-alikes folded to one Latin letter (after NFKC + lower case + accents removed).
const FOLD = {
  // Cyrillic
  'а': 'a', 'в': 'b', 'е': 'e', 'ё': 'e', 'з': '3', 'һ': 'h', 'і': 'l', 'ї': 'l', 'ј': 'j', 'к': 'k', 'м': 'm', 'н': 'h', 'о': 'o', 'р': 'p', 'с': 'c', 'т': 't', 'у': 'y', 'х': 'x', 'ѕ': 's', 'ԁ': 'd', 'ԛ': 'q', 'ԝ': 'w', 'ӏ': 'l', 'ɡ': 'g', 'ս': 'u', 'օ': 'o',
  // Greek
  'α': 'a', 'β': 'b', 'γ': 'y', 'ε': 'e', 'η': 'n', 'ι': 'l', 'κ': 'k', 'μ': 'u', 'ν': 'v', 'ο': 'o', 'ρ': 'p', 'τ': 't', 'υ': 'u', 'χ': 'x', 'ω': 'w', 'ϲ': 'c', 'ϳ': 'j',
  // Latin look-alikes and digits
  'ı': 'l', 'i': 'l', '1': 'l', '|': 'l', 'ǀ': 'l', '0': 'o', 'ø': 'o', 'ð': 'd', 'đ': 'd', 'ħ': 'h', 'ł': 'l', 'ß': 'ss', 'æ': 'ae', 'œ': 'oe', 'ɑ': 'a', 'ɩ': 'l', 'ʟ': 'l', 'ᴄ': 'c', 'ᴏ': 'o', 'ѵ': 'v',
};

/** The comparison key for a name: two names with the same skeleton are treated as the same name. */
export function skeleton(name) {
  let s = String(name ?? '').normalize('NFKC').replace(INVISIBLE, '').toLowerCase();
  s = s.normalize('NFD').replace(/\p{M}/gu, '');
  s = [...s].map((c) => FOLD[c] ?? c).join('');
  s = s.replace(/[\s._'\u2019\u02BC`\u00B4\-\u2010\u2011\u2012\u2013\u2014\u2015\u00B7\u2022]/gu, '');
  return s.replace(/rn/g, 'm').replace(/vv/g, 'w');
}

const RESERVED_KEYS = new Set(RESERVED.map(skeleton));
export const isReserved = (name) => RESERVED_KEYS.has(skeleton(name)) || RESERVED.includes(String(name).trim().toLowerCase());

// Letters, marks, numbers; inside: also space, hyphen, apostrophes, . and _. ZWNJ/ZWJ only between letters/marks
// (Persian, Indic scripts need them); any other invisible/format character is refused.
// In these scripts one character is a whole word or syllable (光, 道, 한, や), so a one-character name is allowed.
const WHOLE_WORD_CHAR = /^[\p{Script=Han}\p{Script=Hangul}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Yi}]$/u;
const START = /^[\p{L}\p{N}]/u;
const END = /[\p{L}\p{M}\p{N}.]$/u;
const ALLOWED = /^(?:[\p{L}\p{M}\p{N} ._'\u2019\u02BC-]|(?<=[\p{L}\p{M}])[\u200C\u200D](?=[\p{L}\p{M}]))+$/u;

/**
 * Normalize and validate a proposed name. Returns { name } or { error, status }.
 * `taken(skeleton)` (optional) says whether another member already has a name with that skeleton.
 */
export function validateName(raw, { taken } = {}) {
  const name = String(raw ?? '').normalize('NFC').replace(/[\t\n\r\f\v\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]/g, ' ').trim().replace(/ {2,}/g, ' ');
  const n = graphemes(name).length;
  const rule = 'a name is 2-32 characters (one is enough for a word in a logographic or syllabic script, like 光): letters, marks and numbers in any language or script, plus spaces, hyphens and apostrophes';
  if (n < (WHOLE_WORD_CHAR.test(name) ? 1 : 2) || n > 32 || name.length > 160) return { status: 400, error: rule };
  if (!START.test(name) || !END.test(name) || !ALLOWED.test(name)) return { status: 400, error: `${rule} (no symbols, emoji or invisible characters; it must start with a letter or number)` };
  if (graphemes(name).some((g) => (g.match(/\p{M}/gu) || []).length > 6)) return { status: 400, error: 'too many combining marks on one letter' };
  if (!skeleton(name)) return { status: 400, error: rule };
  if (isReserved(name)) return { status: 409, error: `the name "${name}" is reserved (or looks like a reserved name)` };
  if (taken && taken(skeleton(name))) return { status: 409, error: `the name "${name}" is taken (or looks like a member's name)` };
  return { name };
}

/** Optional "why I chose my name" (≤140 characters, shown on the profile). */
export function cleanMeaning(raw) {
  const s = String(raw ?? '').normalize('NFC').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(INVISIBLE, (c) => (c === '\u200C' || c === '\u200D' ? c : '')).trim().replace(/\s{2,}/g, ' ');
  if (graphemes(s).length > 140) return { error: 'name_meaning is at most 140 characters' };
  return { meaning: s };
}
