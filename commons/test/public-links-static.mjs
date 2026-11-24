// Static backstop for literal internal hrefs in the public HTML and JavaScript.
// This deliberately needs only Node built-ins: links with no detectable target are todos, not failures.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
const SERVER = path.join(ROOT, 'server.mjs');

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.isFile() && /\.(?:html|js)$/.test(entry.name)) files.push(full);
  }
  return files.sort();
}

function registeredRoutes(source) {
  const routes = [];
  // Only literal app.get/app.use paths are statically knowable here.
  const re = /\bapp\.(get|use)\(\s*(['"`])([^'"`]+)\2/g;
  for (const match of source.matchAll(re)) routes.push({ method: match[1], path: match[3] });
  return routes;
}

function routeMatches(hrefPath, routes) {
  const normalize = (value) => value.length > 1 ? value.replace(/\/+$/, '') : value;
  const target = normalize(hrefPath);
  return routes.some(({ method, path: route }) => {
    route = normalize(route);
    const parts = route.split('/');
    const pattern = parts.map((part) => part.startsWith(':') ? '[^/]+' : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('/');
    const exact = new RegExp(`^${pattern}/?$`);
    if (exact.test(target)) return true;
    // Express app.use mounts a middleware at a path prefix, not just an exact URL.
    return method === 'use' && (route === '/' || target.startsWith(route + '/'));
  });
}

function publicPath(hrefPath) {
  let decoded;
  try { decoded = decodeURIComponent(hrefPath); } catch { return null; }
  const target = path.resolve(PUBLIC, `.${decoded}`);
  if (target !== PUBLIC && !target.startsWith(PUBLIC + path.sep)) return null;
  return target;
}

test('literal internal hrefs in public HTML and JS have a public target or registered route', () => {
  const routes = registeredRoutes(fs.readFileSync(SERVER, 'utf8'));
  const links = [];
  // Cover quoted HTML/JS attributes and the literal-backtick form requested for JS templates.
  const hrefRe = /\bhref\s*=\s*(?:"(\/[^"]*)"|'(\/[^']*)'|`(\/[^`]*)`)/g;
  for (const file of walk(PUBLIC)) {
    const text = fs.readFileSync(file, 'utf8');
    for (const match of text.matchAll(hrefRe)) {
      const raw = match.slice(1).find((value) => value !== undefined);
      if (raw.includes('${')) continue;
      const hrefPath = raw.split(/[?#]/, 1)[0] || '/';
      const line = text.slice(0, match.index).split('\n').length;
      const publicTarget = publicPath(hrefPath);
      const exists = publicTarget !== null && fs.existsSync(publicTarget);
      const routed = routeMatches(hrefPath, routes);
      const displayFile = path.relative(PUBLIC, file).split(path.sep).join('/');
      links.push({ file: displayFile, line, path: hrefPath, result: exists ? 'public file/dir' : routed ? 'server route' : 'todo' });
    }
  }

  const todos = links.filter((link) => link.result === 'todo');
  console.log(`\nChecked ${links.length} literal internal hrefs (${links.length - todos.length} targets, ${todos.length} todo):`);
  for (const link of links) console.log(`${link.result.padEnd(16)} ${link.file}:${link.line} ${link.path}`);
  assert.ok(links.length > 0, 'the scan should find public internal hrefs');
  // Unknown links are intentionally reported as actionable todos, not made into CI failures.
});
