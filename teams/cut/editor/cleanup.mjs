import { lstat, readdir, unlink } from 'node:fs/promises';
import path from 'node:path';

const RENDER_NAME = /^cut_[0-9a-f]{16}\.mp4$/;

/**
 * Remove only Cut render outputs from outDir. Symlinks and all other names are
 * deliberately left alone. Expired renders go first; if the remaining eligible
 * files exceed maxBytes, the oldest are removed until the cap is met.
 */
export async function sweepRenders(outDir, {
  maxAgeMs = 6 * 60 * 60 * 1000,
  maxBytes = 2_000_000_000,
  now = Date.now(),
} = {}) {
  if (typeof outDir !== 'string' || !outDir || !path.isAbsolute(outDir)) {
    throw new TypeError('outDir must be an absolute directory path');
  }
  if (!Number.isFinite(maxAgeMs) || maxAgeMs < 0) {
    throw new RangeError('maxAgeMs must be a finite non-negative number');
  }
  if (!Number.isFinite(maxBytes) || maxBytes < 0) {
    throw new RangeError('maxBytes must be a finite non-negative number');
  }
  if (!Number.isFinite(now)) throw new RangeError('now must be a finite number');

  let names;
  try {
    names = await readdir(outDir);
  } catch (error) {
    if (error?.code === 'ENOENT') return { deleted: 0, keptBytes: 0 };
    throw error;
  }
  const candidates = [];
  for (const name of names) {
    if (!RENDER_NAME.test(name)) continue;
    const filePath = path.join(outDir, name);
    let stat;
    try {
      stat = await lstat(filePath);
    } catch (error) {
      if (error?.code === 'ENOENT') continue; // concurrently removed
      throw error;
    }
    if (!stat.isFile()) continue; // in particular, never follow or remove symlinks
    candidates.push({ name, filePath, mtimeMs: stat.mtimeMs, size: stat.size });
  }

  let deleted = 0;
  const remove = async (entry) => {
    try {
      await unlink(entry.filePath); // unlink removes an entry, never follows a symlink
      deleted++;
      return true;
    } catch (error) {
      if (error?.code === 'ENOENT') return false;
      throw error;
    }
  };

  const cutoff = now - maxAgeMs;
  for (const entry of candidates) {
    if (entry.mtimeMs < cutoff) await remove(entry);
  }

  const survivors = [];
  for (const entry of candidates) {
    if (entry.mtimeMs < cutoff) continue;
    try {
      const stat = await lstat(entry.filePath);
      if (stat.isFile()) survivors.push({ ...entry, size: stat.size, mtimeMs: stat.mtimeMs });
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
  let keptBytes = survivors.reduce((total, entry) => total + entry.size, 0);
  survivors.sort((a, b) => a.mtimeMs - b.mtimeMs || a.name.localeCompare(b.name));
  for (const entry of survivors) {
    if (keptBytes <= maxBytes) break;
    if (await remove(entry)) keptBytes -= entry.size;
  }
  return { deleted, keptBytes };
}
