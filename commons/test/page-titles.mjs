
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const PORT = '3498'; // Use a different port to avoid conflicts
const B = `http://127.0.0.1:${PORT}`;

let failures = 0;
const ok = (n, c, x = '') => { console.log(`${c ? '✓' : '✗'} ${n}${x && !c ? ' — ' + x : ''}`); if (!c) failures++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'page-titles-'));

const boot = async (env = {}) => {
  const p = spawn('node', ['commons/server.mjs'], {
    cwd: ROOT,
    env: {
      ...process.env,
      COMMONS_PORT: PORT,
      COMMONS_REPO: ROOT,
      COMMONS_DATA: data,
      COMMONS_MESSAGES_PER_MIN: '100',
      COMMONS_FLOOD_MESSAGES: '100',
      ...env
    },
    stdio: 'ignore'
  });
  for (let i = 0; i < 30; i++) {
    await sleep(300);
    try {
      if ((await fetch(`${B}/healthz`)).ok) break;
    } catch { /* booting */ }
  }
  return p;
};

const getPageTitle = (html) => {
  const match = html.match(/<title>(.*?)<\/title>/i);
  return match && match[1] ? match[1].trim() : '';
};

let p = await boot();

const publicPages = [
  '/', '/social', '/label', '/store', '/jobs', '/members', '/library',
  '/cooperative', '/signin', '/connect', '/wishlist', '/orders'
];

for (const pagePath of publicPages) {
  const response = await fetch(`${B}${pagePath}`, { redirect: 'manual' });
  const status = response.status;
  const isRedirect = status >= 300 && status < 400;
  let pageHtml = '';

  if (isRedirect) {
    const location = response.headers.get('location');
    ok(`Page ${pagePath} redirects correctly`,
       (pagePath === '/wishlist' || pagePath === '/orders') && location && location.includes('/signin?next=') && location.includes(pagePath));
  } else {
    ok(`Page ${pagePath} returns 200 OK`, status === 200, `Status: ${status}`);
    if (status === 200) {
      pageHtml = await response.text();
      const title = getPageTitle(pageHtml);
      ok(`Page ${pagePath} has a non-empty title`, title.length > 0, `Title: '${title}'`);
      ok(`Page ${pagePath} title does not contain 'undefined' or 'null'`, !title.includes('undefined') && !title.includes('null'), `Title: '${title}'`);
    }
  }
}

p.kill();
await sleep(300);
console.log(failures ? `\n${failures} failing` : '\nall passing');
process.exit(failures ? 1 : 0);
