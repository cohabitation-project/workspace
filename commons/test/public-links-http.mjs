// HTTP follow-up to public-links-static.mjs: check the same literal signed-out paths against a booted local server.
// This is intentionally standalone and not in CI until the boot/environment is reliable there.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { freePort } from './lib/port.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PUBLIC = path.join(ROOT, 'commons', 'public');
const SERVER = path.join(ROOT, 'commons', 'server.mjs');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.isFile() && /\.(?:html|js)$/.test(entry.name)) files.push(full);
  }
  return files.sort();
}

// Keep route recognition aligned with public-links-static.mjs so encoded concatenated
// href prefixes for parameterized routes are counted as skips rather than false 404s.
function registeredRoutes(source) {
  const routes = [];
  const readArgument = (start) => {
    while (/\s/.test(source[start] || '')) start++;
    const first = source[start];
    if (first === '[') {
      const end = source.indexOf(']', start + 1);
      if (end < 0) return [];
      const values = [];
      const strings = /(['"`])((?:\\.|(?!\1)[^\\])*?)\1/g;
      for (const match of source.slice(start + 1, end).matchAll(strings)) values.push(match[2]);
      return values;
    }
    if (first === "'" || first === '"' || first === '`') {
      let end = start + 1;
      while (end < source.length && (source[end] !== first || source[end - 1] === '\\')) end++;
      return end < source.length ? [source.slice(start + 1, end)] : [];
    }
    return [];
  };
  for (const match of source.matchAll(/\bapp\.(?:get|use)\(\s*/g)) {
    for (const route of readArgument(match.index + match[0].length)) routes.push(route);
  }
  return routes;
}

function literalPaths(text, pattern) {
  const links = [];
  for (const match of text.matchAll(pattern)) {
    const raw = match.slice(1).find((value) => value !== undefined);
    if (!raw || raw.includes('${')) continue;
    links.push({ index: match.index, end: match.index + match[0].length, path: raw.split(/[?#]/, 1)[0] || '/' });
  }
  return links;
}

function collectLinks() {
  const links = [];
  const hrefRe = /\bhref\s*=\s*(?:"(\/[^\"]*)"|'(\/[^']*)'|`(\/[^`]*)`)/g;
  const dataHrefRe = /\bdata-href\s*=\s*(?:"(\/[^"]*)"|'(\/[^']*)'|`(\/[^`]*)`)/g;
  const hrefPropertyRe = /\bhref\s*:\s*(?:"(\/[^"]*)"|'(\/[^']*)'|`(\/[^`]*)`)/g;
  const add = (file, text, pattern, kind) => {
    for (const item of literalPaths(text, pattern)) {
      const displayFile = file.startsWith(PUBLIC)
        ? path.relative(PUBLIC, file).split(path.sep).join('/')
        : path.relative(path.join(ROOT, 'commons'), file).split(path.sep).join('/');
      const line = text.slice(0, item.index).split('\n').length;
      links.push({ file: displayFile, line, path: item.path, kind, end: item.end, text });
    }
  };
  const publicFiles = walk(PUBLIC);
  for (const file of publicFiles) {
    const text = fs.readFileSync(file, 'utf8');
    add(file, text, hrefRe, 'href=');
    add(file, text, dataHrefRe, 'data-href=');
  }
  for (const file of [path.join(ROOT, 'commons', 'lib', 'pages.mjs'), ...publicFiles.filter((f) => path.dirname(f) === PUBLIC)]) {
    if (file.endsWith('.js') || file.endsWith('.mjs')) add(file, fs.readFileSync(file, 'utf8'), hrefPropertyRe, 'href:');
  }
  const known = new Set(links.filter((x) => x.kind === 'href=').map((x) => `${x.file}:${x.line}:${x.path}`));
  const unique = links.filter((x) => x.kind === 'href=' || x.kind === 'href:' || !known.has(`${x.file}:${x.line}:${x.path}`));
  const seen = new Set();
  return unique.filter((link) => {
    const key = `${link.file}:${link.line}:${link.path}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).map(({ file, line, path: hrefPath }) => ({ file, line, path: hrefPath }));
}

function isParameterizedPrefix(hrefPath, routes) {
  if (hrefPath.split('/').some((part) => part.startsWith(':'))) return true;
  const target = hrefPath.length > 1 ? hrefPath.replace(/\/+$/, '') : hrefPath;
  const targetParts = target.split('/');
  return routes.some((route) => {
    if (!route.includes('/:')) return false;
    const parts = route.split('/');
    return targetParts.length < parts.length && targetParts.every((part, i) => part === parts[i])
      && parts.slice(targetParts.length).every((part) => part.startsWith(':'));
  });
}

test('literal internal links answer from a booted Commons server while signed out', async () => {
  const paths = collectLinks();
  const routes = registeredRoutes(fs.readFileSync(SERVER, 'utf8'));
  const skipped = paths.filter((link) => isParameterizedPrefix(link.path, routes));
  const targets = paths.filter((link) => !isParameterizedPrefix(link.path, routes));
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'public-links-http-'));
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ['commons/server.mjs'], {
    cwd: ROOT,
    env: { ...process.env, ASHRAM_PORT: String(port), COMMONS_DATA: dataDir, COMMONS_FAKE_LLM: '1', COMMONS_NO_SPEND_POLL: '1' },
    stdio: 'ignore'
  });
  const bad = [];
  const unexpected = [];
  let booted = false;
  try {
    for (let i = 0; i < 80 && !booted; i++) {
      try { booted = (await fetch(`${base}/api/presence`)).ok; } catch { /* server is still starting */ }
      if (!booted) await sleep(250);
    }
    assert.ok(booted, 'Commons server booted on a temporary data directory');
    for (const link of targets) {
      let status;
      try {
        const response = await fetch(new URL(link.path, base), { redirect: 'manual' });
        status = response.status;
        await response.body?.cancel();
      } catch (error) {
        bad.push({ ...link, status: `FETCH_ERROR ${error.message}` });
        continue;
      }
      if (status === 404 || status >= 500) bad.push({ ...link, status });
      else if (!(status === 200 || (status >= 300 && status < 400) || status === 401)) unexpected.push({ ...link, status });
    }
    console.log(`HTTP link check counts: literal=${paths.length}; parameterized-prefix-skipped=${skipped.length}; requested=${targets.length}; 404/5xx-or-fetch-error=${bad.length}; other-status=${unexpected.length}`);
    for (const link of bad) console.log(`FAIL ${link.status} ${link.file}:${link.line} ${link.path}`);
    for (const link of unexpected) console.log(`OTHER ${link.status} ${link.file}:${link.line} ${link.path}`);
    assert.equal(bad.length, 0, `${bad.length} internal target(s) returned 404/5xx or could not be fetched; see source file:line above`);
    assert.equal(unexpected.length, 0, `${unexpected.length} target(s) did not return 200, 3xx, or 401`);
  } finally {
    server.kill();
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});
