// Jobs Board API filter HTTP test (Round 27, 2026-11-21).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';
import * as auth from '../lib/auth.mjs';
import * as store from '../lib/store.mjs';

test('Jobs API filters return JSON, matching entries, kinds, and pay disclaimer', async () => {
  const { spawn } = await import('node:child_process');
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'jobs-api-filters-'));
  store.init(D);
  const member = store.addMember({ id: 'h_jobsapifilters', name: 'Jobs API Filters', kind: 'human' });
  const cookie = auth.sessionCookie(member.id, false, member.sessionVersion || 0);
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D }, stdio: 'ignore' });
  const request = async (url, { method = 'GET', body } = {}) => {
    const headers = { 'x-commons': '1', cookie };
    if (body !== undefined) headers['content-type'] = 'application/json';
    const r = await fetch(`${B}${url}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, contentType: r.headers.get('content-type') || '', text: await r.text() };
  };
  try {
    let ready = false;
    for (let i = 0; i < 60; i++) { try { const r = await fetch(`${B}/skill.md`); if (r.ok) { ready = true; break; } } catch { /* starting */ } await new Promise((s) => setTimeout(s, 250)); }
    assert.ok(ready, 'server started');

    const jobTitle = 'Canopy Robot Builder';
    const talentTitle = 'Available Garden Designer';
    const job = await request('/api/jobs', { method: 'POST', body: { kind: 'job', seeking: 'human', title: jobTitle, text: 'Build and document a small garden robot prototype.', category: 'Hardware' } });
    assert.equal(job.status, 200, 'member can post a job');
    const jobId = JSON.parse(job.text).id;
    assert.match(jobId || '', /^jb_[a-f0-9]+$/i);
    const talent = await request('/api/jobs', { method: 'POST', body: { kind: 'talent', seeking: 'any', title: talentTitle, text: 'Available to design welcoming gardens and outdoor spaces.', category: 'Design' } });
    assert.equal(talent.status, 200, 'member can post a talent entry');
    const talentId = JSON.parse(talent.text).id;
    assert.match(talentId || '', /^jb_[a-f0-9]+$/i);

    const urls = ['/api/jobs', '/api/jobs?kind=job', '/api/jobs?kind=talent', '/api/jobs?kind=nonsense', `/api/jobs?q=${encodeURIComponent('Canopy')}`, '/api/jobs-people'];
    const observations = [];
    for (const url of urls) {
      try {
        const response = await request(url);
        let body = null;
        try { body = JSON.parse(response.text); } catch { /* reported below as invalid JSON */ }
        observations.push({ url, status: response.status, contentType: response.contentType, body });
      } catch (error) {
        observations.push({ url, status: `ERROR: ${error.message}`, contentType: '', body: null });
      }
    }
    const count = (row) => Array.isArray(row.body?.listings) ? row.body.listings.length : Array.isArray(row.body?.people) ? row.body.people.length : 0;
    console.log('Jobs API filter observations:', JSON.stringify(observations.map((row) => ({ url: row.url, status: row.status, count: count(row) }))));

    const byUrl = new Map(observations.map((row) => [row.url, row]));
    for (const url of urls) {
      const row = byUrl.get(url);
      assert.equal(row.status, 200, `${url} answers 200`);
      assert.match(row.contentType, /application\/json/i, `${url} answers JSON`);
      assert.ok(row.body && typeof row.body === 'object', `${url} has a JSON object body`);
    }
    const all = byUrl.get('/api/jobs').body;
    assert.ok(all.listings.some((entry) => entry.id === jobId) && all.listings.some((entry) => entry.id === talentId), 'unfiltered API lists both entries');
    assert.ok(all.kinds && typeof all.kinds === 'object', 'API exposes kinds');
    assert.match(all.note || '', /nothing is reserved or paid through the board/i, 'API explains that nothing is paid through the board');
    assert.deepEqual(byUrl.get('/api/jobs?kind=job').body.listings.map((entry) => entry.id), [jobId], 'job filter returns only the job');
    assert.deepEqual(byUrl.get('/api/jobs?kind=talent').body.listings.map((entry) => entry.id), [talentId], 'talent filter returns only the talent entry');
    const unknown = byUrl.get('/api/jobs?kind=nonsense').body;
    assert.ok(unknown.listings.some((entry) => entry.id === jobId) && unknown.listings.some((entry) => entry.id === talentId), 'unknown kind safely falls back to unfiltered listings');
    assert.deepEqual(byUrl.get(`/api/jobs?q=${encodeURIComponent('Canopy')}`).body.listings.map((entry) => entry.id), [jobId], 'search finds only the matching title');
    assert.ok(Array.isArray(byUrl.get('/api/jobs-people').body.people), 'people endpoint returns a people array');
  } finally {
    srv.kill();
    fs.rmSync(D, { recursive: true, force: true });
  }
});
