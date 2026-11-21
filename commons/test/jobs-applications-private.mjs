// Private applications: the listing owner sees all responses; each applicant sees only their own.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

test('a job owner and each applicant see only the applications they are allowed to read', async () => {
  const { spawn } = await import('node:child_process');
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'jobs-applications-private-'));
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

    const owner = await signup('Application Owner');
    const applicant = await signup('Private Applicant');
    const stranger = await signup('Unrelated Member');
    for (const [label, member] of [['owner', owner], ['applicant', applicant], ['stranger', stranger]]) {
      assert.equal(member.r.status, 201, `${label} signs up`);
      assert.ok(member.cookie, `${label} receives a session cookie`);
    }

    const posted = await json('/api/jobs', {
      method: 'POST', member: owner,
      body: {
        kind: 'job', seeking: 'human', title: 'Build a tiny garden bench',
        text: 'Make a small bench prototype and document its materials and assembly.',
        category: 'Design', tags: 'prototype, garden'
      }
    });
    assert.equal(posted.r.status, 200, 'the owner posts a job');
    const id = posted.data.id;
    assert.match(id || '', /^jb_[a-f0-9]+$/i, 'posting returns a job id');
    const job = `/api/jobs/${encodeURIComponent(id)}`;

    const privateMessage = 'I can build this bench and will document the cedar joinery process.';
    const applied = await json(`${job}/apply`, { method: 'POST', member: applicant, body: { text: privateMessage } });
    assert.equal(applied.r.status, 200, 'the applicant submits a response');

    // The poster is entitled to the response and its contents.
    const ownerApps = await json(`${job}/applications`, { member: owner });
    assert.equal(ownerApps.r.status, 200, 'the listing owner can read applications');
    assert.equal(ownerApps.data.applications?.length, 1, 'the owner sees the submitted application');
    assert.equal(ownerApps.data.applications[0].by.id, applicant.j.member.id, 'the owner can identify the applicant');
    assert.equal(ownerApps.data.applications[0].text, privateMessage, 'the owner sees the applicant message');

    // Applicants may read only their own response; an unrelated member receives no application data.
    const applicantApps = await json(`${job}/applications`, { member: applicant });
    assert.equal(applicantApps.r.status, 200, 'an applicant may read their own application');
    assert.equal(applicantApps.data.applications?.length, 1, 'the applicant sees their own one response');
    assert.equal(applicantApps.data.applications[0].text, privateMessage, 'the applicant sees their own message');

    const strangerApps = await json(`${job}/applications`, { member: stranger });
    assert.equal(strangerApps.r.status, 200, 'the unrelated member receives an empty own-applications view');
    assert.deepEqual(strangerApps.data.applications, [], 'the unrelated member sees no applications');
    assert.ok(!strangerApps.text.includes(privateMessage), 'the unrelated member never receives the private message text');
    assert.ok(!strangerApps.text.includes(applicant.j.member.id), 'the unrelated member never receives the applicant identity');

    const signedOutApps = await json(`${job}/applications`);
    assert.equal(signedOutApps.r.status, 401, 'signed-out visitors cannot read applications');
    assert.ok(!signedOutApps.text.includes(privateMessage), 'signed-out response does not expose the application text');
  } finally {
    srv.kill();
    fs.rmSync(D, { recursive: true, force: true });
  }
});
