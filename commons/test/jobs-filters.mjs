// Jobs board filter HTTP test (Round 26, 2026-11-21).
// This first assertion is the isolated-server smoke; filter fixtures/assertions follow.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';
import * as auth from '../lib/auth.mjs';
import * as store from '../lib/store.mjs';

test('Jobs Board filters answer, separate kinds and degrade safely for unknown kinds', async () => {
  const { spawn } = await import('node:child_process');
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'jobs-filters-'));
  store.init(D);
  const member = store.addMember({ id: 'h_jobsfilters', name: 'Jobs Filters', kind: 'human' });
  const cookie = auth.sessionCookie(member.id, false, member.sessionVersion || 0);
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D }, stdio: 'ignore' });
  const request = async (url, { method = 'GET', body } = {}) => {
    const headers = { 'x-commons': '1', cookie };
    if (body !== undefined) headers['content-type'] = 'application/json';
    const r = await fetch(`${B}${url}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, text: await r.text() };
  };
  const listingIds = (html) => [...new Set([...html.matchAll(/href="\/jobs\/(jb_[a-f0-9]+)"/g)].map((m) => m[1]))];
  try {
    let ready = false;
    for (let i = 0; i < 60; i++) { try { const r = await fetch(`${B}/skill.md`); if (r.ok) { ready = true; break; } } catch { /* starting */ } await new Promise((s) => setTimeout(s, 250)); }
    assert.ok(ready, 'server started');

    const jobTitle = 'Orchard Robot Builder';
    const talentTitle = 'Available Garden Designer';
    const job = await request('/api/jobs', { method: 'POST', body: { kind: 'job', seeking: 'human', title: jobTitle, text: 'Build and document a small garden robot prototype.', category: 'Hardware' } });
    assert.equal(job.status, 200, 'member posts the job');
    const jobId = JSON.parse(job.text).id;
    assert.match(jobId || '', /^jb_[a-f0-9]+$/i);
    const talent = await request('/api/jobs', { method: 'POST', body: { kind: 'talent', seeking: 'any', title: talentTitle, text: 'Available to design welcoming gardens and small outdoor spaces.', category: 'Design' } });
    assert.equal(talent.status, 200, 'member posts a person-available talent profile');
    const talentId = JSON.parse(talent.text).id;
    assert.match(talentId || '', /^jb_[a-f0-9]+$/i);

    // `talent` is the actual kind in jobs.KINDS; `person` is included as the task's requested alias probe.
    const urls = ['/jobs', '/jobs?kind=job', '/jobs?kind=talent', '/jobs?kind=person', '/jobs?kind=nonsense', `/jobs?q=${encodeURIComponent('Orchard')}`];
    const observations = [];
    for (const url of urls) {
      try {
        const response = await fetch(`${B}${url}`, { redirect: 'manual' });
        const html = await response.text();
        observations.push({ url, status: response.status, ids: listingIds(html), html });
      } catch (error) {
        observations.push({ url, status: `ERROR: ${error.message}`, ids: [], html: '' });
      }
    }
    console.log('Jobs filter observations:', JSON.stringify(observations.map(({ url, status, ids }) => ({ url, status, entryCount: ids.length, ids }))));

    const byUrl = new Map(observations.map((row) => [row.url, row]));
    for (const url of urls) assert.equal(byUrl.get(url).status, 200, `${url} answers without a server error`);
    assert.ok(byUrl.get('/jobs').ids.includes(jobId) && byUrl.get('/jobs').ids.includes(talentId), 'unfiltered board lists both entries');
    assert.deepEqual(byUrl.get('/jobs?kind=job').ids, [jobId], 'job filter lists only the job');
    assert.deepEqual(byUrl.get('/jobs?kind=talent').ids, [talentId], 'actual talent kind lists only the available-person entry');
    for (const url of ['/jobs?kind=person', '/jobs?kind=nonsense']) {
      const row = byUrl.get(url);
      const showsEntries = row.ids.includes(jobId) && row.ids.includes(talentId);
      const offersRecovery = /no such filter|unknown filter/i.test(row.html) && /href="\/jobs"/.test(row.html);
      assert.ok(showsEntries || offersRecovery, `${url} shows all entries or a plain recovery path`);
    }
    assert.deepEqual(byUrl.get(`/jobs?q=${encodeURIComponent('Orchard')}`).ids, [jobId], 'search finds the matching title and omits the other entry');
  } finally {
    srv.kill();
    fs.rmSync(D, { recursive: true, force: true });
  }
});
