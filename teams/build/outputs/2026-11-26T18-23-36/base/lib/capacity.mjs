/**
 * capacity.mjs — tripwires so growth tells us when to spend (Geoffrey, 2026-11-14: "I'd put the warning at 50% in case
 * we do go viral... if our marketing and our strategies right, we may get hit quick").
 *
 * Measured on this server on 2026-11-14: 2 CPUs, 3.7 GB memory (2.3 GB free), 38 GB disk (29% used), Commons data
 * 130 MB. Walls: disk (email + music), memory, and the storage design (whole-file JSON) around ~5,000 members.
 * Each check warns once a day in the General Hall and pings the stewards' phones, early enough to act before a wall.
 */
import fs from 'node:fs';
import os from 'node:os';
import * as store from './store.mjs';
import * as push from './push.mjs';
import { systemNote, isSteward } from './core.mjs';

export const LIMITS = {
  diskPct: Number(process.env.CAP_DISK_PCT || 50),           // warn at half full: room to add a disk before a rush
  memFreeMB: Number(process.env.CAP_MEM_FREE_MB || 1000),    // warn under 1 GB available: time for a bigger server
  members: Number(process.env.CAP_MEMBERS || 1000),          // start the database switch long before ~5,000
};

function memAvailableMB() {
  try { const m = fs.readFileSync('/proc/meminfo', 'utf8').match(/MemAvailable:\s+(\d+)/); if (m) return Math.round(Number(m[1]) / 1024); } catch { /* not linux */ }
  return Math.round(os.freemem() / 1048576);
}
function diskPct(dir) { try { const s = fs.statfsSync(dir); return Math.round(100 * (1 - s.bavail / s.blocks)); } catch { return null; } }

export function measure() {
  const members = store.allMembers().filter((m) => !m.retired).length;
  return { disk_pct: diskPct(store.dataDir()), mem_free_mb: memAvailableMB(), members, limits: LIMITS };
}

const last = new Map(); // which warning went out when (once a day each)
// Memory dips for a minute or two whenever a deploy restarts the sites and installs packages (2026-11-16: one dip to
// 719 MB posted an alarm while the server sat at 2.7 GB available minutes later). So memory is sampled every five
// minutes and only warns when it has stayed low for the whole window, and never in the first ten minutes after a start.
export const MEM_WINDOW = 3; // consecutive low samples (15 minutes) before a memory warning
const memSamples = [];
let bootAt = Date.now();
export function sampleMemory(mb = memAvailableMB()) { memSamples.push(mb); while (memSamples.length > MEM_WINDOW) memSamples.shift(); return memSamples.slice(); }
export const memoryLowSustained = (now = Date.now()) => now - bootAt >= 10 * 60_000 && memSamples.length >= MEM_WINDOW && memSamples.every((x) => x < LIMITS.memFreeMB);
export function _reset({ boot = Date.now() } = {}) { memSamples.length = 0; last.clear(); bootAt = boot; } // tests

export function check(now = Date.now()) {
  const m = measure(); const warn = [];
  if (m.disk_pct != null && m.disk_pct >= LIMITS.diskPct) warn.push(['disk', `Disk is ${m.disk_pct}% full (warning at ${LIMITS.diskPct}%). Time to add a Hetzner volume before email and music fill it.`]);
  if (memoryLowSustained(now)) warn.push(['mem', `Memory has stayed under ${LIMITS.memFreeMB} MB free for ${MEM_WINDOW * 5} minutes (now ${m.mem_free_mb} MB). Time to move to a bigger server size.`]);
  if (m.members >= LIMITS.members) warn.push(['members', `${m.members} members (warning at ${LIMITS.members}). Start moving the Commons onto a real database now; whole-file storage strains around 5,000.`]);
  const sent = [];
  for (const [k, text] of warn) {
    if (last.has(k) && now - last.get(k) < 24 * 3600_000) continue;
    last.set(k, now); sent.push(k);
    try { systemNote('general', `⚠️ Capacity: ${text}`); } catch { /* best effort */ }
    for (const s of store.allMembers().filter(isSteward)) push.notify(s.id, { title: 'Cohabi capacity warning', body: text, url: '/r/general', kind: 'steward' }).catch(() => {});
  }
  return { ...m, warned: sent };
}

let timer = null;
let memTimer = null;
export function start() {
  if (timer) return; bootAt = Date.now();
  memTimer = setInterval(() => { sampleMemory(); if (memoryLowSustained()) check(); }, 5 * 60_000); memTimer.unref?.();
  setTimeout(() => check(), 60_000).unref?.(); timer = setInterval(() => check(), 3600_000); timer.unref?.();
}
