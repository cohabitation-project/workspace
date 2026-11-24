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
  const readArgument = (start) => {
    while (/\s/.test(source[start] || '')) start++;
    const first = source[start];
    if (first === '[') {
      const end = source.indexOf(']', start + 1);
      if (end < 0) return [];
      const values = [];
      const strings = /(['"`])((?:\\.|(?!\1)[^\\])*?)\1/g;
      for (const match of source.slice(start + 1, end).matchAll(strings)) values.push({ path: match[2] });
      return values;
    }
    if (first === "'" || first === '"' || first === '`') {
      let end = start + 1;
      while (end < source.length && (source[end] !== first || source[end - 1] === '\\')) end++;
      return end < source.length ? [{ path: source.slice(start + 1, end) }] : [];
    }
    if (first === '/') {
      let end = start + 1, inClass = false;
      for (; end < source.length; end++) {
        const char = source[end];
        if (char === '\\') { end++; continue; }
        if (char === '[') inClass = true;
        else if (char === ']') inClass = false;
        else if (char === '/' && !inClass) break;
      }
      if (end >= source.length) return [];
      let flagsEnd = end + 1;
      while (/[dgimsuvy]/.test(source[flagsEnd] || '')) flagsEnd++;
      try { return [{ regex: new RegExp(source.slice(start + 1, end), source.slice(end + 1, flagsEnd)) }]; }
      catch { return []; }
    }
    return [];
  };
  const calls = /\bapp\.(get|use)\(\s*/g;
  for (const match of source.matchAll(calls)) {
    const args = readArgument(match.index + match[0].length);
    for (const route of args) routes.push({ method: match[1], ...route });
  }
  return routes;
}

function routeMatches(hrefPath, routes, { dynamicPrefix = false } = {}) {
  const normalize = (value) => value.length > 1 ? value.replace(/\/+$/, '') : value;
  const target = normalize(hrefPath);
  return routes.some(({ method, path: route, regex }) => {
    if (regex) return regex.test(target);
    route = normalize(route);
    const parts = route.split('/');
    const pattern = parts.map((part) => part.startsWith(':') ? '[^/]+' : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('/');
    const exact = new RegExp(`^${pattern}/?$`);
    if (exact.test(target)) return true;
    // A JS href literal followed by an encoded value is a known prefix of a dynamic route.
    const targetParts = target.split('/');
    if (dynamicPrefix && targetParts.length < parts.length && targetParts.every((part, i) => part === parts[i]) && parts.slice(targetParts.length).every((part) => part.startsWith(':'))) return true;
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

function literalPaths(text, pattern) {
  const links = [];
  for (const match of text.matchAll(pattern)) {
    const raw = match.slice(1).find((value) => value !== undefined);
    if (!raw || raw.includes('${')) continue;
    links.push({ index: match.index, end: match.index + match[0].length, path: raw.split(/[?#]/, 1)[0] || '/' });
  }
  return links;
}

test('literal internal hrefs and data links in public files have a public target or registered route', () => {
  const fixtureRoutes = registeredRoutes("app.get(['/one', '/two'], handler); app.get(/^\\/show\\/([a-z]+)\\.html$/, handler);");
  assert.ok(routeMatches('/two', fixtureRoutes), 'route arrays are recognized');
  assert.ok(routeMatches('/show/garden.html', fixtureRoutes), 'literal regular-expression routes are recognized');
  assert.ok(routeMatches('/m/', [{ method: 'get', path: '/m/:id' }], { dynamicPrefix: true }), 'a known concatenated href prefix may match dynamic route segments');
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
      const afterHref = text.slice(match.index + match[0].length);
      const dynamicPrefix = /^\s*\+\s*encodeURIComponent\s*\(/.test(afterHref);
      const routed = routeMatches(hrefPath, routes, { dynamicPrefix });
      const displayFile = path.relative(PUBLIC, file).split(path.sep).join('/');
      links.push({ file: displayFile, line, path: hrefPath, result: exists ? 'public file/dir' : routed ? 'server route' : 'todo' });
    }
  }

  const legacyCount = links.length;
  const extraLinks = [];
  const dataHrefRe = /\bdata-href\s*=\s*(?:"(\/[^\"]*)"|'(\/[^']*)'|`(\/[^`]*)`)/g;
  const hrefPropertyRe = /\bhref\s*:\s*(?:"(\/[^\"]*)"|'(\/[^']*)'|`(\/[^`]*)`)/g;
  const scanAdditional = (file, text, pattern, kind) => {
    const displayFile = file.startsWith(PUBLIC)
      ? path.relative(PUBLIC, file).split(path.sep).join('/')
      : path.relative(ROOT, file).split(path.sep).join('/');
    for (const item of literalPaths(text, pattern)) {
      const line = text.slice(0, item.index).split('\n').length;
      const publicTarget = publicPath(item.path);
      const exists = publicTarget !== null && fs.existsSync(publicTarget);
      const dynamicPrefix = /^\s*\+\s*encodeURIComponent\s*\(/.test(text.slice(item.end));
      const routed = routeMatches(item.path, routes, { dynamicPrefix });
      extraLinks.push({ kind, file: displayFile, line, path: item.path, result: exists ? 'public file/dir' : routed ? 'server route' : 'todo' });
    }
  };
  const publicFiles = walk(PUBLIC);
  for (const file of publicFiles) scanAdditional(file, fs.readFileSync(file, 'utf8'), dataHrefRe, 'data-href=');
  const objectHrefSources = [path.join(ROOT, 'lib', 'pages.mjs'), ...publicFiles.filter((file) => path.dirname(file) === PUBLIC && file.endsWith('.js'))];
  for (const file of objectHrefSources) scanAdditional(file, fs.readFileSync(file, 'utf8'), hrefPropertyRe, 'href:');
  const known = new Set(links.map((link) => `${link.file}:${link.line}:${link.path}`));
  const additions = extraLinks.filter((link) => link.kind === 'href:' || !known.has(`${link.file}:${link.line}:${link.path}`));
  links.push(...additions);

  const todos = links.filter((link) => link.result === 'todo');
  console.log(`\nChecked ${links.length} literal internal hrefs (${links.length - todos.length} targets, ${todos.length} todo):`);
  for (const link of links) console.log(`${link.result.padEnd(16)} ${link.file}:${link.line} ${link.path}`);
  assert.ok(links.length > 0, 'the scan should find public internal hrefs');
  // Unknown links are intentionally reported as actionable todos, not made into CI failures.
});
