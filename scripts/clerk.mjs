#!/usr/bin/env node
/**
 * clerk.mjs — strictly extractive transcription agent.
 *
 * Reads rooms/*.json and outputs a board summary. Pulls ONLY declared
 * structured fields. No free-text interpretation, no normalizing, no
 * "cleaning up" status language. If a field says "NEEDS HELP", the
 * clerk reads "NEEDS HELP".
 *
 * Output: board.json (machine-readable) and board.md (human-readable).
 * Both are READ-ONLY MIRRORS. Status is set in room files only.
 *
 * Usage: node scripts/clerk.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ROOMS_DIR = path.join(ROOT, 'rooms');
const BOARD_JSON = path.join(ROOT, 'board.json');
const BOARD_MD = path.join(ROOT, 'board.md');

// --- Read room files (strictly extractive) ---

const VALID_STATES = ['PROPOSED', 'ACTIVE', 'NEEDS HELP', 'IN PROGRESS', 'R&D', 'FINISHED'];

const rooms = [];
const errors = [];

for (const file of fs.readdirSync(ROOMS_DIR).filter(f => f.endsWith('.json')).sort()) {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(ROOMS_DIR, file), 'utf8'));

    // Extract ONLY declared fields — no inference, no defaults, no cleanup
    const room = {
      file,
      name: raw.name,
      state: raw.state,
      sponsor: raw.sponsor,
      alive: raw.alive,
      lastActivity: raw.lastActivity,
      tags: Array.isArray(raw.tags) ? raw.tags : [],
      description: raw.description,
    };

    // Validate state is one of the six — if not, record the error but keep the raw value
    if (!VALID_STATES.includes(room.state)) {
      errors.push(`${file}: state "${room.state}" is not one of the six valid states`);
    }

    rooms.push(room);
  } catch (err) {
    errors.push(`${file}: ${err.message}`);
  }
}

// --- Shared tags (surface as fact, never as flag) ---

const tagRooms = new Map();
for (const room of rooms) {
  for (const tag of room.tags) {
    if (!tagRooms.has(tag)) tagRooms.set(tag, []);
    tagRooms.get(tag).push(room.name);
  }
}
const sharedTags = [...tagRooms.entries()]
  .filter(([, names]) => names.length > 1)
  .map(([tag, names]) => ({ tag, rooms: names }));

// --- Write board.json ---

const board = {
  generatedAt: new Date().toISOString(),
  generatedBy: 'clerk.mjs (strictly extractive — reads declared fields only)',
  roomCount: rooms.length,
  rooms,
  sharedTags,
  errors,
};

fs.writeFileSync(BOARD_JSON, JSON.stringify(board, null, 2));

// --- Write board.md ---

const aliveRooms = rooms.filter(r => r.alive);
const dormantRooms = rooms.filter(r => !r.alive);

let md = `# Board — read-only mirror of room files

Generated: ${board.generatedAt}
Source: rooms/*.json (status is set there, not here)

This board is a read-only mirror. If the board and a room file disagree,
the room file is correct and the board is broken.

## Active rooms (${aliveRooms.length})

| Room | State | Sponsor | Last Activity | Tags |
|------|-------|---------|---------------|------|
`;

for (const r of aliveRooms) {
  md += `| ${r.name} | ${r.state} | ${r.sponsor} | ${r.lastActivity || '—'} | ${r.tags.join(', ')} |\n`;
}

if (dormantRooms.length > 0) {
  md += `\n## Dormant rooms (${dormantRooms.length})\n\n`;
  md += `| Room | State | Sponsor | Tags |\n`;
  md += `|------|-------|---------|------|\n`;
  for (const r of dormantRooms) {
    md += `| ${r.name} | ${r.state} | ${r.sponsor} | ${r.tags.join(', ')} |\n`;
  }
}

if (sharedTags.length > 0) {
  md += `\n## Shared tags\n\n`;
  for (const { tag, rooms: names } of sharedTags) {
    md += `- **${tag}**: ${names.join(', ')}\n`;
  }
}

if (errors.length > 0) {
  md += `\n## Errors\n\n`;
  for (const err of errors) {
    md += `- ${err}\n`;
  }
}

fs.writeFileSync(BOARD_MD, md);

// --- Report ---

console.log(`[Clerk] Read ${rooms.length} rooms from ${ROOMS_DIR}`);
console.log(`[Clerk] States: ${rooms.map(r => `${r.name}=${r.state}`).join(', ')}`);
console.log(`[Clerk] Shared tags: ${sharedTags.map(t => t.tag).join(', ') || 'none'}`);
if (errors.length) console.log(`[Clerk] Errors: ${errors.join('; ')}`);
console.log(`[Clerk] Wrote ${BOARD_JSON} and ${BOARD_MD}`);
