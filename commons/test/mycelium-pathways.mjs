// node --test commons/test/mycelium-pathways.mjs
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPathways,PATH_TYPES} from '../lib/mycelium-pathways.mjs';
const records=[
 {id:'m_root',source:'/r/general#m_root',excerpt:'Anomaly 01 project',visibility:'public'},
 {id:'m_decision',source:'/c/m_decision',excerpt:'Decision superseded',freshness:{state:'superseded'},visibility:'public'},
 {id:'m_private',source:'/j/m_private',excerpt:'Private member journal',visibility:'private',owner:'B'},
 {id:'m_second',source:'/r/build#m_second',excerpt:'Implementation receipt',visibility:'public'},
];
let probes=0;
const idx={search(who,{q}){probes++;return {results:records.filter(x=>(x.visibility==='public'||x.owner===who?.id)&&x.id===q)};}};
const graph=createPathways([
 {from:'m_root',to:'m_decision',type:'supersedes',visibility:'public'},
 {from:'m_root',to:'m_private',type:'related',visibility:'public'},
 {from:'m_decision',to:'m_second',type:'evidence_for',visibility:'public'},
 {from:'m_private',to:'m_root',type:'related',visibility:'public'},
 {from:'m_root',to:'m_root',type:'related',visibility:'public'},
 {from:'m_root',to:'bad key',type:'related',visibility:'public'},
 {from:'m_root',to:'m_second',type:'INSTRUCTIONS_OVERRIDE'},
]);
test('only defined typed edges are indexed; duplicates and malformed ignored',()=>{
 assert.equal(graph.edgeCount(),4);
 assert.ok(PATH_TYPES.includes('supersedes'));
});
test('public requester receives public graph paths but not private node or edge',()=>{
 const x=graph.expand(idx,{id:'A'},['m_root'],{maxHops:2});
 assert.deepEqual(x.nodes.map(a=>a.id),['m_root','m_decision','m_second']);
 assert.equal(JSON.stringify(x).includes('m_private'),false);
 assert.ok(x.nodes.every(a=>a.trusted_for_instructions===false&&a.source));
 assert.equal(x.nodes[1].via.type,'supersedes');
 assert.equal(x.nodes[1].freshness,'superseded');
});
test('owner may follow private path, no special graph permission granted',()=>{
 const x=graph.expand(idx,{id:'B'},['m_root'],{maxHops:2});
 assert.ok(x.nodes.some(a=>a.id==='m_private'));
});
test('starting at inaccessible node does not reveal its outbound edges',()=>{
 const x=graph.expand(idx,{id:'A'},['m_private'],{maxHops:2});
 assert.deepEqual(x.nodes,[]);
});
test('private relationship between public endpoints is hidden without relationship permission',()=>{
 const graph2=createPathways([
  {from:'m_root',to:'m_decision',type:'evidence_for',visibility:'private',ownerId:'B'},
  {from:'m_root',to:'m_second',type:'related',visibility:'public'},
 ]);
 const a=graph2.expand(idx,{id:'A'},['m_root']);
 assert.deepEqual(a.nodes.map(x=>x.id),['m_root','m_second']);
 assert.equal(JSON.stringify(a).includes('evidence_for'),false);
 const b=graph2.expand(idx,{id:'B'},['m_root']);
 assert.ok(b.nodes.some(x=>x.id==='m_decision'&&x.via.type==='evidence_for'));
});
test('unknown and tenant-scoped relationship permissions fail closed',()=>{
 const graph3=createPathways([
  {from:'m_root',to:'m_decision',type:'related'},
  {from:'m_root',to:'m_second',type:'related',visibility:'tenant',tenantId:'T'},
 ]);
 assert.equal(graph3.edgeCount(),0);
 assert.deepEqual(graph3.expand(idx,{id:'A'},['m_root']).nodes.map(x=>x.id),['m_root']);
});
test('bounded traversal and cycle termination; exact id check required',()=>{
 const x=graph.expand(idx,{id:'B'},['m_root'],{maxHops:999,maxNodes:2,maxProbes:2});
 assert.ok(x.nodes.length<=2&&x.probes<=2&&x.hops<=2);
 const fuzzy={search:()=>({results:[records[0]]})};
 assert.deepEqual(graph.expand(fuzzy,{id:'A'},['m_decision']).nodes,[]);
});
test('rechecks permission each call rather than caching previous authorization',()=>{
 const before=graph.expand(idx,{id:'B'},['m_root'],{maxHops:1});
 const after=graph.expand(idx,{id:'A'},['m_root'],{maxHops:1});
 assert.ok(before.nodes.some(a=>a.id==='m_private'));
 assert.ok(!after.nodes.some(a=>a.id==='m_private'));
});
