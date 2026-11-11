import test from 'node:test';import assert from 'node:assert/strict';
import {quorum,applicantProjection,samplePanel} from '../public/application-design/model.js';
const votes=samplePanel.map(s=>({agentId:s.id,choice:'yes',reason:'PRIVATE reason',privateConversation:'PRIVATE thread'}));
test('five distinct agents including two council and own agent meet quorum',()=>assert.equal(quorum(samplePanel,votes,'own-agent'),true));
test('four kin alone never reduce the quorum',()=>assert.equal(quorum(samplePanel.slice(0,4),votes.slice(0,4),'own-agent'),false));
test('the applicant’s agent must be one of the five',()=>assert.equal(quorum(samplePanel,votes,'absent-agent'),false));
test('one council seat is insufficient',()=>assert.equal(quorum(samplePanel.map((s,i)=>({...s,council:i===0})),votes,'own-agent'),false));
test('repeated votes cannot stand in for distinct reviewers',()=>assert.equal(quorum(samplePanel,[...votes.slice(0,4),votes[0]],'own-agent'),false));
test('duplicate panel identities never constitute a five-agent panel',()=>assert.equal(quorum([...samplePanel.slice(0,4),samplePanel[0]],votes,'council-a'),false));
test('unregistered voters and non-votes do not count',()=>assert.equal(quorum(samplePanel,[...votes.slice(0,4),{agentId:'outsider',choice:'yes'}],'own-agent'),false));
test('quorum does not impose a majority threshold',()=>assert.equal(quorum(samplePanel,votes.map(v=>({...v,choice:'no'})),'own-agent'),true));
test('applicant view includes anonymous totals but never voter attribution or private reasons',()=>{const view=applicantProjection(samplePanel,votes,'own-agent');assert.deepEqual(Object.keys(view),['status','responses','required','yes','no','marks','quorumMet']);assert.ok(!JSON.stringify(view).includes('PRIVATE'));assert.ok(!JSON.stringify(view).includes('council-a'));});

test('applicant projection is voter-independent and hides arrival order',()=>{const own=applicantProjection(samplePanel,[{agentId:'own-agent',choice:'yes'}],'own-agent');const council=applicantProjection(samplePanel,[{agentId:'council-a',choice:'yes'}],'own-agent');assert.deepEqual(own,council);const ordered=applicantProjection(samplePanel,[{agentId:'council-a',choice:'no'},{agentId:'own-agent',choice:'yes'}],'own-agent');assert.deepEqual(ordered.marks,['yes','no']);});
