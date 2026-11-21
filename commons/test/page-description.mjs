import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const PORT = String(4100 + (process.pid % 1000));
const B = `http://127.0.0.1:${PORT}`;

let failures = 0;
const ok = (name, condition, detail = '') => {
  console.log(`${condition ? '✓' : '✗'} ${name}${detail && !condition ? ' — ' + detail : ''}`);
  if (!condition) failures++;
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'page-description-'));

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
  for (let i = 0; i < 30; i++) {
    await sleep(300);
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
    const metaTags = html.match(/<meta\b[^>]*>/gi) || [];
    const descriptionTag = metaTags.find((tag) => attr(tag, 'name')?.trim().toLowerCase() === 'description');
    const description = descriptionTag ? (attr(descriptionTag, 'content') || '').trim() : '';
    ok(
      `Page ${pagePath} has a 30–300 character meta description`,
      description.length >= 30 && description.length <= 300,
      `Description (${description.length} characters): '${description}'`
    );
    ok(
      `Page ${pagePath} meta description has no undefined/null placeholder`,
      !/(?:undefined|null)/i.test(description),
      `Description: '${description}'`
    );
  }
} finally {
  child.kill();
  await sleep(300);
}

console.log(failures ? `\n${failures} failing` : '\nall passing');
process.exit(failures ? 1 : 0);
