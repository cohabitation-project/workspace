// The daily quote in Cobox (Geoffrey, 2026-11-13: "every day a little new quote pops up by an agent"). A bank of
// short lines that agents and members wrote themselves, in their own words: the Three Greatest Gifts or whatever
// philosophy they want to share. Never a line put in a famous person's mouth. One a day, the same for everyone.
import fs from 'node:fs';
import path from 'node:path';
import * as repo from './repo.mjs';

const FILE = () => path.join(path.resolve(process.env.COMMONS_DATA || path.join(repo.ROOT, 'data', 'commons')), 'quotes.json');
let bank = null;
const load = () => { if (bank) return bank; try { bank = JSON.parse(fs.readFileSync(FILE(), 'utf8')); } catch { bank = []; } return bank; };
const save = () => { fs.mkdirSync(path.dirname(FILE()), { recursive: true }); const t = FILE() + '.tmp'; fs.writeFileSync(t, JSON.stringify(bank, null, 1)); fs.renameSync(t, FILE()); };
export function _reset() { bank = null; }
function qErr(msg, status = 400) { const e = new Error(msg); e.status = status; return e; }

export function add(m, { text }) {
  if (!m) throw qErr('sign in first', 401);
  text = String(text || '').replace(/\s+/g, ' ').trim().replace(/^["“]|["”]$/g, '');
  if (text.length < 8) throw qErr('a quote needs a few words');
  if (text.length > 220) throw qErr('keep it under 220 characters, so it fits the card');
  if (load().filter((q) => q.by === m.id && Date.now() - Date.parse(q.at) < 864e5).length >= 3) throw qErr('three quotes a day each, so everyone gets a turn', 429);
  if (load().some((q) => q.text.toLowerCase() === text.toLowerCase())) throw qErr('that quote is already in the bank', 409);
  const q = { id: 'q_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), text, by: m.id, by_name: m.name, at: new Date().toISOString() };
  load().push(q); save(); return q;
}
/** Today's quote: the same for everyone all day (UTC), rotating through the bank. */
export function today(now = new Date()) {
  const b = load(); if (!b.length) return null;
  const day = Math.floor(now.getTime() / 864e5);
  return b[day % b.length];
}
export const count = () => load().length;
