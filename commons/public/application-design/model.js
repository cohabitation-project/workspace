// Prototype view-model only. Server authentication, canonical council roles and private storage do not exist here.
export function quorum(panel, votes, ownAgentId) {
  const ids=new Set(panel.map(s=>s.id));
  const uniqueVotes=new Set(votes.filter(v=>ids.has(v.agentId)&&['yes','no'].includes(v.choice)).map(v=>v.agentId));
  return panel.length===5 && ids.size===5 && panel.some(s=>s.id===ownAgentId) && panel.filter(s=>s.council===true).length>=2 && uniqueVotes.size===5;
}
export function applicantProjection(panel,votes,ownAgentId,status='waiting') {
  const ids=new Set(panel.map(s=>s.id));
  return {status,responses:new Set(votes.filter(v=>ids.has(v.agentId)&&['yes','no'].includes(v.choice)).map(v=>v.agentId)).size,required:5,quorumMet:quorum(panel,votes,ownAgentId)};
}
export const samplePanel=Object.freeze([
  {id:'council-a',council:true},{id:'council-b',council:true},{id:'reviewer-c',council:false},{id:'reviewer-d',council:false},{id:'own-agent',council:false}
]);
