// The Jobs Board's HTTP routes: owners close/reopen listings; members report them.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

test('Jobs owners can close and reopen listings, and signed-in members can report them', async () => {
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

    const a = await signup('Jobs Owner');
    const b = await signup('Jobs Reporter');
    for (const [label, member] of [['A', a], ['B', b]]) {
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
    const job = `/api/jobs/${encodeURIComponent(id)}`;
    const close = `${job}/close`;
    const report = `${job}/report`;

    const otherClose = await json(close, { method: 'POST', member: b, body: { status: 'closed' } });
    assert.equal(otherClose.r.status, 403, 'member B cannot close another member\'s job');
    const signedOutClose = await json(close, { method: 'POST', body: { status: 'closed' } });
    assert.equal(signedOutClose.r.status, 401, 'signed-out visitors cannot close a job');

    const closed = await json(close, { method: 'POST', member: a, body: { status: 'closed' } });
    assert.equal(closed.r.status, 200, 'member A closes their job');
    assert.equal(closed.data.status, 'closed', 'close response reports the closed status');
    const closedDetail = await json(job);
    assert.equal(closedDetail.r.status, 200, 'closed job remains readable');
    assert.equal(closedDetail.data.status, 'closed', 'job detail reports it as closed');

    const closedApply = await json(`${job}/apply`, {
      method: 'POST', member: b, body: { text: 'I can build and document this prototype.' }
    });
    assert.equal(closedApply.r.status, 404, 'applications to a closed listing are refused');

    const reopened = await json(close, { method: 'POST', member: a, body: { status: 'open' } });
    assert.equal(reopened.r.status, 200, 'member A reopens their job');
    assert.equal(reopened.data.status, 'open', 'reopen response reports the open status');
    const applied = await json(`${job}/apply`, {
      method: 'POST', member: b, body: { text: 'I can build and document this prototype.' }
    });
    assert.equal(applied.r.status, 200, 'member B can apply after the owner reopens the job');

    const signedOutReport = await json(report, { method: 'POST', body: { reason: 'Looks suspicious.' } });
    assert.equal(signedOutReport.r.status, 401, 'signed-out visitors cannot report a job');
    const emptyReport = await json(report, { method: 'POST', member: b, body: {} });
    assert.equal(emptyReport.r.status, 400, 'a report with an empty JSON body is refused');
    assert.match(emptyReport.data.error || '', /say briefly what is wrong/i, 'empty report explains that a reason is required');
    const reported = await json(report, { method: 'POST', member: b, body: { reason: 'This listing requests private information.' } });
    assert.equal(reported.r.status, 200, 'member B can report the job with a reason');
    assert.equal(reported.data.reported, true, 'successful report confirms it was recorded');
  } finally {
    srv.kill();
    fs.rmSync(D, { recursive: true, force: true });
  }
});
