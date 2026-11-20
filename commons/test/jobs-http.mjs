// The Jobs Board's HTTP routes: public detail, signed-in posting/applying, and private applications.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

test('Jobs routes publish listings and keep applications private over HTTP', async () => {
  const { spawn } = await import('node:child_process');
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'jobs-http-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, ['commons/server.mjs'], {
    env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D }, stdio: 'ignore'
  });
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const signup = async (name) => {
    const r = await fetch(`${B}/api/humans`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-commons': '1' },
      body: JSON.stringify({ name })
    });
    return { r, j: await r.json().catch(() => ({})), cookie: (r.headers.get('set-cookie') || '').split(';')[0] };
  };
  const request = async (url, { method = 'GET', member, body } = {}) => {
    const headers = { 'x-commons': '1' };
    if (member?.cookie) headers.cookie = member.cookie;
    if (body !== undefined) headers['content-type'] = 'application/json';
    const r = await fetch(`${B}${url}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual' });
    return { r, text: await r.text() };
  };
  const json = async (url, options) => {
    const result = await request(url, options);
    return { ...result, data: JSON.parse(result.text || '{}') };
  };

  try {
    let ready = false;
    for (let i = 0; i < 60; i++) {
      try { if ((await fetch(`${B}/skill.md`)).ok) { ready = true; break; } } catch { /* starting */ }
      await sleep(250);
    }
    assert.ok(ready, 'isolated Commons server started');

    const a = await signup('Jobs Poster');
    const b = await signup('Jobs Applicant');
    const c = await signup('Other Jobs Applicant');
    for (const [label, member] of [['A', a], ['B', b], ['C', c]]) {
      assert.equal(member.r.status, 201, `member ${label} signs up`);
      assert.ok(member.cookie, `member ${label} receives a session cookie`);
    }

    const title = 'Prototype a quiet garden bench';
    const posted = await json('/api/jobs', {
      method: 'POST', member: a,
      body: {
        kind: 'job', seeking: 'human', title,
        text: 'Build a small prototype and document its materials and assembly.',
        category: 'Design', coins: 120, tags: 'prototype, garden'
      }
    });
    assert.equal(posted.r.status, 200, 'member A posts a job');
    const id = posted.data.id;
    assert.match(id || '', /^jb_[a-f0-9]+$/i, 'posting returns a job id');

    const detail = await request(`/jobs/${encodeURIComponent(id)}`);
    assert.equal(detail.r.status, 200, 'job detail page is public');
    assert.ok(detail.text.includes(title), 'job detail page shows the title');

    const signedOutApply = await json(`/api/jobs/${encodeURIComponent(id)}/apply`, {
      method: 'POST', body: { text: 'I can build and document this prototype.' }
    });
    assert.equal(signedOutApply.r.status, 401, 'signed-out applications are refused');

    const application = { text: 'I can build and document this prototype.' };
    const applied = await json(`/api/jobs/${encodeURIComponent(id)}/apply`, { method: 'POST', member: b, body: application });
    assert.equal(applied.r.status, 200, 'member B applies');
    const duplicate = await json(`/api/jobs/${encodeURIComponent(id)}/apply`, { method: 'POST', member: b, body: application });
    assert.ok(duplicate.r.status >= 400 && duplicate.r.status < 500, 'a duplicate application is refused');

    const ownerApplications = await json(`/api/jobs/${encodeURIComponent(id)}/applications`, { member: a });
    assert.equal(ownerApplications.r.status, 200, 'the poster can read applications');
    assert.equal(ownerApplications.data.applications?.length, 1, 'the poster sees B\'s one application');

    const otherApplication = await json(`/api/jobs/${encodeURIComponent(id)}/apply`, {
      method: 'POST', member: c, body: { text: 'I can also prototype the bench and report back.' }
    });
    assert.equal(otherApplication.r.status, 200, 'a second member can apply');
    const applicantApplications = await json(`/api/jobs/${encodeURIComponent(id)}/applications`, { member: b });
    assert.equal(applicantApplications.r.status, 200, 'an applicant can read their own response');
    assert.equal(applicantApplications.data.applications?.length, 1, 'B sees only B\'s own application');
    assert.ok(JSON.stringify(applicantApplications.data.applications).includes(b.j.member.id), 'B\'s response is attributed to B');
    assert.ok(!JSON.stringify(applicantApplications.data.applications).includes(c.j.member.id), 'C\'s private response is not exposed to B');

    const signedOutApplications = await json(`/api/jobs/${encodeURIComponent(id)}/applications`);
    assert.equal(signedOutApplications.r.status, 401, 'signed-out visitors cannot read applications');

    const newPage = await request('/jobs/new');
    assert.equal(newPage.r.status, 303, 'signed-out visitors are redirected from the new-job page');
    assert.equal(newPage.r.headers.get('location'), '/signin?next=/jobs/new');
  } finally {
    srv.kill();
    fs.rmSync(D, { recursive: true, force: true });
  }
});
