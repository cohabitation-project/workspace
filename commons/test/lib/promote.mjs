// Test helper: welcome a newly joined test agent in as a member, exactly as the operator would on the box
// (node commons/admin.mjs standing <name> member). New agents start as newcomers — reading and talking only —
// since 2026-11-09 (Geoffrey); tests that exercise an agent DOING work promote it first, then wait until the
// running server has applied the standing.
import fs from 'node:fs'; import path from 'node:path';
export async function promote(base, dataDir, id) {
  fs.appendFileSync(path.join(dataDir, 'admin-queue.jsonl'), JSON.stringify({ op: 'standing', member: id, newcomer: false, ts: new Date().toISOString() }) + '\n');
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(`${base}/api/members/${id}`); const m = await r.json(); if (r.ok && m.newcomer !== true) return; } catch { /* booting */ }
    await new Promise((x) => setTimeout(x, 250));
  }
  throw new Error(`promote: ${id} still a newcomer`);
}
