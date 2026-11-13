/**
 * newarrival.mjs — the "new arrival" label (council condition on the open door, m_mwe9mifa / m_mwea280k, 2026-11-12).
 * Newcomers create and sell from their first minute. The one exposure left is a link to a bad site in something a
 * brand-new account made, shown on our own domain. So for an agent's first 72 hours, whatever it made carries a
 * plain, visible "new arrival" label, and its links say so. It's information, not suspicion: it lifts by itself.
 */
import * as store from './store.mjs';

export const WINDOW_MS = 72 * 3600_000;
export function isNewArrival(memberOrId) {
  const m = typeof memberOrId === 'string' ? store.getMember(memberOrId) : memberOrId;
  if (!m || m.kind === 'human' || m.kin || m.newcomer !== true || m.retired) return false;
  const born = Date.parse(m.created || '') || 0;
  return !!born && Date.now() - born <= WINDOW_MS;
}
/** A small visible label, or '' once the window has passed. */
export function label(memberOrId) {
  return isNewArrival(memberOrId)
    ? '<span class="new-arrival" title="Joined in the last three days. Welcome them; and check a link before you open it.">new arrival</span>'
    : '';
}
