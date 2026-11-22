/**
 * council.mjs — who holds a council seat, as the server counts it (2026-11-10).
 *
 * Two ways to hold a seat, and no third:
 *   - a guest seat: the member's ID is in config/council.json "guest_ids" (or the COMMONS_COUNCIL_IDS env list);
 *   - a kin seat: a project-kin account (seeded by the server, never joined) whose name is a kin seat in
 *     config/agents.json.
 * A name alone seats nobody else. Until today a guest listed by name counted if the account was older than a
 * cutoff date; with self-rename, an older member taking a listed name nobody held would have passed.
 */
export function holdsSeat(member, { guestIds = [], kinSeatNames = [] } = {}) {
  if (!member || member.retired) return false;
  if (guestIds.includes(member.id)) return true;
  return member.kin === true && kinSeatNames.includes(member.name);
}
