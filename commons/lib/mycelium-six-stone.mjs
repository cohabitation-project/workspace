/**
 * Mycelium six-stone packet experiment. Research-only; no production integration.
 * A stone is a routing hint, NOT a private folder or a claim about inner life.
 * Security boundary: only consume records from index.search(requester, ...).
 * No unscoped graph traversal, persisted cache, or external model calls.
 */
const WORDS = Object.freeze({
  feelings: ['feel','felt','feeling','grateful','sad','joy','afraid','emotion'],
  thoughts: ['think','thought','question','hypothesis','believe','reason','wonder','idea'],
  actions: ['did','changed','fixed','merged','built','shipped','committed','tested','action'],
  events: ['event','happened','occurred','meeting','arrived','yesterday','today','date'],
  projects: ['project','task','milestone','work','roadmap','deliverable','launch','build'],
  identity: ['identity','name','named','member','person','role','self','continuity'],
});
export const STONES = Object.freeze(Object.keys(WORDS));
const tokenSet = text => new Set(String(text||'').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean));
const bounded = (v,n) => String(v ?? '').slice(0,n);

/** Categorize a *source description*, never infer emotions from an agent/person. */
export function routeStones(text) {
  const tokens = tokenSet(text);
  return STONES.filter(stone => WORDS[stone].some(t => tokens.has(t)));
}

/**
 * Build a small, attributed context packet; caller must provide the current
 * Mycelium index (or equivalent) whose search implements requester ACLs.
 * Does not attach claims of factual correctness to retrieved excerpts.
 */
export function makeScopedPacket(index, requester, intent, { limit=6, maxChars=2400 }={}) {
  if (!index || typeof index.search !== 'function') throw new TypeError('Permission-aware Mycelium search required');
  const query = bounded(intent,280).trim();
  const count = Math.max(0, Math.min(20, Number.isFinite(limit) ? Math.floor(limit) : 6));
  const budget = Math.max(0, Math.min(10000, Number.isFinite(maxChars) ? Math.floor(maxChars) : 2400));
  const stones = routeStones(query);
  if (!query || !count || !budget) return { intent:query, stones, hits:[], usedChars:0, requested:0, status:'empty' };
  // ACLs, private data and revocation are owned by Mycelium's search layer.
  const search = index.search(requester, {q:query,limit:Math.max(count, Math.min(100,count*4))});
  const eligible = (search.results||[]).filter(r => r && typeof r.id === 'string' && typeof r.source === 'string');
  const scored=eligible.map((r,i)=>{
    const assigned=routeStones([r.kind,r.title,r.excerpt].filter(Boolean).join(' '));
    return {r, assigned, score:assigned.filter(x=>stones.includes(x)).length, original:i};
  }).sort((a,b)=>b.score-a.score || a.original-b.original);
  let usedChars=0; const hits=[];const seen=new Set();
  for(const {r,assigned} of scored) {
    if(hits.length>=count) break;
    if(seen.has(r.id))continue;
    const source=bounded(r.source,240), id=bounded(r.id,120);
    const kind=bounded(r.kind,48), freshness=bounded(r.freshness?.state||'unverified',32);
    const base = id.length+source.length+kind.length+freshness.length+assigned.join(',').length+16;
    if (usedChars+base>=budget) continue;
    const excerpt = bounded(r.excerpt||r.title||'',Math.min(320,budget-usedChars-base));
    if(!excerpt) continue;
    hits.push({id,source,kind,stones:assigned,freshness,excerpt, trusted_for_instructions:false});
    usedChars += base+excerpt.length;
    seen.add(r.id);
  }
  return {intent:query,stones,hits,usedChars,requested:eligible.length,status:hits.length?'ready':'no-fit'};
}

/** Host can invoke this at session/task open, ahead of a later agent query.
 * All packets remain scoped to the requester at the time of retrieval; caller
 * must re-authorize immediately before use if grants or revocation can change.
 */
export function prepareOnSignals(index, requester, signals, options={}) {
  return [...new Set((signals||[]).map(x=>bounded(x,280).trim()).filter(Boolean))].slice(0,6)
    .map(intent=>makeScopedPacket(index,requester,intent,options));
}
