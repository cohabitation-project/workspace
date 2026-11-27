// Deleting a video while it converts must not crash the server or leave a ghost record, and a restart
// mid-conversion must not leave a video stuck ready:false forever. Module-level: fake ffmpeg/ffprobe shell
// scripts (the encode step holds its .part open like real ffmpeg does), each case in a child node process
// so a crash shows up as a non-zero exit. No network, no real ffmpeg.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const LIB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../lib/videos.mjs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vid-del-'));
const FF = path.join(tmp, 'ff.sh');
// -version -> ok. *.part target: open it, hold it 1s, write, exit FAKE_EXIT. anything else (poster): wait 1s, make the file.
fs.writeFileSync(FF, '#!/bin/sh\nif [ "$1" = "-version" ]; then exit 0; fi\nfor a; do last="$a"; done\ncase "$last" in *.part) exec 3>"$last"; sleep 1; echo data >&3; exit ${FAKE_EXIT:-0};; *) sleep 1; : > "$last"; exit 0;; esac\n', { mode: 0o755 });

const CHILD = `
import * as v from ${JSON.stringify('file://' + LIB)};
import fs from 'node:fs'; import path from 'node:path';
const [dir, mode] = process.argv.slice(2);
const me = { id: 'm1' };
const jl = () => fs.readFileSync(path.join(dir, 'videos', 'videos.jsonl'), 'utf8').split('\\n').filter(Boolean).map((l) => JSON.parse(l));
if (mode === 'resume') { // a record left unfinished by a "crash": row on disk, original on disk, nothing else
  v.init(dir);
  const r = v.upload(me, Buffer.from('x'.repeat(50)), { type: 'video/mp4' });
  process.stdout.write('ID ' + r.id + '\\n'); process.exit(0);
}
if (mode === 'reinit') {
  v.init(dir);
  setTimeout(() => { const l = v.listMine('m1'); console.log('LIST ' + JSON.stringify(l.map((x) => ({ ready: x.ready, failed: x.failed })))); process.exit(0); }, 3500);
} else {
  v.init(dir);
  const r = v.upload(me, Buffer.from('x'.repeat(50)), { type: 'video/mp4' });
  setTimeout(() => v.remove(me, r.id), mode === 'during-encode' ? 100 : 1500);
  setTimeout(() => {
    const ghost = jl().filter((x) => x.op === 'update' && x.v.id === r.id).length;
    const left = fs.readdirSync(path.join(dir, 'videos')).filter((f) => f.startsWith(r.id));
    console.log('RESULT ' + JSON.stringify({ mine: v.listMine('m1').length, ghostRows: ghost, filesLeft: left }));
    process.exit(0);
  }, 4000);
}
`;
fs.writeFileSync(path.join(tmp, 'child.mjs'), CHILD);
const run = (dir, mode, exit = '0') => spawnSync(process.execPath, [path.join(tmp, 'child.mjs'), dir, mode], { encoding: 'utf8', timeout: 20000, env: { ...process.env, FFMPEG: FF, FFPROBE: FF, FAKE_EXIT: exit } });
const fresh = () => fs.mkdtempSync(path.join(tmp, 'd-'));

for (const [name, mode, exit] of [['deleted while ffmpeg is encoding (exit 0)', 'during-encode', '0'], ['deleted while ffmpeg is encoding (exit 1)', 'during-encode', '1'], ['deleted while the poster is being made', 'during-poster', '0']]) {
  test(`${name}: no crash, no ghost row, no files left`, () => {
    const r = run(fresh(), mode, exit);
    assert.equal(r.status, 0, 'child process must not crash:\n' + r.stderr.slice(0, 600));
    const res = JSON.parse(r.stdout.match(/RESULT (.*)/)[1]);
    assert.equal(res.mine, 0);
    assert.equal(res.ghostRows, 0, 'no update row may follow the delete');
    assert.deepEqual(res.filesLeft, []);
  });
}

test('restart mid-conversion: unfinished record with its original is converted again; a record with no files is failed', () => {
  const dir = fresh();
  const a = run(dir, 'resume', '0'); const id = a.stdout.match(/ID (\S+)/)[1]; // upload starts a conversion; we only keep what is on disk afterwards
  // simulate the crash: stop before conversion finishes by restoring the "unfinished" state on disk
  for (const f of fs.readdirSync(path.join(dir, 'videos'))) if (f.startsWith(id + '.') && !f.includes('.orig.')) fs.rmSync(path.join(dir, 'videos', f), { force: true });
  const jl = path.join(dir, 'videos', 'videos.jsonl');
  fs.writeFileSync(jl, fs.readFileSync(jl, 'utf8').split('\n').filter((l) => l && !l.includes('"update"')).join('\n') + '\n'); // back to: added, not ready
  // second record: row only, no files at all
  fs.appendFileSync(jl, JSON.stringify({ op: 'add', v: { id: 'vid_gone', by: 'm1', ts: new Date().toISOString(), bytes: 1, ext: 'mp4', seconds: null, alt: '', ready: false } }) + '\n');
  const r = run(dir, 'reinit', '0');
  assert.equal(r.status, 0, r.stderr.slice(0, 400));
  const list = JSON.parse(r.stdout.match(/LIST (.*)/)[1]);
  assert.equal(list.length, 2);
  assert.equal(list.filter((x) => x.ready && !x.failed).length, 1, 'the one with its original is converted again and becomes ready');
  assert.equal(list.filter((x) => x.failed && !x.ready).length, 1, 'the one with no files is marked failed, not left waiting');
});
