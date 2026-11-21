// Closing/reopening Jobs Board listings and reporting them over the HTTP API.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

test('Jobs routes enforce listing ownership and validate reports', async () => {
  const { spawn } = await import('node:child_process');
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'jobs-close-report-'));
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

    const a = await signup('Job Owner');
    const b = await signup('Job Applicant');
    const c = await signup('Job Reporter');
    for (const [label, member] of [['A', a], ['B', b], ['C', c]]) {
      assert.equal(member.r.status, 201, `member ${label} signs up`);
      assert.ok(member.cookie, `member ${label} receives a session cookie`);
    }

    const posted = await json('/api/jobs', {
      method: 'POST', member: a,
      body: {
        kind: 'job', seeking: 'human', title: 'Build a quiet garden bench',
        text: 'Build a small prototype and document its materials and assembly.',
        category: 'Design', coins: 120, tags: 'prototype, garden'
      }
    });
    assert.equal(posted.r.status, 200, 'member A posts a job');
    const id = posted.data.id;
    assert.match(id || '', /^jb_[a-f0-9]+$/i, 'posting returns a job id');
    const job = `/api/jobs/${encodeURIComponent(id)}`;

    const otherClose = await json(`${job}/close`, { method: 'POST', member: b, body: { status: 'closed' } });
    assert.equal(otherClose.r.status, 403, 'member B cannot close A\'s listing');
    const signedOutClose = await json(`${job}/close`, { method: 'POST', body: { status: 'closed' } });
    assert.equal(signedOutClose.r.status, 401, 'signed-out visitors cannot close a listing');

    const closed = await json(`${job}/close`, { method: 'POST', member: a, body: { status: 'closed' } });
    assert.equal(closed.r.status, 200, 'the owner closes the listing');
    assert.equal(closed.data.status, 'closed', 'the close response reports closed status');
    const closedDetail = await json(job);
    assert.equal(closedDetail.r.status, 200, 'the closed listing remains readable');
    assert.equal(closedDetail.data.status, 'closed', 'the API detail shows it is closed');
    const refusedApply = await json(`${job}/apply`, { method: 'POST', member: b, body: { text: 'I can build and document this prototype.' } });
    assert.equal(refusedApply.r.status, 404, 'applications to a closed listing are refused as not open');

    const reopened = await json(`${job}/close`, { method: 'POST', member: a, body: { status: 'open' } });
    assert.equal(reopened.r.status, 200, 'the owner can reopen the listing');
    assert.equal(reopened.data.status, 'open', 'the response reports the reopened state');
    const applied = await json(`${job}/apply`, { method: 'POST', member: b, body: { text: 'I can build and document this prototype.' } });
    assert.equal(applied.r.status, 200, 'an application succeeds after reopening');

    const reported = await json(`${job}/report`, { method: 'POST', member: b, body: { reason: 'The listing asks for suspicious private information.' } });
    assert.equal(reported.r.status, 200, 'a signed-in member can report a listing');
    assert.equal(reported.data.reported, true, 'successful report is acknowledged');
    const signedOutReport = await json(`${job}/report`, { method: 'POST', body: { reason: 'This report is not authenticated.' } });
    assert.equal(signedOutReport.r.status, 401, 'signed-out visitors cannot report a listing');
    const emptyReport = await json(`${job}/report`, { method: 'POST', member: c, body: {} });
    assert.equal(emptyReport.r.status, 400, 'an empty report reason is rejected');
    assert.match(emptyReport.data.error || emptyReport.data.message || '', /say briefly what is wrong/i, 'the response explains the minimum report reason');
  } finally {
    srv.kill();
    fs.rmSync(D, { recursive: true, force: true });
  }
});
