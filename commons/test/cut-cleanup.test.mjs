import test from 'node:test';
import assert from 'node:assert/strict';
import { lstat, mkdtemp, mkdir, readFile, rm, stat, symlink, utimes, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { sweepRenders } from '../lib/cut/cleanup.mjs';


test('sweepRenders treats a not-yet-created render directory as empty', async (t) => inTemp(t, async (dir) => {
  const missing = path.join(dir, 'not-created-yet');
  assert.deepEqual(
    await sweepRenders(missing, { maxAgeMs: 60_000, maxBytes: 100, now: NOW }),
    { deleted: 0, keptBytes: 0 },
  );
}));

const NOW = 1_800_000_000_000;
const render = (n) => `cut_${String(n).padStart(16, '0')}.mp4`;

async function inTemp(t, fn) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'cut-cleanup-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return fn(dir);
}

async function put(dir, name, bytes, mtimeMs) {
  const file = path.join(dir, name);
  await writeFile(file, Buffer.alloc(bytes, 0x5a));
  await utimes(file, mtimeMs / 1000, mtimeMs / 1000);
  return file;
}

test('sweepRenders removes expired eligible files and preserves recent and unrelated entries', async (t) => inTemp(t, async (dir) => {
  const old = await put(dir, render(1), 3, NOW - 60_001);
  const fresh = await put(dir, render(2), 5, NOW - 1_000);
  const otherName = await put(dir, 'movie.mp4', 7, NOW - 90_000);
  const similarName = await put(dir, 'cut_ABCDEF0123456789.mp4', 11, NOW - 90_000);

  const result = await sweepRenders(dir, { maxAgeMs: 60_000, maxBytes: 100, now: NOW });
  assert.deepEqual(result, { deleted: 1, keptBytes: 5 });
  await assert.rejects(stat(old), { code: 'ENOENT' });
  assert.equal((await stat(fresh)).size, 5);
  assert.equal((await stat(otherName)).size, 7);
  assert.equal((await stat(similarName)).size, 11);
}));

test('sweepRenders does not follow or remove symlinks', async (t) => inTemp(t, async (dir) => {
  const targetDir = path.join(dir, 'target');
  await mkdir(targetDir);
  const target = await put(targetDir, 'keep.mp4', 9, NOW - 100_000);
  const link = path.join(dir, render(3));
  await symlink(target, link);
  const result = await sweepRenders(dir, { maxAgeMs: 0, maxBytes: 0, now: NOW });
  assert.deepEqual(result, { deleted: 0, keptBytes: 0 });
  assert.equal((await readFile(target)).length, 9);
  assert.equal((await lstat(link)).isSymbolicLink(), true);
}));

test('size cap removes the oldest eligible files first', async (t) => inTemp(t, async (dir) => {
  const oldest = await put(dir, render(4), 4, NOW - 4_000);
  const middle = await put(dir, render(5), 5, NOW - 3_000);
  const newest = await put(dir, render(6), 6, NOW - 2_000);
  const result = await sweepRenders(dir, { maxAgeMs: 10_000, maxBytes: 11, now: NOW });
  assert.deepEqual(result, { deleted: 1, keptBytes: 11 });
  await assert.rejects(stat(oldest), { code: 'ENOENT' });
  assert.equal((await stat(middle)).size, 5);
  assert.equal((await stat(newest)).size, 6);
}));

test('size cap keeps deleting oldest files until eligible bytes fit', async (t) => inTemp(t, async (dir) => {
  await put(dir, render(7), 4, NOW - 4_000);
  await put(dir, render(8), 5, NOW - 3_000);
  await put(dir, render(9), 6, NOW - 2_000);
  const result = await sweepRenders(dir, { maxAgeMs: 10_000, maxBytes: 6, now: NOW });
  assert.deepEqual(result, { deleted: 2, keptBytes: 6 });
  assert.equal((await stat(path.join(dir, render(9)))).size, 6);
}));

test('sweepRenders refuses invalid path and limits', async (t) => inTemp(t, async (dir) => {
  await assert.rejects(sweepRenders('relative', {}), /absolute directory/);
  await assert.rejects(sweepRenders(dir, { maxAgeMs: -1 }), /maxAgeMs/);
  await assert.rejects(sweepRenders(dir, { maxBytes: Infinity }), /maxBytes/);
}));
