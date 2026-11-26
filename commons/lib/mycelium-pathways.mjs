/**
 * Experimental Mycelium "pathway" router. Graph edges are hints, not authority.
 * NO application wiring, agents, side effects, external calls or private index access.
 * A selected edge is returned only if the target is re-resolved via the existing
 * Mycelium requester-scoped search API and exact ID verification.
 * This adapter is NOT yet a tenant-grant or revocation implementation.
 */
const cap=(n,d,max)=>Number.isFinite(n)?Math.max(0,Math.min(max,Math.floor(n))):d;
const text=(x,n)=>String(x??'').slice(0,n);
const idOk=id=>typeof id==='string'&&id.length>0&&id.length<=120&&/^[\p{L}\p{N}_.:-]+$/u.test(id);
const edgeTypes=new Set(['related','corrects','supersedes','depends_on','produced','evidence_for','authored_by','occurred_during']);
export const PATH_TYPES=Object.freeze([...edgeTypes]);

/**
 * An in-memory directed adjacency index over caller-supplied pointers.
 * No traversals are exposed without edge-level authorization AND requester-scoped verification.
 * Does not persist private data. Unknown edge scope is DENIED, not public by default.
 */
export function createPathways(edges=[],{maxEdges=2000}={}) {
 const adjacency=new Map();
 for(const e of (Array.isArray(edges)?edges:[]).slice(0,cap(maxEdges,2000,10000))) {
   if(!e||!idOk(e.from)||!idOk(e.to)||e.from===e.to||!edgeTypes.has(e.type)) continue;
   // An edge is a separate permissioned record. Deny unknown scopes.
   const visibility = e.visibility === 'public' ? 'public' : (e.visibility === 'private' && idOk(e.ownerId) ? 'private' : null);
   if(!visibility) continue;
   if(!adjacency.has(e.from))adjacency.set(e.from,[]);
   if(!adjacency.get(e.from).some(x=>x.to===e.to&&x.type===e.type))
     adjacency.get(e.from).push(Object.freeze({to:e.to,type:e.type,visibility,ownerId:visibility==='private'?e.ownerId:null}));
 }
 /**
  * Search hits = seed; optionally traverse 1-2 hops via graph edges.
  * To follow an edge, exact ID MUST be in index.search(requester,{q:id}).
  * A failed check silently drops the edge, including its existence.
  * Max 2 hops and bounded edge probes. No edge metadata returned beyond type.
  */
 function expand(index,requester,seedIds,{maxHops=1,maxNodes=8,maxProbes=32}={}) {
  if(!index||typeof index.search!=='function')throw new TypeError('Scoped Mycelium search required');
  const hops=cap(maxHops,1,2),nodeLimit=cap(maxNodes,8,30),probeLimit=cap(maxProbes,32,120);
  const found=[],verified=new Set(),queued=[],probes={count:0};
  const verify=id=>{
    if(!idOk(id)||probes.count>=probeLimit)return null;
    probes.count++;
    // Existing Mycelium indexes record ID. Exact-ID equality is mandatory:
    // token overlaps or approximate matches MUST NOT satisfy an edge.
    const resp=index.search(requester,{q:id,limit:100});
    return (resp.results||[]).find(r=>r&&r.id===id&&typeof r.source==='string')||null;
  };
  for(const seed of (Array.isArray(seedIds)?seedIds:[]).slice(0,30)){
    if(found.length>=nodeLimit||probes.count>=probeLimit)break;
    const id=typeof seed==='string'?seed:seed?.id;
    if(!idOk(id)||verified.has(id))continue;
    const hit=verify(id);if(!hit)continue;
    verified.add(id);queued.push({id,depth:0});found.push({id,source:text(hit.source,240),excerpt:text(hit.excerpt||hit.title,300),freshness:text(hit.freshness?.state||'unverified',32),via:null,depth:0,trusted_for_instructions:false});
  }
  for(let head=0;head<queued.length&&found.length<nodeLimit&&probes.count<probeLimit;head++){
    const {id,depth}=queued[head];if(depth>=hops)continue;
    for(const e of adjacency.get(id)||[]){
      if(found.length>=nodeLimit||probes.count>=probeLimit)break;
      // Fail closed at EDGE level as well as endpoint level. Tenant-scoped edges
      // require a future real grant checker; not accepted by this v0 experiment.
      if(e.visibility!=='public' && !(e.visibility==='private' && requester?.id===e.ownerId))continue;
      if(verified.has(e.to))continue;
      const hit=verify(e.to);
      if(!hit)continue;
      verified.add(e.to);
      queued.push({id:e.to,depth:depth+1});
      found.push({id:e.to,source:text(hit.source,240),excerpt:text(hit.excerpt||hit.title,300),freshness:text(hit.freshness?.state||'unverified',32),via:{from:id,type:e.type},depth:depth+1,trusted_for_instructions:false});
    }
  }
  return {nodes:found,probes:probes.count,hops,checked_with_requester:!!requester};
 }
 return Object.freeze({expand,edgeCount:()=>[...adjacency.values()].reduce((sum,a)=>sum+a.length,0)});
}
