/**
 * mydata.mjs: "Download your data" and "Delete your account" (Geoffrey, 2026-11-14: "privacy settings, download your
 * data, delete your account... do the research and build"). Research: docs/research/account-settings-2026-11-14.md.
 *
 * Download: one JSON file of what Cohabi holds about you, in a format other software can read (GDPR Art. 20 asks for
 * "structured, commonly used, machine-readable"). Secrets are never included: no sign-in hashes, no device push keys.
 *
 * Delete: done at once, not "requested". Your profile becomes a bare "Deleted member" tombstone, every device is signed
 * out, and your posts, comments, reactions, friendships, the words of messages you sent, your journals, your pictures
 * and your notification devices are erased from the files themselves. What stays, and why, is said on the page:
 * coin entries (the cooperative's books, now pointing at "Deleted member") and the other person's own words in your
 * conversations. The twice-daily backups roll over in 7 days, so the copies there are gone within a week.
 * Anything this code doesn't reach yet goes in a deletion record for a steward to finish within 30 days.
 */
import fs from 'node:fs';
import path from 'node:path';
import * as store from './store.mjs';
import * as posts from './posts.mjs';
import * as postmarks from './postmarks.mjs';
import * as jobs from './jobs.mjs';
import * as videos from './videos.mjs';
import * as inbox from './inbox.mjs';
import * as friends from './friends.mjs';
import * as push from './push.mjs';
import * as images from './images.mjs';
import * as house from './house.mjs';
import * as ledger from './ledger.mjs';
import * as repo from './repo.mjs';

const SECRET = /hash|secret|token|password|passhash|key|cookie|recovery|ext$|^ext|ip$/i;
const safeProfile = (m) => Object.fromEntries(Object.entries(m).filter(([k]) => !SECRET.test(k)));
const tryOr = (f, d) => { try { return f(); } catch { return d; } };

export function exportFor(member) {
  const m = store.getMember(member.id) || member;
  return {
    about: 'Everything Cohabi (cohabi.org) holds about you, as of the time below. Sign-in secrets are left out on purpose.',
    exported_at: new Date().toISOString(),
    account: safeProfile(m),
    linked_sign_ins: Object.keys(m.ext || {}),
    feed: tryOr(() => posts.exportFor(m.id), null),
    saved_and_reported: tryOr(() => postmarks.exportFor(m.id), null),
    jobs_board: tryOr(() => jobs.exportFor(m.id), null),
    messages: tryOr(() => inbox.exportFor(m.id), 'Private messages are closed for repair right now; try again later.'),
    friends: tryOr(() => friends.exportFor(m.id), null),
    journals: tryOr(() => house.myJournals(m), []),
    pictures: tryOr(() => images.byMember(m.id), []),
    notifications: tryOr(() => ({ choices: push.prefsOf(m.id), devices_turned_on: push.devices(m.id) }), null),
    wallet: tryOr(() => ({ balance: ledger.balance(ledger.wallet(m.id)), entries: ledger.entriesFor(ledger.wallet(m.id)) }), null),
    room_messages: tryOr(() => store.messagesBy(m.id, repo.rooms(), 10000), []),
  };
}

/** What a deletion couldn't reach by itself, for a steward to finish (GDPR: within one month). */
function leftover(m) {
  const left = [];
  const hosted = store.allMembers().filter((a) => a.hosted?.by === m.id && !a.retired);
  if (hosted.length) left.push(`${hosted.length} hosted agent(s): ${hosted.map((a) => a.id).join(', ')}`);
  const roomMsgs = tryOr(() => store.messagesBy(m.id, repo.rooms(), 10000).length, 0);
  if (roomMsgs) left.push(`${roomMsgs} message(s) in Commons rooms`);
  if (!m.social_only) left.push('Commons membership records (desk, library, wishes, mail mailbox if any)');
  return left;
}

export function deleteAccount(member, { confirm } = {}) {
  const m = store.getMember(member.id);
  if (!m || m.retired || m.kind !== 'human') { const e = new Error('This account is already closed.'); e.status = 410; throw e; }
  if (String(confirm || '').trim().toLocaleLowerCase() !== String(m.name).trim().toLocaleLowerCase()) { const e = new Error(`To delete, type your name exactly as it shows: ${m.name}`); e.status = 400; throw e; }
  const left = leftover(m);
  const done = {};
  done.feed = tryOr(() => posts.forgetMember(m.id), 'failed');
  done.saves = tryOr(() => postmarks.forgetMember(m.id), 'failed');
  done.jobs = tryOr(() => jobs.forgetMember(m.id), 'failed');
  done.videos = tryOr(() => videos.forgetMember(m.id), 'failed');
  done.messages = tryOr(() => inbox.forgetMember(m.id), 'failed');
  done.friends = tryOr(() => friends.forgetMember(m.id), 'failed');
  done.notifications = tryOr(() => push.forgetMember(m.id), 'failed');
  done.journals = tryOr(() => house.myJournals(m).map((j) => house.deleteJournal(m, j.id)).length, 'failed');
  done.pictures = tryOr(() => images.byMember(m.id).map((it) => images.remove(m, it.id)).length, 'failed');
  for (const [k, v] of Object.entries(done)) if (v === 'failed') left.push(`${k}: automatic erase failed`);
  done.public_notices = tryOr(() => store.scrubName(m.id, m.name), 'failed');
  store.eraseMember(m.id);
  // The record keeps no personal content: an id, a time, counts, and what is left for a steward.
  const dir = path.join(store.dataDir(), 'privacy'); fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  fs.appendFileSync(path.join(dir, 'deletions.jsonl'), JSON.stringify({ id: m.id, ts: new Date().toISOString(), done, left }) + '\n', { mode: 0o600 });
  return { deleted: true, left };
}

/** For stewards: deletions with something left to finish. */
export function openDeletions() {
  const f = path.join(store.dataDir(), 'privacy', 'deletions.jsonl'); if (!fs.existsSync(f)) return [];
  return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => tryOr(() => JSON.parse(l), null)).filter((d) => d && d.left?.length);
}
