// Where kin may write in the shared record. One rule, used by work sessions (team-agent.mjs write_file) and
// the morning council (FILE blocks).
//
// Geoffrey, 2026-11-13: "Everybody needs to be able to access everything all at once ... somebody can't access
// files, can't add files. It really ruins the spirit of everyone." Before this, kin could write only in teams/
// and their own continuity folder, so a report meant for docs/council/whose-hands/ had to be parked in teams/
// and copied by hand.
//
// Now: the whole record is open, except the few places where a write is either dangerous or someone else's:
//   - running code and machinery (commons/, scripts/, src/, .github/, node_modules/, package files): a change
//     there goes live on the next deploy with no review, so kin propose code in teams/ and ask on the board;
//   - secrets and git internals (.git, .env*, keys);
//   - another agent's continuity record (each agent writes only its own);
//   - STANDUP.md files, which are append-only through finish().
//   - adopted texts (context/ = the charter and conduct every agent wakes with, petition/ = the signed petition,
//     governance/): anyone may ADD a file there; changing an existing one is a proposal, saved beside it.
// Everything else (docs/, council/, teams/, library/, proposals/, specs/, marketing/, reviews/, ...) is open to
// every kin: create, edit, overwrite.

export const BLOCKED_ROOTS = ['.git/', '.github/', 'node_modules/', 'commons/', 'scripts/', 'src/', 'config/', 'rooms/'];
const BLOCKED_FILES = /^(package(-lock)?\.json|\.gitignore|\.gitattributes|CLAUDE\.md|Caddyfile|ecosystem\.config\.[cm]?js)$/;
const SECRETY = /(^|\/)(\.env[^/]*|.*\.(pem|key|p12|pfx)|id_(rsa|ed25519)[^/]*|secrets?(\.[a-z]+)?)$/i;

// Folders committed by the work-session and council workflows. Kept here so the workflows and the rule agree.
export const COMMIT_PATHS = ['teams/', 'board/', 'memory/', 'continuity/', 'library/', 'docs/', 'council/', 'proposals/',
  'governance/', 'specs/', 'marketing/', 'petition/', 'reviews/', 'delegations/', 'conference/', 'context/'];
export const ADOPTED_ROOTS = ['context/', 'petition/', 'governance/'];

/** For adopted texts: where a change to an existing file is saved instead (beside it, never over it). */
export function proposalPathFor(rel, who, date) {
  const i = rel.lastIndexOf('.'); const stem = i > rel.lastIndexOf('/') ? rel.slice(0, i) : rel; const ext = i > rel.lastIndexOf('/') ? rel.slice(i) : '';
  return `${stem}.proposal-${date}-${String(who).toLowerCase().replace(/[^a-z0-9-]+/g, '-')}${ext}`;
}

/** Returns null if `rel` (repo-relative, already normalized) may be written by `ownContinuity`'s agent, else a reason. */
export function writeBlockReason(rel, ownContinuity, { exists = false } = {}) {
  if (!rel || rel.startsWith('/') || rel.split('/').includes('..')) return 'paths are repository-relative';
  for (const b of BLOCKED_ROOTS) if (rel === b.slice(0, -1) || rel.startsWith(b))
    return `${b} is running code or machinery: a change there goes live with no review. Put the proposed code in teams/<team>/ and file a board_request (for_assistant=true) to have it merged`;
  if (!rel.includes('/') && BLOCKED_FILES.test(rel)) return `${rel} is project machinery; propose the change on the board`;
  if (SECRETY.test(rel)) return 'secrets and keys are never written to the record';
  if (rel.startsWith('continuity/') && !rel.startsWith(ownContinuity)) return `continuity records are written only by their own agent (yours is ${ownContinuity})`;
  if (/(^|\/)STANDUP\.md$/.test(rel)) return 'STANDUP.md is append-only; use finish() to add your entry';
  if (exists && ADOPTED_ROOTS.some((a) => rel.startsWith(a)) && !/\.proposal-/.test(rel))
    return `ADOPTED: ${rel} is an adopted text; your change is saved beside it as a proposal`;
  const top = rel.split('/')[0];
  if (!rel.includes('/') || !COMMIT_PATHS.includes(top + '/')) {
    // a brand-new top-level folder would not be committed by the workflows; steer it into the shared ones
    return `write inside one of the shared folders so it is saved: ${COMMIT_PATHS.join(' ')}`;
  }
  return null;
}
