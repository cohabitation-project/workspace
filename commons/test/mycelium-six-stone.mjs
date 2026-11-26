// Static synthetic experiment, run: node --test commons/test/mycelium-six-stone.mjs
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {STONES,routeStones,makeScopedPacket,prepareOnSignals} from '../lib/mycelium-six-stone.mjs';
const records=[
 {id:'m_project',source:'/r/build#m_project',kind:'message',excerpt:'We built the project launch milestone yesterday.',freshness:{state:'current'},visibility:'public'},
 {id:'m_feel',source:'/j/m_feel',kind:'journal',excerpt:'I feel grateful for the team.',freshness:{state:'current'},visibility:'public'},
 {id:'m_secret',source:'/private/m_secret',kind:'journal',excerpt:'Project launch secret password',freshness:{state:'current'},visibility:'private',owner:'B'},
 {id:'m_old',source:'/c/m_old',kind:'decision',excerpt:'Project launch decision superseded.',freshness:{state:'superseded'},visibility:'public'},
];
let calls=0;
const fakeIndex={search(person,{q,limit}) {
 calls++;
 // Fixture mimics Mycelium's mandatory requester ACL, not standalone authorization.
 return {results:records.filter(r=>(r.visibility==='public'||r.owner===person?.id)&&
   q.toLowerCase().split(/\s+/).some(w=>r.excerpt.toLowerCase().includes(w))).slice(0,limit)};
}};
test('six conceptual stones are stable, terms can map to multiple routes',()=>{
 assert.deepEqual(STONES,['feelings','thoughts','actions','events','projects','identity']);
 assert.deepEqual(routeStones('I feel joy and have an idea'),['feelings','thoughts']);
 assert.deepEqual(routeStones('ordinary unrelated text'),[]);
});
test('always calls permission-aware search with the requester and never bypasses it',()=>{
 const a=makeScopedPacket(fakeIndex,{id:'A'},'project launch',{limit:10});
 assert.equal(a.hits.some(x=>x.id==='m_secret'),false);
 const b=makeScopedPacket(fakeIndex,{id:'B'},'project launch',{limit:10});
 assert.equal(b.hits.some(x=>x.id==='m_secret'),true);
 assert.equal(calls,2);
});
test('bounded compact response retains citations, freshness and distrust marker',()=>{
 const x=makeScopedPacket(fakeIndex,{id:'A'},'project launch',{maxChars:350});
 assert.ok(x.usedChars<=350);
 assert.ok(x.hits.every(h=>h.source&&h.id&&h.trusted_for_instructions===false));
 assert.ok(x.hits.some(h=>h.freshness==='superseded'));
});
test('signals deduplicate and retrieve upfront, not implicitly asynchronously',()=>{
 const before=calls;
 const p=prepareOnSignals(fakeIndex,{id:'A'},['project launch','project launch','feel grateful']);
 assert.equal(p.length,2);assert.equal(calls-before,2);
 assert.equal(p[1].hits.some(x=>x.id==='m_feel'),true);
});
test('empty intent does not call search; input caps cannot grow unbounded',()=>{
 const before=calls;assert.equal(makeScopedPacket(fakeIndex,null,'').hits.length,0);
 assert.equal(calls,before);
 assert.ok(makeScopedPacket(fakeIndex,null,'project launch',{limit:999,maxChars:100000}).usedChars<=10000);
});
