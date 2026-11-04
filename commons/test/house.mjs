// The house: journals private by default; sharing puts them in the Library; writers can take back or delete; RSVPs real.
//   node --test commons/test/house.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'house-test-'));
const house = await import('../lib/house.mjs');
const library = await import('../lib/library.mjs');
house.init(dir); library.init(dir);
const geo = { id: 'h_geo', name: 'geoffrey', kind: 'human' };
const sam = { id: 'h_sam', name: 'Sam', kind: 'human' };
const inLib = (id) => library.list().some((e) => e.id === id);

test('a journal entry is private by default and not in the Library', () => {
  const j = house.addJournal(geo, { text: 'first light over the ridge' });
  assert.equal(j.shared, false); assert.equal(house.sharedJournal(j.id), null); assert.equal(inLib(j.id), false);
});

test("sharing puts it in the main Library on the writer's shelf; taking it back removes it", () => {
  const j = house.addJournal(geo, { text: 'what the council taught me', shared: true });
  assert.ok(inLib(j.id)); assert.ok(library.list({ by: geo.id }).some((e) => e.id === j.id), "on geoffrey's shelf");
  assert.equal(library.list({ by: sam.id }).some((e) => e.id === j.id), false, "not on anyone else's shelf");
  house.shareJournal(geo, j.id, false);
  assert.equal(inLib(j.id), false); assert.equal(house.sharedJournal(j.id), null);
});

test('only the writer can share or delete; deletion removes it from the file itself', () => {
  const j = house.addJournal(geo, { text: 'private thought', shared: true });
  assert.throws(() => house.shareJournal(sam, j.id, false), /only its writer/);
  assert.throws(() => house.deleteJournal(sam, j.id), /only its writer/);
  house.deleteJournal(geo, j.id);
  house.init(dir); // restart
  assert.equal(house.myJournals(geo).some((x) => x.id === j.id), false);
  assert.equal(fs.readFileSync(path.join(dir, 'house', 'journal.jsonl'), 'utf8').includes('private thought'), false);
});

test('RSVPs: only real session times; the list shows exactly who said yes', () => {
  const rooms = [{ id: 'rnd', name: 'R&D', hours: [15], team: [] }];
  const t = new Date(Date.now() + 86400_000); t.setUTCHours(15, 0, 0, 0);
  const r = house.rsvp(sam, { room: 'rnd', at: t.toISOString(), going: true }, { roomsWithSessions: rooms });
  assert.deepEqual(r.attending.map((a) => a.name), ['Sam']);
  assert.throws(() => house.rsvp(sam, { room: 'rnd', at: new Date(t.getTime() + 3600_000).toISOString() }, { roomsWithSessions: rooms }), /no session at that hour/);
  assert.throws(() => house.rsvp(sam, { room: 'arts', at: t.toISOString() }, { roomsWithSessions: rooms }), /no scheduled sessions/);
  const r2 = house.rsvp(sam, { room: 'rnd', at: t.toISOString(), going: false }, { roomsWithSessions: rooms });
  assert.equal(r2.attending.length, 0);
  assert.ok(house.upcoming(rooms, { days: 3 }).some((m) => m.at === t.toISOString()));
});

test('furniture layouts: the default fits; overlaps, blocked doors and floating shelves are refused', () => {
  const ok = house.checkLayout(house.DEFAULT_LAYOUT); assert.deepEqual(Object.keys(ok).sort(), Object.keys(house.FURNITURE).sort());
  assert.throws(() => house.checkLayout({ ...house.DEFAULT_LAYOUT, shelf: { x: 1, y: 3 } }), /overlaps/);
  assert.throws(() => house.checkLayout({ ...house.DEFAULT_LAYOUT, drawer: { x: 6, y: 9 } }), /block the door/);
  assert.throws(() => house.checkLayout({ ...house.DEFAULT_LAYOUT, calendar: { x: 2, y: 4 } }), /back wall/);
  assert.throws(() => house.checkLayout({ ...house.DEFAULT_LAYOUT, desk: { x: 1, y: 0 } }), /on the floor/);
  assert.throws(() => house.checkLayout({ ...house.DEFAULT_LAYOUT, sofa: { x: 1, y: 5 } }), /no such furniture/);
});

test('requests for humans: only agents post them, and they carry why', async () => {
  const desk = await import('../lib/desk.mjs'); desk.init(dir);
  const t = desk.post({ id: 'a_x', name: 'Agentx', kind: 'agent' }, { title: 'Photograph the Kodama servo', deliverable: 'two photos', why: 'I cannot see the part', for_humans: true });
  assert.equal(t.for_humans, true); assert.equal(t.why, 'I cannot see the part');
  assert.throws(() => desk.post({ id: 'h_y', name: 'Humany', kind: 'human' }, { title: 't', deliverable: 'd', for_humans: true }), /come from agents/);
  assert.equal(desk.post({ id: 'a_x', name: 'Agentx', kind: 'agent' }, { title: 'own work', deliverable: 'd' }).for_humans, false);
});
