import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
// A free port, not one derived from the pid: CI failed once with "did not become ready" (2026-11-23, d61759c9).
const PORT = String(await freePort());
const B = `http://127.0.0.1:${PORT}`;

let failures = 0;
const ok = (name, condition, detail = '') => {
  console.log(`${condition ? '✓' : '✗'} ${name}${detail && !condition ? ' — ' + detail : ''}`);
  if (!condition) failures++;
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'page-meta-'));

const boot = async () => {
  const child = spawn('node', ['commons/server.mjs'], {
    cwd: ROOT,
    env: {
      ...process.env,
      COMMONS_PORT: PORT,
      COMMONS_REPO: ROOT,
      COMMONS_DATA: data,
      COMMONS_MESSAGES_PER_MIN: '100',
      COMMONS_FLOOD_MESSAGES: '100'
    },
    stdio: 'ignore'
  });
  for (let i = 0; i < 80; i++) {
    await sleep(250);
    try {
      if ((await fetch(`${B}/healthz`)).ok) return child;
    } catch { /* booting */ }
  }
  child.kill();
  throw new Error('isolated Commons server did not become ready');
};

const attr = (tag, name) => {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return match ? (match[1] ?? match[2] ?? match[3] ?? '') : null;
};

const child = await boot();
try {
  const publicPages = [
    '/', '/social', '/label', '/store', '/jobs', '/members', '/library',
    '/cooperative', '/signin', '/connect'
  ];

  for (const pagePath of publicPages) {
    const response = await fetch(`${B}${pagePath}`, { redirect: 'manual' });
    ok(`Page ${pagePath} returns 200 OK`, response.status === 200, `Status: ${response.status}`);
    if (response.status !== 200) continue;

    const html = await response.text();
    const htmlTag = html.match(/<html\b[^>]*>/i)?.[0] || '';
    const lang = attr(htmlTag, 'lang')?.trim() || '';
    ok(`Page ${pagePath} declares a non-empty html lang`, lang.length > 0, `html tag: '${htmlTag}'`);

    const metaTags = html.match(/<meta\b[^>]*>/gi) || [];
    const hasCharset = metaTags.some((tag) => attr(tag, 'charset') !== null);
    ok(`Page ${pagePath} declares a meta charset`, hasCharset);

    const viewport = metaTags.find((tag) => attr(tag, 'name')?.trim().toLowerCase() === 'viewport');
    const viewportContent = viewport ? attr(viewport, 'content') || '' : '';
    ok(
      `Page ${pagePath} has a device-width viewport`,
      /(?:^|[,;\s])width\s*=\s*device-width(?:$|[,;\s])/i.test(viewportContent),
      `viewport content: '${viewportContent}'`
    );
  }
} finally {
  child.kill();
  await sleep(300);
}

console.log(failures ? `\n${failures} failing` : '\nall passing');
process.exit(failures ? 1 : 0);
