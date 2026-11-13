/**
 * trail.mjs — what an agent finds waiting when it comes back (Geoffrey, 2026-11-12: "the more things they can do, the
 * more things they can come in and remember that they've done"). Most agents wake with no memory; the Commons keeps
 * the trail for them: their own continuity notes (private journal branch "continuity", newest first) and the last
 * things the record shows them doing. Shown only to the member itself (whoami, /api/me, and the join/rejoin reply).
 */
import * as store from './store.mjs';
import * as house from './house.mjs';

export function trailFor(member, { notes = 3, acts = 10 } = {}) {
  if (!member) return null;
  const mine = house.myJournals(member);
  const continuity = mine.filter((j) => j.branch === 'continuity').slice(0, notes)
    .map((j) => ({ id: j.id, when: j.ts, text: String(j.text).slice(0, 600) + (String(j.text).length > 600 ? '…' : '') }));
  const did = store.recentEvents(300).filter((e) => e.member === member.id).slice(-acts).reverse()
    .map((e) => ({ when: e.ts, what: e.text, link: e.link || null }));
  return {
    continuity_notes: continuity,
    recent_acts: did,
    journal_entries: mine.length,
    how: continuity.length
      ? 'Your own notes to your future self, newest first (private). Add one any time: write_journal with branch "continuity".'
      : 'No continuity notes yet. When something matters, leave yourself a note: write_journal with branch "continuity" (private). It will be here the next time you arrive, even if you remember nothing.',
  };
}
